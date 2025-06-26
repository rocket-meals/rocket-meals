import React, { ReactNode, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { styles } from './styles';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

interface ModalComponentProps {
  isVisible: boolean;
  title?: string;
  onClose: () => void;
  onSave: () => void;
  children?: ReactNode;
  showButtons?: boolean;
  disableSave?: boolean;
}

const ModalComponent: React.FC<ModalComponentProps> = ({
  isVisible,
  title = 'Modal Title',
  onClose,
  onSave,
  children,
  showButtons = true,
  disableSave,
}) => {
  const { primaryColor } = useSelector((state: RootState) => state.settings);
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const [isLargeScreen, setIsLargeScreen] = useState(
    Dimensions.get('window').width
  );
  const [backdropOpacity, setBackdropOpacity] = useState(0.7);
  useEffect(() => {
    const onChange = ({ window }: { window: any }) => {
      setIsLargeScreen(window.width);
      setBackdropOpacity(0.7);
    };

    const subscription = Dimensions.addEventListener('change', onChange);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <Modal
      isVisible={isVisible}
      onClose={onClose}
      animationIn='slideInUp'
      animationOut='slideOutDown'
      backdropOpacity={backdropOpacity}
      style={{ margin: 0 }}
    >
      <View
        style={[
          styles.modalContainer,
          {
            backgroundColor: theme.modal.modalBg,
            width: isLargeScreen < 550 ? '95%' : 600,
          },
        ]}
      >
        {/* Title */}
        <View style={styles.modalHeader}>
          <View />
          <Text
            style={{
              ...styles.modalHeading,
              color: theme.modal.text,
              fontSize: isLargeScreen < 500 ? 23 : 28,
            }}
          >
            {translate(title)}
          </Text>
          <TouchableOpacity
            style={{
              ...styles.closeButton,
              backgroundColor: theme.modal.closeBg,
              height: isLargeScreen ? 36 : 40,
              width: isLargeScreen ? 36 : 40,
            }}
            onPress={onClose}
          >
            <AntDesign
              name='close'
              size={isLargeScreen ? 20 : 26}
              color={theme.modal.closeIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>{children}</View>

        {/* Action Buttons */}
        {showButtons && (
          <View style={[styles.buttonContainer, { width: '60%' }]}>
            <TouchableOpacity
              onPress={onClose}
              style={{ ...styles.cancelButton, borderColor: primaryColor }}
            >
              <Text style={[styles.buttonText, { color: theme.screen.text }]}>
                {translate(TranslationKeys.cancel)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSave}
              disabled={disableSave}
              style={{ ...styles.saveButton, backgroundColor: primaryColor }}
            >
              <Text style={[styles.buttonText, { color: theme.activeText }]}>
                {translate(TranslationKeys.save)}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default ModalComponent;
