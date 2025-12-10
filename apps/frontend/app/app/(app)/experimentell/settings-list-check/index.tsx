import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import SettingsList from '@/components/SettingsList';
import MyScrollViewModal from '@/components/MyScrollViewModal';
import { useModal } from '@/components/GlobalModal/useModal';
import styles from './styles';

const SettingsListCheck = () => {
        useSetPageTitle(TranslationKeys.settings_list_check);
        const { theme } = useTheme();
        const { translate } = useLanguage();
        const { primaryColor } = useSelector((state: RootState) => state.settings);
        const { show, close } = useModal();
        const [selectedEntry, setSelectedEntry] = useState('');

        const modalEntries = useMemo(
                () => [
                        translate(TranslationKeys.select),
                        translate(TranslationKeys.deselect),
                        translate(TranslationKeys.enter_custom_value),
                        translate(TranslationKeys.cancel),
                        translate(TranslationKeys.confirm),
                ],
                [translate]
        );

        const openModal = useCallback(() => {
                show(
                        <MyScrollViewModal
                                title={translate(TranslationKeys.settings_list_check)}
                                closeSheet={close}
                                useFlatList
                                data={modalEntries}
                                keyExtractor={(item, index) => `${item}-${index}`}
                                renderItem={({ item }) => {
                                        const isSelected = selectedEntry === item;
                                        return (
                                                <TouchableOpacity
                                                        onPress={() => {
                                                                setSelectedEntry(item);
                                                                close();
                                                        }}
                                                        style={{
                                                                flexDirection: 'row',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                paddingVertical: 12,
                                                                paddingHorizontal: 12,
                                                                borderRadius: 10,
                                                                marginBottom: 10,
                                                                backgroundColor: isSelected
                                                                        ? primaryColor
                                                                        : theme.screen.iconBg,
                                                        }}
                                                >
                                                        <Text
                                                                style={{
                                                                        color: isSelected ? theme.activeText : theme.screen.text,
                                                                        fontSize: 16,
                                                                        flex: 1,
                                                                }}
                                                        >
                                                                {item}
                                                        </Text>
                                                        <MaterialCommunityIcons
                                                                name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                                                size={24}
                                                                color={isSelected ? theme.activeText : theme.screen.icon}
                                                        />
                                                </TouchableOpacity>
                                        );
                                }}
                        />,
                        { backgroundStyle: { backgroundColor: theme.sheet?.sheetBg } }
                );
        }, [
                close,
                modalEntries,
                primaryColor,
                selectedEntry,
                show,
                theme.activeText,
                theme.screen.icon,
                theme.screen.iconBg,
                theme.screen.text,
                theme.sheet?.sheetBg,
                translate,
        ]);

        return (
                <ScrollView
                        style={{ ...styles.container, backgroundColor: theme.screen.background }}
                        contentContainerStyle={{
				...styles.contentContainer,
				backgroundColor: theme.screen.background,
			}}
		>
                        <View style={{ ...styles.content }}>
                                <Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.settings_list_check)}</Text>
                                <SettingsList iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="format-list-text" size={24} color={theme.screen.icon} />} title="Dies ist ein extrem langer Titel, der in dieser Zeile nicht vollständig angezeigt werden kann." value="Auch dieser sehr lange Wert sollte ordentlich umgebrochen werden, damit alles lesbar bleibt." groupPosition="single" />
                                <View style={{ marginTop: 20 }}>
                                        <SettingsList
                                                iconBgColor={primaryColor}
                                                leftIcon={<MaterialCommunityIcons name="playlist-check" size={24} color={theme.screen.icon} />}
                                                title={translate(TranslationKeys.select)}
                                                value={selectedEntry || translate(TranslationKeys.enter_custom_value)}
                                                groupPosition="single"
                                                onPress={openModal}
                                        />
                                </View>
                        </View>
                </ScrollView>
        );
};

export default SettingsListCheck;
