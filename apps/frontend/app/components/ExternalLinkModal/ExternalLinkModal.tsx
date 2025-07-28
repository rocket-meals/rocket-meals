import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import BaseModal from '@/components/BaseModal';
import { useTheme } from '@/hooks/useTheme';
import { CommonSystemActionHelper } from '@/helper/SystemActionHelper';
import { useSelector } from 'react-redux';
import { myContrastColor } from '@/helper/colorHelper';
import { RootState } from '@/redux/reducer';

export interface ExternalLinkModalProps {
  visible: boolean;
  url: string;
  onClose: () => void;
}

const ExternalLinkModal: React.FC<ExternalLinkModalProps> = ({
  visible,
  url,
  onClose,
}) => {
  const { theme } = useTheme();
  const { primaryColor, selectedTheme: mode } = useSelector(
    (state: RootState) => state.settings,
  );
  const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');

  const handleOpen = () => {
    CommonSystemActionHelper.openExternalURL(url, true);
    onClose();
  };

  return (
    <BaseModal isVisible={visible} onClose={onClose} title="Externen Link öffnen?">
      <View style={{ gap: 20, width: '100%', alignItems: 'center' }}>
        <TouchableOpacity
          style={{
            backgroundColor: primaryColor,
            padding: 10,
            borderRadius: 8,
            alignItems: 'center',
            width: '80%',
          }}
          onPress={handleOpen}
        >
          <Text style={{ color: contrastColor }}>Ja bitte</Text>
        </TouchableOpacity>
        <Text style={{ color: theme.modal.text, textAlign: 'center' }}>{url}</Text>
      </View>
    </BaseModal>
  );
};

export default ExternalLinkModal;
export type { ExternalLinkModalProps };
