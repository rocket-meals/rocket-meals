import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import Modal from 'react-native-modal';
import { styles } from './styles';
import { AntDesign } from '@expo/vector-icons';
import { SubmissionWarningModalProps } from './types';
import { useRouter } from 'expo-router';
import { useAppSelector } from '@/redux/hooks';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { FormsSubmissionsHelper } from '@/redux/actions/Forms/FormSubmitions';
import { DatabaseTypes } from 'repo-depkit-common';
import { TranslationKeys } from '@/locales/keys';
import AppButton from '@/components/AppButton';

const SubmissionWarningModal: React.FC<SubmissionWarningModalProps> = ({ isVisible, setIsVisible, id }) => {
	const router = useRouter();
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const [loading, setLoading] = useState(false);
	const formsSubmissionsHelper = new FormsSubmissionsHelper();
	const { primaryColor } = useAppSelector((state) => state.settings);
	const { user } = useAppSelector((state) => state.authReducer);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

	const handleProceed = async () => {
		setLoading(true);
		const update = (await formsSubmissionsHelper.updateFormSubmissionById(String(id), {
			user_locked_by: String(user?.id),
			date_started: new Date().toISOString(),
		})) as DatabaseTypes.FormSubmissions;
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
			style={[styles.modalContainer, screenWidth > 600 && { alignItems: 'center' }]}
			onBackdropPress={() => {
				setIsVisible(false);
				router.navigate('/form-submissions');
			}}
			onBackButtonPress={() => {
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
						<AntDesign name="close" size={28} color={theme.modal.closeIcon} />
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
					<AppButton
						text={translate(TranslationKeys.cancel)}
						onPress={() => router.navigate('/form-submissions')}
						variant="outline"
						style={{
							...styles.loginButton,
							backgroundColor: theme.screen.iconBg,
							borderWidth: 1,
							borderColor: primaryColor,
							width: Dimensions.get('window').width < 500 ? '100%' : '80%',
						}}
						textStyle={{ ...styles.loginLabel, color: theme.screen.text }}
					/>
					<AppButton
						text={translate(TranslationKeys.proceed)}
						onPress={handleProceed}
						loading={loading}
						loadingIndicatorColor={theme.background}
						loadingIndicatorSize={22}
						style={{
							...styles.loginButton,
							backgroundColor: primaryColor,
							width: Dimensions.get('window').width < 500 ? '100%' : '80%',
						}}
						textStyle={{ ...styles.loginLabel, color: theme.activeText }}
					/>
				</View>
			</View>
		</Modal>
	);
};

export default SubmissionWarningModal;
