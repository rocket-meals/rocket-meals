import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Stack } from 'expo-router';
import CustomStackHeader from '@/components/CustomStackHeader/CustomStackHeader';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';

export default function FoodOfferLayout() {
	const { theme } = useTheme();
	const { translate } = useLanguage();

	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: theme.header.background },
				headerTintColor: theme.header.text,
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					title: translate(TranslationKeys.campus),
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="details/index"
				options={{
					header: () => <CustomStackHeader label={translate(TranslationKeys.building_details)} />,
				}}
			/>
		</Stack>
	);
}
