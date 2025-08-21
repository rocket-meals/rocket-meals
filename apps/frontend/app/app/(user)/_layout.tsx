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
				name="delete-user/index"
				options={{
					header: () => (
						<CustomStackHeader
							label={translate(TranslationKeys.account_delete)}
							key={'account_delete'}
						/>
					),
				}}
			/>
		</Stack>
	);
}
