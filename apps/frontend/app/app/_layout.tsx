// Polyfill for environments where `setImmediate` is not available (e.g. web)
import 'setimmediate';
import React, {useEffect} from 'react';
import {Slot, usePathname} from 'expo-router';
import {RootSiblingParent} from 'react-native-root-siblings';
import {
	Poppins_100Thin,
	Poppins_100Thin_Italic,
	Poppins_200ExtraLight,
	Poppins_200ExtraLight_Italic,
	Poppins_300Light,
	Poppins_300Light_Italic,
	Poppins_400Regular,
	Poppins_400Regular_Italic,
	Poppins_500Medium,
	Poppins_500Medium_Italic,
	Poppins_600SemiBold,
	Poppins_600SemiBold_Italic,
	Poppins_700Bold,
	Poppins_700Bold_Italic,
	Poppins_800ExtraBold,
	Poppins_800ExtraBold_Italic,
	Poppins_900Black,
	Poppins_900Black_Italic,
	useFonts
} from '@expo-google-fonts/poppins';
import {Image, KeyboardAvoidingView, Platform, View} from 'react-native';
import {ThemeProvider} from '@/context/ThemeContext';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {configureStore, persistor} from '@/redux/store';
import {ServerAPI} from '@/redux/actions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTheme} from '@/hooks/useTheme';
import ServerStatusLoader from '@/components/ServerStatusLoader/ServerStatusLoader';
import {SafeAreaView} from 'react-native-safe-area-context';
import {GluestackUIProvider} from '@gluestack-ui/themed';
import {config} from '@gluestack-ui/config';
import ExpoUpdateLoader from '@/components/ExpoUpdateLoader/ExpoUpdateLoader';
import ExpoUpdateChecker from '@/components/ExpoUpdateChecker/ExpoUpdateChecker';
import {ModalProvider} from '@/components/GlobalModal/ModalProvider';
import { ConfigCustomerEnum, getCompanyLogoLocalSaved, getCustomerConfigsDict } from '@/config';
import { SET_SELECTED_CUSTOMER } from '@/redux/Types/types';
import { SettingsProvider, LanguageProvider, useLanguageContext } from 'repo-depkit-common-ui';
import { useAppSelector } from '@/redux/hooks';
import useAccountRequiredModal from '@/hooks/useAccountRequiredModal';

ServerAPI.createAuthentificationStorage(
	async () => {
		const storedData = await AsyncStorage.getItem('auth_data');
		return storedData ? JSON.parse(storedData) : null;
	},
	async value => {
		if (value) {
			await AsyncStorage.setItem('auth_data', JSON.stringify(value));
		} else {
			await AsyncStorage.removeItem('auth_data');
		}
	}
);

/**
 * Reads the currently selected language from Redux and propagates it into the
 * shared common-ui {@link LanguageProvider} context so all common-ui components
 * automatically reflect the user's language choice.
 */
function LanguageBridge() {
	const language = useAppSelector((state) => state.settings.language);
	const { setLanguage } = useLanguageContext();

	useEffect(() => {
		setLanguage(language);
	}, [language, setLanguage]);

	return null;
}

function AppSettingsProvider({ children }: { children: React.ReactNode }) {
	const primaryColor = useAppSelector((state) => state.settings.primaryColor);
	const { openAccountRequiredModal } = useAccountRequiredModal();
	return (
		<SettingsProvider primaryColor={primaryColor} onAccountRequired={openAccountRequiredModal}>
			{children}
		</SettingsProvider>
	);
}

export default function Layout() {
	const { theme } = useTheme();
	const pathname = usePathname();
	const [fontsLoaded] = useFonts({
		Poppins_100Thin,
		Poppins_100Thin_Italic,
		Poppins_200ExtraLight,
		Poppins_200ExtraLight_Italic,
		Poppins_300Light,
		Poppins_300Light_Italic,
		Poppins_400Regular,
		Poppins_400Regular_Italic,
		Poppins_500Medium,
		Poppins_500Medium_Italic,
		Poppins_600SemiBold,
		Poppins_600SemiBold_Italic,
		Poppins_700Bold,
		Poppins_700Bold_Italic,
		Poppins_800ExtraBold,
		Poppins_800ExtraBold_Italic,
		Poppins_900Black,
		Poppins_900Black_Italic,
	});

        useEffect(() => {
                const setServerUrl = async () => {
                        const customerConfigs = getCustomerConfigsDict();
                        const storedCustomerEnum = (await AsyncStorage.getItem('selected_customer_enum')) as
                                | ConfigCustomerEnum
                                | null;

                        if (storedCustomerEnum && customerConfigs[storedCustomerEnum]) {
                                configureStore.dispatch({
                                        type: SET_SELECTED_CUSTOMER,
                                        payload: storedCustomerEnum,
                                });
                                ServerAPI.updateServerUrl(customerConfigs[storedCustomerEnum].server_url);
                                return;
                        }

                        const url = await AsyncStorage.getItem('server_url_custom');
                        if (url) {
                                ServerAPI.updateServerUrl(url);
                        }
                };

                setServerUrl();
        }, []);

	if (!fontsLoaded) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: 'center',
					alignItems: 'center',
					backgroundColor: '#ffffff',
				}}
			>
				<Image source={getCompanyLogoLocalSaved()} style={{ width: 250, height: 250 }} resizeMode="contain" />
			</View>
		);
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			{/* LanguageProvider auto-detects the device locale as a safe initial value.
			    Once the Redux store is available, LanguageBridge (inside Provider) will
			    immediately sync the user's chosen language into this context. */}
			<LanguageProvider>
				<ExpoUpdateLoader>
					<Provider store={configureStore}>
						{/* LanguageBridge must be inside the Redux Provider so it can access
						    store state via useAppSelector, and inside LanguageProvider so it
						    can call setLanguage. It intentionally sits outside ThemeProvider
						    and other UI providers — it has no rendering output. */}
						<LanguageBridge />
						<GluestackUIProvider config={config}>
							<PersistGate loading={null} persistor={persistor}>
								<RootSiblingParent>
									<ThemeProvider>
										<ModalProvider>
											<AppSettingsProvider>
												<ServerStatusLoader>
													<ExpoUpdateChecker>
														<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: theme.screen.iconBg }}>
															<SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.iconBg }} edges={pathname?.includes('image-full-screen') ? ['bottom'] : ['top', 'bottom']}>
																<Slot />
															</SafeAreaView>
														</KeyboardAvoidingView>
													</ExpoUpdateChecker>
												</ServerStatusLoader>
											</AppSettingsProvider>
										</ModalProvider>
									</ThemeProvider>
								</RootSiblingParent>
							</PersistGate>
						</GluestackUIProvider>
					</Provider>
				</ExpoUpdateLoader>
			</LanguageProvider>
		</GestureHandlerRootView>
	);
}
