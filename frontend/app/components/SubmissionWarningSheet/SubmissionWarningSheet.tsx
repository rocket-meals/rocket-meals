import {
  ActivityIndicator,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useState } from 'react';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { sheetProps } from './types';
import { useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { router } from 'expo-router';
import { FormsSubmissionsHelper } from '@/redux/actions/Forms/FormSubmitions';
import { FormSubmissions } from '@/constants/types';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const SubmissionWarningSheet: React.FC<sheetProps> = ({ id, closeSheet }) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const formsSubmissionsHelper = new FormsSubmissionsHelper();
  const [loading, setLoading] = useState(false);
  const { primaryColor } = useSelector((state: RootState) => state.settings);
  const { user } = useSelector((state: RootState) => state.authReducer);

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
      closeSheet();
      setLoading(false);
    }
  };
  return (
    <BottomSheetScrollView
      style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
      contentContainerStyle={styles.contentContainer}
    >
      <View
        style={{
          ...styles.sheetHeader,
          paddingRight: isWeb ? 10 : 0,
          paddingTop: isWeb ? 10 : 0,
        }}
      >
        <View style={{ width: 50 }} />
        <Text
          style={{
            ...styles.sheetHeading,
            fontSize: 30,
            color: theme.sheet.text,
          }}
        >
          {translate(TranslationKeys.warning)}
        </Text>
      </View>
      <Text
        style={{
          ...styles.modalSubHeading,
          color: theme.modal.text,
        }}
      >
        This form is currently being edited by another user. Proceeding may
        overwrite their changes. Do you still want to continue?
      </Text>
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={{
            ...styles.loginButton,
            backgroundColor: primaryColor,
            width: '100%',
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
        <TouchableOpacity
          style={{
            ...styles.loginButton,
            backgroundColor: theme.screen.iconBg,
            borderWidth: 1,
            borderColor: primaryColor,
            width: '100%',
          }}
          onPress={() => router.navigate('/form-submissions')}
        >
          {
            <Text style={{ ...styles.loginLabel, color: theme.screen.text }}>
              {translate(TranslationKeys.cancel)}
            </Text>
          }
        </TouchableOpacity>
      </View>
    </BottomSheetScrollView>
  );
};

export default SubmissionWarningSheet;
