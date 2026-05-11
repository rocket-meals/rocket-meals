import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Stack } from 'expo-router';
import CustomStackHeader from '@/components/CustomStackHeader/CustomStackHeader';

export default function FoodOfferLayout() {
	const { theme } = useTheme();

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
					title: 'Campus',
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="details/index"
				options={{
					header: () => <CustomStackHeader label={'Building Details'} />,
				}}
			/>
		</Stack>
	);
}
