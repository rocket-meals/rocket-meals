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
					title: 'list-week-screen',
					header: () => <CustomStackHeader label={translate(TranslationKeys.Food_Plan_Week)} />,
				}}
			/>
			<Stack.Screen
				name="details/index"
				options={{
					headerShown: false,
				}}
			/>
		</Stack>
	);
}
