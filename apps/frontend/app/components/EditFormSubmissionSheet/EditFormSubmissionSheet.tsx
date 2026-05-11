import { Text, View } from 'react-native';
import React, { useState } from 'react';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { sheetProps } from './types';
import { useDispatch } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { FormsSubmissionsHelper } from '@/redux/actions/Forms/FormSubmitions';
import { DatabaseTypes } from 'repo-depkit-common';
import { SET_FORM_SUBMISSION } from '@/redux/Types/types';
import { TranslationKeys } from '@/locales/keys';
import { useAppSelector } from '@/redux/hooks';
import AppButton from '@/components/AppButton';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import useLanguageTextAlign from '@/hooks/useLanguageTextAlign';
import AppTextInput from '@/components/AppTextInput';

const EditFormSubmissionSheet: React.FC<sheetProps> = ({ id, closeSheet }) => {
	const { theme } = useTheme();
	const isLtrLanguage = useIsLtrLanguage();
	const { translate, language } = useLanguage();
	const languageTextAlign = useLanguageTextAlign();
	const dispatch = useDispatch();
	const { formSubmission } = useAppSelector((state) => state.form);
	const [alias, setAlias] = useState(formSubmission ? formSubmission?.alias : '');
	const [loading, setLoading] = useState(false);
	const { primaryColor } = useAppSelector((state) => state.settings);
	const formsSubmissionsHelper = new FormsSubmissionsHelper();

	const handleChangeAlias = async () => {
		if (id && alias) {
			setLoading(true);
			const update = (await formsSubmissionsHelper.updateFormSubmissionById(String(id), {
				alias: alias,
			})) as DatabaseTypes.FormSubmissions;
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
		<BottomSheetScrollView style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }} contentContainerStyle={styles.contentContainer}>
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
					<AppTextInput
						style={[styles.input, { color: theme.screen.text }, { textAlign: languageTextAlign }]}
						inputStyle={{
							backgroundColor: 'transparent',
							paddingHorizontal: 0,
						}}
						borderWidth={0}
						isBottomSheet={!isWeb}
						onChangeText={setAlias}
						value={alias || ''}
						placeholder={translate(TranslationKeys.type_here)}
					/>
				</View>
				<View style={styles.actionContainer}>
					<AppButton
						text={translate(TranslationKeys.cancel)}
						onPress={closeSheet}
						variant="outline"
						style={{ ...styles.button, backgroundColor: theme.screen.iconBg, borderColor: theme.screen.text }}
						textStyle={{ ...styles.buttonLabel, color: theme.screen.text }}
					/>
					<AppButton
						text={translate(TranslationKeys.save)}
						onPress={handleChangeAlias}
						loading={loading}
						loadingIndicatorColor={theme.screen.text}
						loadingIndicatorSize={22}
						style={{ ...styles.button, backgroundColor: primaryColor, borderColor: primaryColor }}
						textStyle={{ ...styles.buttonLabel, color: theme.activeText }}
					/>
				</View>
			</View>
		</BottomSheetScrollView>
	);
};

export default EditFormSubmissionSheet;
