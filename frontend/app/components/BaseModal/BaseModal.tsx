import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { AntDesign } from '@expo/vector-icons';
import { styles } from './styles';
import { useTheme } from '@/hooks/useTheme';

export interface BaseModalProps {
  isVisible: boolean;
  title?: string;
  onClose: () => void;
  children?: React.ReactNode;
}

const BaseModal: React.FC<BaseModalProps> = ({
  isVisible,
  title,
  onClose,
  children,
}) => {
  const { theme } = useTheme();


  return (
    <Modal
      isVisible={isVisible}
      style={styles.modalContainer}
      onBackdropPress={onClose}
    >
      <View
        style={[
          styles.modalView,
          {
            backgroundColor: theme.modal.modalBg,
            width: '100%',
            height: Dimensions.get('window').height * 0.8,
          },
        ]}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.modal.closeBg }]}
            onPress={onClose}
          >
            <AntDesign name='close' size={28} color={theme.modal.closeIcon} />
          </TouchableOpacity>
        </View>
        {title && (
          <Text
            style={{
              ...styles.modalHeading,
              color: theme.modal.text,
              fontSize: Dimensions.get('window').width < 500 ? 26 : 36,
            }}
          >
            {title}
          </Text>
        )}
        {children}
      </View>
    </Modal>
  );
};

export default BaseModal;
