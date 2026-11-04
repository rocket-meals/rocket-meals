import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import { MaterialIcons } from '@expo/vector-icons';

import SettingsListBoolean from '@/components/SettingsListBoolean';
import { myContrastColor } from '@/helper/ColorHelper';
import useFreeApartmentsNotification from '@/hooks/useFreeApartmentsNotification';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import { useAppSelector } from '@/redux/hooks';

const useHousingAreaColor = (): string => {
	const primaryColor = useAppSelector(state => state.settings.primaryColor);
	const housingAreaColor = useAppSelector(state => state.settings.appSettings?.housing_area_color);
	return housingAreaColor || primaryColor;
};

/** Button that switches the notification on, used in the "free rooms" modal. */
const FreeApartmentsNotificationButton: React.FC<{ onEnabled?: () => void }> = ({ onEnabled }) => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const selectedTheme = useAppSelector(state => state.settings.selectedTheme);
	const housingAreaColor = useHousingAreaColor();
	const { setEnabled, saving } = useFreeApartmentsNotification();
	const contrastColor = myContrastColor(housingAreaColor, theme as Parameters<typeof myContrastColor>[1], selectedTheme === 'dark');

	const onPress = useCallback(async () => {
		await setEnabled(true);
		onEnabled?.();
	}, [onEnabled, setEnabled]);

	return (
		<TouchableOpacity
			style={[styles.button, { backgroundColor: housingAreaColor }]}
			onPress={() => void onPress()}
			disabled={saving}
			accessibilityRole="button"
			accessibilityLabel={translate(TranslationKeys.housing_free_apartments_notification)}
		>
			{saving ? <LoadingIndicator color={contrastColor} /> : <MaterialIcons name="notifications-active" size={20} color={contrastColor} />}
			<Text style={[styles.buttonText, { color: contrastColor }]}>{translate(TranslationKeys.housing_free_apartments_notification)}</Text>
		</TouchableOpacity>
	);
};

/**
 * Content for the "free rooms" modal of an apartment card: the hint plus the button, or a
 * confirmation once the notification is on.
 */
export const FreeApartmentsNotificationModalSection: React.FC = () => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { isEnabled } = useFreeApartmentsNotification();

	if (isEnabled) {
		return <Text style={[styles.text, styles.centered, { color: theme.screen.text }]}>{translate(TranslationKeys.housing_free_apartments_notification_enabled)}</Text>;
	}
	return (
		<View style={styles.section}>
			<Text style={[styles.text, styles.centered, { color: theme.screen.text }]}>{translate(TranslationKeys.housing_free_apartments_notification_hint)}</Text>
			<FreeApartmentsNotificationButton />
		</View>
	);
};

/** Switch at the top of the housing screen, in its options modal and in the settings. */
export const FreeApartmentsNotificationToggle: React.FC<{ groupPosition: 'top' | 'middle' | 'bottom' | 'single'; iconSize?: number }> = ({ groupPosition, iconSize = 20 }) => {
	const { translate } = useLanguage();
	const housingAreaColor = useHousingAreaColor();
	const { isEnabled, toggle, isAccountRequired, openAccountRequiredModal, saving } = useFreeApartmentsNotification();

	return (
		<SettingsListBoolean
			iconBgColor={housingAreaColor}
			leftIcon={<MaterialIcons name={isEnabled ? 'notifications-active' : 'notifications-off'} size={iconSize} />}
			label={translate(TranslationKeys.housing_free_apartments_notification)}
			isEnabled={isEnabled}
			onToggle={() => void toggle()}
			loading={saving}
			valueActive={translate(TranslationKeys.active)}
			valueInactive={translate(TranslationKeys.inactive)}
			groupPosition={groupPosition}
			isAccountRequired={isAccountRequired}
			onAccountRequired={openAccountRequiredModal}
		/>
	);
};

const styles = StyleSheet.create({
	section: {
		gap: 12,
		marginTop: 16,
	},
	text: {
		fontSize: 15,
		fontFamily: 'Poppins_400Regular',
	},
	centered: {
		textAlign: 'center',
	},
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		borderRadius: 10,
		minHeight: 43,
		paddingHorizontal: 16,
	},
	buttonText: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		flexShrink: 1,
	},
});
