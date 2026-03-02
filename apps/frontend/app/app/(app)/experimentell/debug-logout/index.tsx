import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { CLEAR_ANONYMOUSLY, CLEAR_APARTMENTS, CLEAR_CAMPUSES, CLEAR_CANTEENS, CLEAR_CHATS, CLEAR_COLLECTION_DATES_LAST_UPDATED, CLEAR_FOODS, CLEAR_MANAGEMENT, CLEAR_NEWS, CLEAR_POPUP_EVENTS_HASH, CLEAR_PROFILE, CLEAR_SETTINGS, ON_LOGOUT } from '@/redux/Types/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistor } from '@/redux/store';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import styles from './styles';

const DebugLogout = () => {
	const dispatch = useDispatch();
	const { theme } = useTheme();
	const { translate } = useLanguage();

	const steps = [
		{
			label: 'CLEAR_CANTEENS',
			action: () => dispatch({ type: CLEAR_CANTEENS }),
		},
		{
			label: 'CLEAR_CAMPUSES',
			action: () => dispatch({ type: CLEAR_CAMPUSES }),
		},
		{
			label: 'CLEAR_APARTMENTS',
			action: () => dispatch({ type: CLEAR_APARTMENTS }),
		},
		{
			label: 'CLEAR_FOODS',
			action: () => dispatch({ type: CLEAR_FOODS }),
		},
		{
			label: 'CLEAR_MANAGEMENT',
			action: () => dispatch({ type: CLEAR_MANAGEMENT }),
		},
		{
			label: 'CLEAR_NEWS',
			action: () => dispatch({ type: CLEAR_NEWS }),
		},
		{
			label: 'CLEAR_CHATS',
			action: () => dispatch({ type: CLEAR_CHATS }),
		},
		{
			label: 'CLEAR_SETTINGS',
			action: () => dispatch({ type: CLEAR_SETTINGS }),
		},
		{
			label: 'CLEAR_POPUP_EVENTS_HASH',
			action: () => dispatch({ type: CLEAR_POPUP_EVENTS_HASH }),
		},
		{
			label: 'CLEAR_COLLECTION_DATES_LAST_UPDATED',
			action: () => dispatch({ type: CLEAR_COLLECTION_DATES_LAST_UPDATED }),
		},
		{
			label: 'CLEAR_PROFILE',
			action: () => dispatch({ type: CLEAR_PROFILE }),
		},
		{
			label: 'REMOVE_STORAGE',
			action: async () => {
				await AsyncStorage.multiRemove(['auth_data', 'persist:root']);
			},
		},
		{
			label: 'CLEAR_ANONYMOUSLY',
			action: () => dispatch({ type: CLEAR_ANONYMOUSLY }),
		},
		{
			label: 'ON_LOGOUT',
			action: () => dispatch({ type: ON_LOGOUT }),
		},
		{
			label: 'RESET_STORE',
			action: () => dispatch({ type: 'RESET_STORE' }),
		},
		{
			label: 'PURGE_PERSISTOR',
			action: () => persistor.purge(),
		},
		{
			label: 'ROUTER_REPLACE_LOGIN',
			action: () => router.replace({ pathname: '/(auth)/login', params: { logout: 'true' } }),
		},
	];

	const myTestLogout = async () => {
		const exclude = ['CLEAR_ANONYMOUSLY', 'ON_LOGOUT', 'RESET_STORE'];
		for (const step of steps) {
			if (exclude.includes(step.label)) continue;
			const result = step.action();
			if (result && typeof result === 'object' && typeof (result as any).then === 'function') {
				await (result as Promise<any>);
			}
		}
	};

	return (
		<ScrollView
			style={{ ...styles.container, backgroundColor: theme.screen.background }}
			contentContainerStyle={{
				...styles.contentContainer,
				backgroundColor: theme.screen.background,
			}}
		>
			<View style={{ ...styles.content }}>
				<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.debug_logout)}</Text>
				{steps.map((step, index) => (
					<TouchableOpacity key={index} style={{ ...styles.listItem, backgroundColor: theme.screen.iconBg }} onPress={step.action}>
						<Text style={{ ...styles.body, color: theme.screen.text }}>{step.label}</Text>
					</TouchableOpacity>
				))}
				<TouchableOpacity style={{ ...styles.listItem, backgroundColor: theme.screen.iconBg }} onPress={myTestLogout}>
					<Text style={{ ...styles.body, color: theme.screen.text }}>MY_TEST_LOGOUT</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
};

export default DebugLogout;
