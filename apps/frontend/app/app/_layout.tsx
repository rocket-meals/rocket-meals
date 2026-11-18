// Polyfill for environments where `setImmediate` is not available (e.g. web)
import 'setimmediate';
import React, {useEffect, useMemo } from 'react';
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
import {ThemeProvider, useTheme as useCommonUiTheme} from '@/context/ThemeContext';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {configureStore, persistor} from '@/redux/store';
import {ServerAPI} from '@/redux/actions';
import {sqliteKeyValueStorage} from '@/redux/storage/sqliteStorage';
import {useTheme, useThemeStatusBar} from '@/hooks/useTheme';
import ServerStatusLoader from '@/components/ServerStatusLoader/ServerStatusLoader';
import {SafeAreaFrameContext, SafeAreaInsetsContext, SafeAreaView, useSafeAreaFrame, useSafeAreaInsets} from 'react-native-safe-area-context';
import IphoneDuoSimulation from '@/components/IphoneDuoSimulation';
import {GluestackUIProvider} from '@gluestack-ui/themed';
import {config} from '@gluestack-ui/config';
import ExpoUpdateLoader from '@/components/ExpoUpdateLoader/ExpoUpdateLoader';
import ExpoUpdateChecker from '@/components/ExpoUpdateChecker/ExpoUpdateChecker';
import {ModalContextProvider, ModalRenderer} from '@/components/GlobalModal/ModalProvider';
import AppDownloadBanner from '@/components/AppDownloadBanner';
import MaintenanceBanner from '@/components/MaintenanceBanner';
import TextRecognitionWebViewHost from '@/components/TextRecognitionWebView';
import { ConfigCustomerEnum, getCompanyLogoLocalSaved, getCustomerConfig, getCustomerConfigsDict, getCustomerEnumForConfig } from '@/config';
import { SET_SELECTED_CUSTOMER } from '@/redux/Types/types';
import { useLanguageProfileSync } from '@/hooks/useLanguageProfileSync';
import { useUniversityStatusTracking } from '@/hooks/useUniversityStatusTracking';
import { SettingsProvider } from 'repo-depkit-common-ui';
import { useAppSelector } from '@/redux/hooks';
import useAccountRequiredModal from '@/hooks/useAccountRequiredModal';
import { afterRehydration } from '@/helper/afterRehydration';
import { useAppIconBadgeReset } from '@/hooks/useAppIconBadgeReset';
import { NotificationHelper } from '@/helper/NotificationHelper';

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
	const language = useAppSelector((state) => state.settings.language);
	const { openAccountRequiredModal } = useAccountRequiredModal();
	return (
		<SettingsProvider primaryColor={primaryColor} onAccountRequired={openAccountRequiredModal} language={language}>
			{children}
		</SettingsProvider>
	);
}

// Keeps the shared repo-depkit-common-ui ThemeProvider (used by components ported
// from/shared with the other apps, e.g. CustomMarkdown) in sync with the app's own
// redux-driven theme selection (`@/hooks/useTheme`, still the source of truth for the
// rest of the app's chrome) - otherwise it would default to following the OS scheme
// only, ignoring an explicit light/dark override the user made in Settings.
// Keeps the app language and profiles.language in line (see useLanguageProfileSync). Mounted
// inside the PersistGate, so it sees the language stored on the device, also before the login.
function LanguageProfileSyncBridge() {
	useLanguageProfileSync();
	useUniversityStatusTracking();
	return null;
}

function ThemeSyncBridge() {
	const selectedTheme = useAppSelector((state) => state.settings.selectedTheme);
	const { setThemeMode } = useCommonUiTheme();

	useEffect(() => {
		setThemeMode(selectedTheme as 'light' | 'dark' | 'systematic');
	}, [selectedTheme, setThemeMode]);

	return null;
}

// Screen readers pick their voice and pronunciation from <html lang>. Expo's web
// export hardcodes "en", so keep it in sync with the language the app shows
// (WCAG 3.1.1 Language of Page).
function DocumentLanguageBridge() {
	const language = useAppSelector((state) => state.settings.language);

	useEffect(() => {
		if (Platform.OS !== 'web' || typeof document === 'undefined' || !language) return;
		document.documentElement.lang = language;
	}, [language]);

	return null;
}

/**
 * Keeps the whole app clear of what the system draws along the left and right
 * edge: the notch of a phone held sideways, and above all the upright status
 * bar of the iPhone Duo, which takes 84 pt on one side.
 *
 * It is done once, here, instead of in every screen: most screens never thought
 * about side insets and put rows, buttons and chevrons under that bar. The
 * insets are consumed at this point, so everything below sees none on the
 * sides and a frame that is as wide as the space really left. Screens and
 * headers that do respect insets therefore do not apply them a second time.
 */
function SideSafeArea({ backgroundColor, children }: { backgroundColor: string; children: React.ReactNode }) {
	const insets = useSafeAreaInsets();
	const frame = useSafeAreaFrame();
	const innerInsets = useMemo(() => ({ ...insets, left: 0, right: 0 }), [insets]);
	const innerFrame = useMemo(
		() => ({ ...frame, x: frame.x + insets.left, width: Math.max(0, frame.width - insets.left - insets.right) }),
		[frame, insets.left, insets.right]
	);

	// The same views with and without insets: a different tree would remount the
	// whole app, and lose its state, whenever the device is turned.
	return (
		<View style={{ flex: 1, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor }}>
			{/* Clipped, because things parked beside the screen (the closed drawer)
			    would otherwise show in the strip that is kept free. The clipping
			    needs its own view: a view clips at its padding edge, not inside it. */}
			<View style={{ flex: 1, overflow: 'hidden' }}>
				<SafeAreaFrameContext.Provider value={innerFrame}>
					<SafeAreaInsetsContext.Provider value={innerInsets}>{children}</SafeAreaInsetsContext.Provider>
				</SafeAreaFrameContext.Provider>
			</View>
		</View>
	);
}

export default function Layout() {
	const { theme } = useTheme();
	useThemeStatusBar();
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

	useAppIconBadgeReset();
	useEffect(() => {
		NotificationHelper.showNotificationsWhileAppIsOpen().catch(error => {
			console.log('Layout: could not set up showing notifications while the app is open', error);
		});
	}, []);

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
			<IphoneDuoSimulation>
			<ExpoUpdateLoader>
				<Provider store={configureStore}>
					<GluestackUIProvider config={config}>
						<PersistGate loading={null} persistor={persistor}>
							<RootSiblingParent>
								<ThemeProvider>
									<ThemeSyncBridge />
									<LanguageProfileSyncBridge />
									<DocumentLanguageBridge />
									<ModalContextProvider>
										<AppSettingsProvider>
											<ModalRenderer>
												<ServerStatusLoader>
													<ExpoUpdateChecker>
														<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: theme.screen.iconBg }}>
															<SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.iconBg }} edges={pathname?.includes('image-full-screen') ? ['bottom'] : ['top', 'bottom']}>
															<SideSafeArea backgroundColor={pathname?.includes('login') ? theme.login.background : theme.screen.background}>
																{/* Main landmark: on web all page content must sit inside a landmark (axe region / landmark-one-main). */}
																<View role="main" style={{ flex: 1 }}>
																	<AppDownloadBanner />
																	<MaintenanceBanner />
																	<Slot />
																</View>
																{/* The WebView the text recognition runs in on a device; renders nothing until a scan asks for it. */}
																<TextRecognitionWebViewHost />
															</SideSafeArea>
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
			</IphoneDuoSimulation>
		</GestureHandlerRootView>
	);
}
