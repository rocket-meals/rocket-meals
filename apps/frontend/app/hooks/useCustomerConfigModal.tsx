import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import SettingsListSelectOption from '@/components/SettingsListSelectOption/SettingsListSelectOption';
import { CustomerConfig, getCustomerConfigurations, getCustomerEnumForConfig } from '@/config';
import { TranslationKeys } from '@/locales/keys';
import { useLanguage } from '@/hooks/useLanguage';
import { RootState } from '@/redux/reducer';

type CustomerConfigModalProps = {
        selectedServer: string;
        onSelect: (config: CustomerConfig) => void;
};

const useCustomerConfigModal = () => {
        const { show, close } = useMyScrollViewModal();
        const { translate } = useLanguage();
        const { primaryColor } = useSelector((state: RootState) => state.settings);

        const servers = useMemo(() => getCustomerConfigurations(), []);

        const getDisplayName = useCallback(
                (config: CustomerConfig) => config.projectName || getCustomerEnumForConfig(config) || '',
                []
        );

        const openCustomerConfigModal = useCallback(
                ({ selectedServer, onSelect }: CustomerConfigModalProps) => {
                        show({
                                title: translate(TranslationKeys.backend_server),
                                onClose: close,
                                children: (
                                        <View style={{ width: '100%' }}>
                                                <SettingsListSelectOption
                                                        options={servers.map((srv) => ({
                                                                id: srv.server_url,
                                                                label: getDisplayName(srv),
                                                                icon: <MaterialCommunityIcons name="server" size={24} />,
                                                        }))}
                                                        selectedOption={selectedServer}
                                                        onSelect={(option) => {
                                                                const selectedConfig = servers.find((srv) => srv.server_url === option.id);
                                                                if (selectedConfig) {
                                                                        onSelect(selectedConfig);
                                                                }
                                                                close();
                                                        }}
                                                        iconBgColor={primaryColor}
                                                />
                                        </View>
                                ),
                        });
                },
                [close, getDisplayName, primaryColor, servers, show, translate]
        );

        return { openCustomerConfigModal, closeCustomerConfigModal: close };
};

export default useCustomerConfigModal;
