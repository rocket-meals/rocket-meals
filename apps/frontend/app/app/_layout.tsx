// Polyfill for environments where `setImmediate` is not available (e.g. web)
import 'setimmediate';
import React, {useEffect} from 'react';
import {ErrorBoundaryProps, Slot, usePathname} from 'expo-router';
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
import {ThemeProvider, useTheme as useCommonUiTheme} from '@/context/ThemeContext';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {configureStore, persistor} from '@/redux/store';
import {ServerAPI} from '@/redux/actions';
import {sqliteKeyValueStorage} from '@/redux/storage/sqliteStorage';
import {useTheme} from '@/hooks/useTheme';
import ServerStatusLoader from '@/components/ServerStatusLoader/ServerStatusLoader';
import {SafeAreaView} from 'react-native-safe-area-context';
import {GluestackUIProvider} from '@gluestack-ui/themed';
import {config} from '@gluestack-ui/config';
import ExpoUpdateLoader from '@/components/ExpoUpdateLoader/ExpoUpdateLoader';
import ExpoUpdateChecker from '@/components/ExpoUpdateChecker/ExpoUpdateChecker';
import {ModalContextProvider, ModalRenderer} from '@/components/GlobalModal/ModalProvider';
import AppDownloadBanner from '@/components/AppDownloadBanner';
import { ConfigCustomerEnum, getCompanyLogoLocalSaved, getCustomerConfig, getCustomerConfigsDict, getCustomerEnumForConfig } from '@/config';
import { SET_SELECTED_CUSTOMER } from '@/redux/Types/types';
import { SettingsProvider } from 'repo-depkit-common-ui';
import { useAppSelector } from '@/redux/hooks';
import useAccountRequiredModal from '@/hooks/useAccountRequiredModal';
import { afterRehydration } from '@/helper/afterRehydration';
import AppErrorBoundary from '@/components/AppErrorBoundary';

/**
 * Last-resort boundary. expo-router wraps this route's component with it, so it
 * catches render errors from the providers below (redux, theme, modals) as well
 * as anything they render. At this point the provider tree is gone - only a
 * reload can bring the app back, which is why the fallback reads its theme and
 * language straight from the store singleton instead of via context.
 *
 * Screens inside `(app)` are additionally covered by the boundary in
 * `app/(app)/_layout.tsx`, which keeps the app shell alive; this one only takes
 * over when that boundary itself could not render.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
	return <AppErrorBoundary error={error} retry={retry} variant="root" />;
}

ServerAPI.createAuthentificationStorage(
	async () => {
		const storedData = await sqliteKeyValueStorage.getItem('auth_data');
		return storedData ? JSON.parse(storedData) : null;
	},
	async value => {
		if (value) {
			await sqliteKeyValueStorage.setItem('auth_data', JSON.stringify(value));
		} else {
			await sqliteKeyValueStorage.removeItem('auth_data');
		}
	}
);

function AppSettingsProvider({ children }: Readonly<{ children: React.ReactNode }>) {
	const primaryColor = useAppSelector((state) => state.settings.primaryColor);
	const { openAccountRequiredModal } = useAccountRequiredModal();
	return (
		<SettingsProvider primaryColor={primaryColor} onAccountRequired={openAccountRequiredModal}>
			{children}
		</SettingsProvider>
	);
}

// Keeps the shared repo-depkit-common-ui ThemeProvider (used by components ported
// from/shared with the other apps, e.g. CustomMarkdown) in sync with the app's own
// redux-driven theme selection (`@/hooks/useTheme`, still the source of truth for the
// rest of the app's chrome) - otherwise it would default to following the OS scheme
// only, ignoring an explicit light/dark override the user made in Settings.
function ThemeSyncBridge() {
	const selectedTheme = useAppSelector((state) => state.settings.selectedTheme);
	const { setThemeMode } = useCommonUiTheme();

	useEffect(() => {
		setThemeMode(selectedTheme as 'light' | 'dark' | 'systematic');
	}, [selectedTheme, setThemeMode]);

	return null;
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

        // On iOS Safari the browser chrome (address bar / bottom toolbar) takes its
        // color from the theme-color meta tag; without it those areas stay white and
        // the page looks less like an app. Keep the tag and the document background
        // in sync with the active app theme.
        useEffect(() => {
                if (Platform.OS !== 'web' || typeof document === 'undefined') return;
                let meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null;
                if (!meta) {
                        meta = document.createElement('meta');
                        meta.setAttribute('name', 'theme-color');
                        document.head.appendChild(meta);
                }
                meta.setAttribute('content', theme.header.background);
                document.documentElement.style.backgroundColor = theme.screen.background;
                document.body.style.backgroundColor = theme.screen.background;
        }, [theme]);

        useEffect(() => {
                const setServerUrl = async () => {
                        const customerConfigs = getCustomerConfigsDict();
                        const storedCustomerEnum = (await sqliteKeyValueStorage.getItem('selected_customer_enum')) as
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

                        // No user-selected override – fall back to the build-time customer baked
                        // in via EXPO_PUBLIC_CUSTOMER so that real customer apps (e.g. SWOSY,
                        // Studi-Futter) always use the correct CustomerConfig regardless of what
                        // may be persisted in the Redux store from a previous session.
                        const buildTimeConfig = getCustomerConfig();
                        const buildTimeEnum = getCustomerEnumForConfig(buildTimeConfig);
                        if (buildTimeEnum) {
                                configureStore.dispatch({
                                        type: SET_SELECTED_CUSTOMER,
                                        payload: buildTimeEnum,
                                });
                                ServerAPI.updateServerUrl(buildTimeConfig.server_url);
                                return;
                        }

                        const url = await sqliteKeyValueStorage.getItem('server_url_custom');
                        if (url) {
                                ServerAPI.updateServerUrl(url);
                        }
                };

                return afterRehydration(setServerUrl);
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
			<ExpoUpdateLoader>
				<Provider store={configureStore}>
					<GluestackUIProvider config={config}>
						<PersistGate loading={null} persistor={persistor}>
							<RootSiblingParent>
								<ThemeProvider>
									<ThemeSyncBridge />
									<ModalContextProvider>
										<AppSettingsProvider>
											<ModalRenderer>
												<ServerStatusLoader>
													<ExpoUpdateChecker>
														<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: theme.screen.iconBg }}>
															<SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.iconBg }} edges={pathname?.includes('image-full-screen') ? ['bottom'] : ['top', 'bottom']}>
																<AppDownloadBanner />
																<Slot />
															</SafeAreaView>
														</KeyboardAvoidingView>
													</ExpoUpdateChecker>
												</ServerStatusLoader>
											</ModalRenderer>
										</AppSettingsProvider>
									</ModalContextProvider>
								</ThemeProvider>
							</RootSiblingParent>
						</PersistGate>
					</GluestackUIProvider>
				</Provider>
			</ExpoUpdateLoader>
		</GestureHandlerRootView>
	);
}
