import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useState } from 'react';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { sheetProps } from './types';
import { useDispatch, useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { FormsSubmissionsHelper } from '@/redux/actions/Forms/FormSubmitions';
import { FormSubmissions } from '@/constants/types';
import { SET_FORM_SUBMISSION } from '@/redux/Types/types';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const EditFormSubmissionSheet: React.FC<sheetProps> = ({ id, closeSheet }) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const dispatch = useDispatch();
  const { formSubmission } = useSelector((state: RootState) => state.form);
  const [alias, setAlias] = useState(
    formSubmission ? formSubmission?.alias : ''
  );
  const [loading, setLoading] = useState(false);
  const { primaryColor } = useSelector((state: RootState) => state.settings);
  const formsSubmissionsHelper = new FormsSubmissionsHelper();

  const handleChangeAlias = async () => {
    if (id && alias) {
      setLoading(true);
      const update = (await formsSubmissionsHelper.updateFormSubmissionById(
        String(id),
        {
          alias: alias,
        }
      )) as FormSubmissions;
      if (update) {
        dispatch({ type: SET_FORM_SUBMISSION, payload: update });
        setLoading(false);
        closeSheet();
      }
    } else {
      setLoading(false);
      closeSheet();
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
        <View />
        <Text
          style={{
            ...styles.sheetHeading,
            fontSize: isWeb ? 40 : 28,
            color: theme.sheet.text,
          }}
        >
          {translate(TranslationKeys.edit)}
        </Text>
      </View>
      <View style={styles.editContentContainer}>
        <View
          style={{
            ...styles.inputContainer,
          }}
        >
          <TextInput
            style={[styles.input, { color: theme.screen.text }]}
            cursorColor={theme.screen.text}
            placeholderTextColor={theme.screen.placeholder}
            onChangeText={setAlias}
            value={alias}
            placeholder='Type here...'
          />
        </View>
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={{
              ...styles.button,
              backgroundColor: theme.screen.iconBg,
              borderColor: theme.screen.text,
            }}
            onPress={closeSheet}
          >
            <Text style={{ ...styles.buttonLabel, color: theme.screen.text }}>
              {translate(TranslationKeys.cancel)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              ...styles.button,
              backgroundColor: primaryColor,
              borderColor: primaryColor,
            }}
            onPress={handleChangeAlias}
          >
            {loading ? (
              <ActivityIndicator size={22} color={theme.screen.text} />
            ) : (
              <Text style={{ ...styles.buttonLabel, color: theme.activeText }}>
                {translate(TranslationKeys.save)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetScrollView>
  );
};

export default EditFormSubmissionSheet;
