import {
  ActivityIndicator,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import Modal from 'react-native-modal';
import { styles } from './styles';
import { AntDesign } from '@expo/vector-icons';
import { SubmissionWarningModalProps } from './types';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { FormsSubmissionsHelper } from '@/redux/actions/Forms/FormSubmitions';
import { FormSubmissions } from '@/constants/types';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const SubmissionWarningModal: React.FC<SubmissionWarningModalProps> = ({
  isVisible,
  setIsVisible,
  id,
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const [loading, setLoading] = useState(false);
  const formsSubmissionsHelper = new FormsSubmissionsHelper();
  const { primaryColor } = useSelector((state: RootState) => state.settings);
  const { user } = useSelector((state: RootState) => state.authReducer);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  );

  const handleProceed = async () => {
    setLoading(true);
    const update = (await formsSubmissionsHelper.updateFormSubmissionById(
      String(id),
      {
        user_locked_by: String(user?.id),
        date_started: new Date().toISOString(),
      }
    )) as FormSubmissions;
    if (update) {
      setIsVisible(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(Dimensions.get('window').width);
    };

    const subscription = Dimensions.addEventListener('change', handleResize);

    return () => subscription?.remove();
  }, []);

  return (
    <Modal
      isVisible={isVisible}
      style={[
        styles.modalContainer,
        screenWidth > 600 && { alignItems: 'center' },
      ]}
      onClose={() => {
        setIsVisible(false);
        router.navigate('/form-submissions');
      }}
    >
      <View
        style={{
          ...styles.modalView,
          backgroundColor: theme.modal.modalBg,
          width: screenWidth < 800 ? '90%' : screenWidth < 1200 ? 700 : 600,
        }}
      >
        <View style={styles.modalHeader}>
          <View style={{ width: 50 }} />
          <Text
            style={{
              ...styles.modalHeading,
              color: theme.modal.text,
              fontSize: Dimensions.get('window').width < 500 ? 26 : 36,
            }}
          >
            {translate(TranslationKeys.warning)}
          </Text>
          <TouchableOpacity
            style={{
              ...styles.closeButton,
              backgroundColor: theme.modal.closeBg,
            }}
            onPress={() => {
              setIsVisible(false);
              router.navigate('/form-submissions');
            }}
          >
            <AntDesign name='close' size={28} color={theme.modal.closeIcon} />
          </TouchableOpacity>
        </View>

        <Text
          style={{
            ...styles.modalSubHeading,
            color: theme.modal.text,
            fontSize: Dimensions.get('window').width < 500 ? 14 : 18,
          }}
        >
          {translate(TranslationKeys.form_edit_warning)}
        </Text>
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={{
              ...styles.loginButton,
              backgroundColor: theme.screen.iconBg,
              borderWidth: 1,
              borderColor: primaryColor,
              width: Dimensions.get('window').width < 500 ? '100%' : '80%',
            }}
            onPress={() => router.navigate('/form-submissions')}
          >
            {
              <Text style={{ ...styles.loginLabel, color: theme.screen.text }}>
                {translate(TranslationKeys.cancel)}
              </Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              ...styles.loginButton,
              backgroundColor: primaryColor,
              width: Dimensions.get('window').width < 500 ? '100%' : '80%',
            }}
            onPress={handleProceed}
          >
            {loading ? (
              <ActivityIndicator size={22} color={theme.background} />
            ) : (
              <Text style={{ ...styles.loginLabel, color: theme.activeText }}>
                {translate(TranslationKeys.proceed)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default SubmissionWarningModal;
