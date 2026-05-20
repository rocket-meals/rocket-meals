import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import AppButton from '@/components/AppButton';
import { TranslationKeys } from '@/locales/keys';

export interface AppConfirmationDialogProps {
	title: string;
	description?: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void | Promise<void>;
	onCancel: () => void;
}

const AppConfirmationDialog: React.FC<AppConfirmationDialogProps> = ({
	title,
	description,
	confirmText,
	cancelText,
	onConfirm,
	onCancel,
}) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const isLtrLanguage = useIsLtrLanguage();
	const isRtl = !isLtrLanguage;

	const resolvedConfirmText = confirmText || translate(TranslationKeys.confirm);
	const resolvedCancelText = cancelText || translate(TranslationKeys.cancel);

	return (
		<View style={styles.container}>
			<Text
				style={[
					styles.title,
					{
						color: theme.screen.text,
						textAlign: isRtl ? 'right' : 'left',
						alignSelf: isRtl ? 'flex-end' : 'flex-start',
						writingDirection: isRtl ? 'rtl' : 'ltr',
					},
				]}
			>
				{title}
			</Text>

			{Boolean(description) && (
				<Text
					style={[
						styles.description,
						{
							color: theme.screen.text,
							textAlign: isRtl ? 'right' : 'left',
							alignSelf: isRtl ? 'flex-end' : 'flex-start',
							writingDirection: isRtl ? 'rtl' : 'ltr',
						},
					]}
				>
					{description}
				</Text>
			)}

			<AppButton
				text={resolvedConfirmText}
				onPress={onConfirm}
				style={styles.confirmButton}
			/>

			<AppButton
				text={resolvedCancelText}
				onPress={onCancel}
				variant="ghost"
				style={styles.cancelButton}
				textStyle={{ color: theme.screen.text }}
				usePlainText
			/>
		</View>
	);
};

export default AppConfirmationDialog;

const styles = StyleSheet.create({
	container: {
		gap: 12,
		width: '100%',
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
	},
	description: {
		fontSize: 15,
		opacity: 0.85,
		lineHeight: 20,
	},
	confirmButton: {
		marginVertical: 0,
		width: '100%',
	},
	cancelButton: {
		alignSelf: 'center',
		paddingVertical: 6,
		marginVertical: 0,
	},
});
