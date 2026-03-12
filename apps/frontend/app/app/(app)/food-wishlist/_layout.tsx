import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Stack } from 'expo-router';
import CustomStackHeader from '@/components/CustomStackHeader/CustomStackHeader';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';

export default function FoodWishlistLayout() {
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
					header: () => <CustomStackHeader label={translate(TranslationKeys.food_wishlist)} />,
				}}
			/>
		</Stack>
	);
}
