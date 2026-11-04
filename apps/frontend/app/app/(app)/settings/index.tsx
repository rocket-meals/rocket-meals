import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MyImage from '@/components/MyImage';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import { Languages } from './types';
import { AntDesign, Entypo, Feather, FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons';
import { horizontalScreenPadding, isWeb } from '@/constants/Constants';
import SettingsList from '@/components/SettingsList';
import SettingsListEditable from '@/components/SettingsListEditable';
import SettingsListBoolean from '@/components/SettingsListBoolean/SettingsListBoolean';
import { useUpdateCheckModal } from '@/hooks/useUpdateCheckModal';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import useMyScrollviewTextInputModal from '@/hooks/useMyScrollviewTextInputModal';
import { router } from 'expo-router';
import { ConfigCustomerEnum, getCustomerEnumForConfig, type CustomerConfig, getVersionInternalForAppsettingsScreen } from '@/config';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { useLanguage } from '@/hooks/useLanguage';
import useCustomerServerUrl from '@/hooks/useCustomerServerUrl';
import { RESET_ALL_COLLECTIBLE_EVENT_DICTS, SET_COLLECTIBLE_ITEM_SIZE, SET_COLLECTIBLE_RANDOM_POSITION, SET_DEBUG_MODE, SET_FOODOFFERS_NEXT_DAY_THRESHOLD, SET_NICKNAME_LOCAL, SET_SELECTED_CUSTOMER, SET_SIMULATE_EXPO_UPDATE_AVAILABLE, SET_SIMULATE_FEATURE_WISHES_ENABLED, SET_SHOW_FOOD_FEEDBACK_CHATS_IN_CHATS, SET_USE_WEBP_FOR_ASSETS, UPDATE_DEVELOPER_MODE, UPDATE_MANAGEMENT, UPDATE_PROFILE, SET_OSM_VECTOR_MAP_STYLE_KEY, SET_OSM_VECTOR_MAP_CONSENT } from '@/redux/Types/types';
import { performLogout } from '@/helper/logoutHelper';
import { sqliteKeyValueStorage, migrateAsyncStorageToSqlite } from '@/redux/storage/sqliteStorage';
import FoodOffersNextDayTimeSheet from '@/components/FoodOffersNextDayTimeSheet';
import { DEFAULT_ASSET_IMAGE_QUALITY, formatPrice, getImageUrl, showFormatedPrice } from '@/constants/HelperFunctions';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { ServerAPI } from '@/redux/actions';
import { TranslationKeys } from '@/locales/keys';
import { useFeatureWishesMode } from '@/hooks/useFeatureWishesMode';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import useTrackScreenOpened from '@/hooks/useTrackScreenOpened';
import { AppUsageEventNames, CollectibleAt, DatabaseTypes, CampusSortOption, FeatureWishHelper, GuestAccountHelper } from 'repo-depkit-common';
import { ServerInfoHelper } from '@/helper/ServerInfoHelper';
import { UserHelper } from '@/helper/UserHelper';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import DebugView from '@/components/DebugView';
import SettingsListSessionDebug from '@/components/SettingsListSessionDebug';
import DropdownInput from '@/components/DropdownInput/DropdownInput';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import useToast from '@/hooks/useToast';
import { useLanguageModal } from '@/hooks/useLanguageModal';
import useConfirmLogoutModal from '@/hooks/useConfirmLogoutModal';
import useAccountRequiredModal from '@/hooks/useAccountRequiredModal';
import useLogoutButtonTranslation from '@/hooks/useLogoutButtonTranslation';
import useCustomerConfig from '@/hooks/useCustomerConfig';
import useCustomerConfigModal from '@/hooks/useCustomerConfigModal';
import useFoodofferSortingModal from '@/hooks/useFoodofferSortingModal';
import useThemeSettingsModal from '@/hooks/useThemeSettingsModal';
import useMenuPositionModal from '@/hooks/useMenuPositionModal';
import useImageQualityModal from '@/hooks/useImageQualityModal';
import useCardColumnsModal from '@/hooks/useCardColumnsModal';
import useFirstDayOfWeekModal from '@/hooks/useFirstDayOfWeekModal';
import useHousingSortingModal from '@/hooks/useHousingSortingModal';
import useHousingSettingsRows from '@/hooks/useHousingSettingsRows';
import useFoodofferSettingsRows from '@/hooks/useFoodofferSettingsRows';
import SettingsGroupRows, { SettingsGroupRow } from '@/components/SettingsGroupRows';
import { matchesSearch, normalizeSearchText } from '@/helper/SettingsSearchHelper';
import useCampusSortingModal from '@/hooks/useCampusSortingModal';
import useMyScrollviewModalChangeMyCanteenSelection from '@/hooks/useMyScrollviewModalChangeMyCanteenSelection';
import useCanteenVisitsVisibilityModal from '@/hooks/useCanteenVisitsVisibilityModal';
import useAppRatingScore from '@/hooks/useAppRatingScore';
import { useMyScrollviewModalPriceGroupSettings } from '@/hooks/useMyScrollviewModalPriceGroupSettings';
import { MapStyleKey, SettingsListMyMapThemeSelection, MyAvatar, SettingsListSqliteStorage } from 'repo-depkit-common-ui';
import { formatBytes, getAsyncStorageUsage, clearAsyncStorage, AsyncStorageKeyUsage } from '@/helper/AsyncStorageUsageHelper';
import { FriendsContent } from '@/components/FriendsContent';
import { ComponentIds } from '@/constants/ComponentIds';
import { useAvatarProfileEditor, AVATAR_BACKGROUND, AVATAR_SETTINGS_ROW_SIZE } from '@/hooks/useAvatarProfileEditor';
import { useFeatureWishesModal } from '@/components/FeatureWishes/useFeatureWishesModal';

type CollectibleItemSize = 'small' | 'medium' | 'large';

const ListItemSeparator = () => <View style={{ height: 10 }} />;

type SettingsListItem = { key: string; element: React.ReactElement };

/** One group of the settings screen. While searching, only its rows that match are shown, all of them when its title matches. */
type SettingsSection = {
	key: string;
	title: string;
	titleNativeID?: string;
	/** Additional words the group title is found by. */
	searchText?: string;
	rows: (SettingsGroupRow | null | undefined | false)[];
};

const SECTION_STYLE = { gap: 10 } as const;
const GROUP_STYLE = { gap: 0 } as const;

const settingsRow = (key: string, searchText: string, render: SettingsGroupRow['render']): SettingsGroupRow => ({ key, searchText, render });

function resolveColorSchemeLabel(selectedTheme: string, translate: (key: string) => string): string {
	if (selectedTheme === 'systematic') {
		return translate(TranslationKeys.color_scheme_system);
	} else if (selectedTheme === 'dark') {
		return translate(TranslationKeys.color_scheme_dark);
	}
	return translate(TranslationKeys.color_scheme_light);
}

function resolveDrawerPositionLabel(drawerPosition: string, translate: (key: string) => string): string {
	if (drawerPosition === 'left') {
		return translate(TranslationKeys.drawer_config_position_left);
	} else if (drawerPosition === 'right') {
		return translate(TranslationKeys.drawer_config_position_right);
	}
	return translate(TranslationKeys.drawer_config_position_system);
}

function resolveAmountColumnsLabel(amountColumns: number, translate: (key: string) => string): string {
	return amountColumns === 0 ? translate(TranslationKeys.automatic) : String(amountColumns);
}

/** The logout row closes the group for guests, opens it above "delete account" for registered users, and stands alone otherwise. */
function resolveLogoutGroupPosition(isGuestUser: boolean, isRegisteredUser: boolean): 'top' | 'bottom' | 'single' {
	if (isGuestUser) {
		return 'bottom';
	}
	return isRegisteredUser ? 'top' : 'single';
}

function resolveAccountDebugValue(isRegisteredUser: boolean, isGuestUser: boolean, userId: string | undefined, translate: (key: string) => string): string | undefined {
	if (!isRegisteredUser) {
		return translate(TranslationKeys.without_account);
	}
	return isGuestUser ? translate(TranslationKeys.guest_account) : userId;
}

const Settings = () => {
        useSetPageTitle(TranslationKeys.settings);
        useTrackScreenOpened(AppUsageEventNames.SETTINGS_SCREEN_OPENED, 'settings');
        const { theme, setThemeMode } = useTheme();
        const dispatch = useDispatch();
        const toast = useToast();
        const { translate, translationLanguage } = useLanguage();
        const [searchQuery, setSearchQuery] = useState('');
        const collectibleSettingsModalRef = useRef<() => void>(() => {});
        const isOpeningNestedCollectibleModal = useRef(false);
        const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
        const { openConfirmLogoutModal } = useConfirmLogoutModal();
        const { openAccountRequiredModal } = useAccountRequiredModal();
        const { openUpdateCheckModal } = useUpdateCheckModal();
        const { user, profile, termsAndPrivacyConsentAcceptedDate, isManagement, isDevMode } = useAppSelector((state) => state.authReducer);
        const isRegisteredUser = UserHelper.isRegisteredUser(user);
        const isGuestUser = isRegisteredUser && GuestAccountHelper.isGuestEmail(user?.email);
        const { buttonLabel: logoutButtonLabel } = useLogoutButtonTranslation();
        const { openLanguageModal } = useLanguageModal();
        const { openFoodofferSortingModal } = useFoodofferSortingModal();
        const { openThemeSettingsModal } = useThemeSettingsModal();
        const { openMenuPositionModal } = useMenuPositionModal();
        const { openCardColumnsModal } = useCardColumnsModal();
        const { openFirstDayOfWeekModal } = useFirstDayOfWeekModal();
        const { openHousingSortingModal } = useHousingSortingModal();
        const { openCampusSortingModal } = useCampusSortingModal();
        const { openChangeMyCanteenSelectionModal } = useMyScrollviewModalChangeMyCanteenSelection();
        const { openCanteenVisitsVisibilityModal } = useCanteenVisitsVisibilityModal();
        const { score: appRatingScore, setScore: setAppRatingScore, showDebugRatingModal, appRatingData } = useAppRatingScore();
        const { openPriceGroupSettingsModal } = useMyScrollviewModalPriceGroupSettings();
        const { openImageQualityModal } = useImageQualityModal();
        const openEatingHabits = useCallback(() => router.navigate('/eating-habits'), []);
        const foodofferSettingsRows = useFoodofferSettingsRows({
                onCanteen: openChangeMyCanteenSelectionModal,
                onPriceGroup: openPriceGroupSettingsModal,
                onEatingHabits: openEatingHabits,
                onSort: openFoodofferSortingModal,
                iconSize: 24,
                withNativeIds: true,
        });
        const housingSettingsRows = useHousingSettingsRows({ onSort: openHousingSortingModal, iconSize: 24 });

        const { avatarConfig: settingsAvatarConfig, openEditor: openAvatarEditor } = useAvatarProfileEditor();

        const openFriendsModal = useCallback(() => {
                showScrollViewModal({
                        title: translate(TranslationKeys.friendships),
                        children: <FriendsContent showHeading={false} />,
                        disableHorizontalPadding: true,
                });
        }, [showScrollViewModal, translate]);

        const { primaryColor, drawerPosition, selectedTheme, nickNameLocal, firstDayOfTheWeek, amountColumnsForcard, serverInfo, appSettings, useWebpForAssets, assetImageQuality, foodOffersNextDayThreshold, debugMode, simulateExpoUpdateAvailable, simulateFeatureWishesEnabled, showFoodFeedbackChatsInChats, collectibleItemSize, collectibleRandomPosition, selectedCustomer, campusesSortBy } = useAppSelector((state) => state.settings);
        const featureWishesMode = useFeatureWishesMode();
        const osmVectorMapStyleKey = useAppSelector((state) => ((state.settings as any).osmVectorMapStyleKey ?? MapStyleKey.DEFAULT) as MapStyleKey);
        const osmConsent = useAppSelector((state) => ((state.settings as any).osmVectorMapConsent ?? false) as boolean);
        const canteenVisitsVisibility = useAppSelector((state) => (state.settings as any).canteenVisits?.visibility ?? 'all') as 'all' | 'friends_only' | 'off';
        const { friendships } = useAppSelector((state) => state.friendships);
        const acceptedFriendsCount = useMemo(
                () => friendships.filter((f) => f.friendship_status === 'accepted').length,
                [friendships]
        );
        const currentNickname = useMemo(
                () => (profile?.id ? profile?.nickname ?? '' : nickNameLocal ?? ''),
                [nickNameLocal, profile?.id, profile?.nickname]
        );
        const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
        const profileHelper = useMemo(() => new ProfileHelper(), []);
        const customerConfig = useCustomerConfig();
        const { openCustomerConfigModal } = useCustomerConfigModal();
        const { openTextInputModal } = useMyScrollviewTextInputModal();

        // The store holds the full code ("de-DE"), the names are keyed by the language ("de").
        const languageName = Languages[translationLanguage as keyof typeof Languages];

        const selectedCustomerDisplayName = useMemo(
                () => customerConfig.projectName || selectedCustomer || '',
                [customerConfig.projectName, selectedCustomer]
        );

        const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;
        const campus_area_color = appSettings?.campus_area_color ? appSettings?.campus_area_color : primaryColor;

        const customerServerUrl = useCustomerServerUrl();

        const collectibleSizeOptions = useMemo(
                () => [
                        { value: 'small', label: translate(TranslationKeys.collectible_event_item_size_small) },
                        { value: 'medium', label: translate(TranslationKeys.collectible_event_item_size_medium) },
                        { value: 'large', label: translate(TranslationKeys.collectible_event_item_size_large) },
                ],
                [translate]
        );

        const collectibleSizeLabel = useMemo(
                () => collectibleSizeOptions.find(option => option.value === collectibleItemSize)?.label || '',
                [collectibleItemSize, collectibleSizeOptions]
        );


        const campusSortingOptionLabels: Partial<Record<CampusSortOption, string>> = useMemo(
                () => ({
                        [CampusSortOption.INTELLIGENT]: 'sort_option_intelligent',
                        [CampusSortOption.DISTANCE]: 'sort_option_distance',
                        [CampusSortOption.LAST_OPENED]: 'sort_option_last_opened',
                        [CampusSortOption.ALPHABETICAL]: 'sort_option_alphabetical',
                        [CampusSortOption.NONE]: 'sort_option_none',
                }),
                []
        );

        const campusSortingLabel = useMemo(
                () => translate(campusSortingOptionLabels[campusesSortBy as CampusSortOption] ?? 'sort_option_none'),
                [campusSortingOptionLabels, campusesSortBy, translate]
        );

        const canteenVisitsVisibilityLabel = useMemo(() => {
                switch (canteenVisitsVisibility) {
                        case 'all':
                                return translate(TranslationKeys.canteen_visits_visibility_all);
                        case 'friends_only':
                                return translate(TranslationKeys.canteen_visits_visibility_friends_only);
                        case 'off':
                                return translate(TranslationKeys.canteen_visits_visibility_off);
                        default:
                                return translate(TranslationKeys.canteen_visits_visibility_all);
                }
        }, [canteenVisitsVisibility, translate]);

        const saveNickname = useCallback(
                async (value: string) => {
                        const nextNickname = value?.trim?.() ?? '';
                        if (isRegisteredUser) {
                                const result = (await profileHelper.updateProfile({
                                        ...profile,
                                        nickname: nextNickname,
                                })) as DatabaseTypes.Profiles;
                                if (result) {
                                        dispatch({
                                                type: UPDATE_PROFILE,
                                                payload: result,
                                        });
                                }
                        } else {
                                dispatch({
                                        type: SET_NICKNAME_LOCAL,
                                        payload: nextNickname,
                                });
                        }
                },
                [dispatch, isRegisteredUser, profile, profileHelper]
        );

	useEffect(() => {
		const onChange = ({ window }: { window: any }) => {
			setWindowWidth(window.width);
		};

		const subscription = Dimensions.addEventListener('change', onChange);
		return () => {
			subscription.remove();
		};
	}, []);

        const openNicknameSheet = useCallback(() => {
                openTextInputModal({
                        title: translate(TranslationKeys.nickname),
                        placeholder: translate(TranslationKeys.nickname),
                        initialValue: currentNickname,
                        saveLabel: translate(TranslationKeys.save),
                        onSave: saveNickname,
                        checkTextInput: value => ({
                                isValid: true,
                                value: value.trim(),
                        }),
                });
        }, [currentNickname, openTextInputModal, saveNickname, translate]);

        const handleTheme = (theme: any) => {
                setThemeMode(theme);
        };

        const openColorSchemeSheet = useCallback(() => {
                openThemeSettingsModal({
                        selectedTheme,
                        onSelect: handleTheme,
                });
        }, [handleTheme, openThemeSettingsModal, selectedTheme]);

        const openFoodOffersTimeSheet = () => {
                showScrollViewModal({
                        title: translate(TranslationKeys.foodoffers_next_day_time),
                        children: (
                                <FoodOffersNextDayTimeSheet
                                        closeSheet={closeScrollViewModal}
                                        initialValue={foodOffersNextDayThreshold}
                                        onSave={value => {
                                                dispatch({
                                                        type: SET_FOODOFFERS_NEXT_DAY_THRESHOLD,
                                                        payload: value,
                                                });
                                                closeScrollViewModal();
                                        }}
                                />
                        ),
                });
        };

        const openAppRatingScoreSheet = useCallback(() => {
                openTextInputModal({
                        title: 'App Rating Score',
                        placeholder: '0',
                        initialValue: String(appRatingScore),
                        saveLabel: translate(TranslationKeys.save),
                        onSave: (value: string) => {
                                const parsed = Number.parseInt(value, 10);
                                if (!Number.isNaN(parsed) && parsed >= 0) {
                                        setAppRatingScore(parsed);
                                }
                        },
                        checkTextInput: (value: string) => {
                                const parsed = Number.parseInt(value, 10);
                                return {
                                        isValid: !Number.isNaN(parsed) && parsed >= 0,
                                        value: value.trim(),
                                };
                        },
                });
        }, [appRatingScore, openTextInputModal, setAppRatingScore, translate]);

        const handleSelectServer = useCallback(
                async (config: CustomerConfig) => {
                        ServerAPI.updateServerUrl(config.server_url);
                        await sqliteKeyValueStorage.setItem('server_url_custom', config.server_url);
                        const selectedCustomer = getCustomerEnumForConfig(config) ?? ConfigCustomerEnum.TEST;
                        dispatch({
                                type: SET_SELECTED_CUSTOMER,
                                payload: selectedCustomer,
                        });
                        await sqliteKeyValueStorage.setItem('selected_customer_enum', selectedCustomer);
                        await performLogout(dispatch, router);
                },
                [dispatch, router]
        );

        const openServerSheet = useCallback(() => {
                openCustomerConfigModal({
                        selectedServer: customerServerUrl,
                        onSelect: handleSelectServer,
                });
        }, [customerServerUrl, handleSelectServer, openCustomerConfigModal]);

        const toggleWebpForAssets = () => {
                dispatch({
                        type: SET_USE_WEBP_FOR_ASSETS,
                        payload: !useWebpForAssets,
                });
        };

        const toggleDebugMode = () => {
                dispatch({
                        type: SET_DEBUG_MODE,
                        payload: !debugMode,
                });
        };

        const [asyncStorageUsage, setAsyncStorageUsage] = useState<AsyncStorageKeyUsage[]>([]);
        const [asyncStorageUsageTotalBytes, setAsyncStorageUsageTotalBytes] = useState(0);
        const [isMigratingStorage, setIsMigratingStorage] = useState(false);
        const [isClearingAsyncStorage, setIsClearingAsyncStorage] = useState(false);
        const [sqliteStorageRefreshSignal, setSqliteStorageRefreshSignal] = useState(0);

        const refreshAsyncStorageUsage = useCallback(async () => {
                try {
                        const { items, totalBytes } = await getAsyncStorageUsage();
                        setAsyncStorageUsage(items);
                        setAsyncStorageUsageTotalBytes(totalBytes);
                } catch (error) {
                        console.error('Error reading AsyncStorage usage:', error);
                }
        }, []);

        // Storage size only matters for debugging - only read it once debug mode is on, not
        // on every settings screen visit. AsyncStorage should end up near-empty on native
        // once the migration into sqlite has run - showing it here next to "SQLite gesamt"
        // (rendered by SettingsListSqliteStorage, which reads its own usage on mount) makes a
        // stuck/incomplete migration visible instead of silent.
        useEffect(() => {
                if (debugMode) {
                        refreshAsyncStorageUsage();
                }
        }, [debugMode, refreshAsyncStorageUsage]);

        const openAsyncStorageKeysSheet = useCallback(() => {
                showScrollViewModal({
                        title: 'AsyncStorage Keys',
                        children: (
                                <View style={{ gap: 8 }}>
                                        {asyncStorageUsage.length === 0 ? (
                                                <Text style={{ color: theme.screen.text }}>Keine Einträge</Text>
                                        ) : (
                                                asyncStorageUsage.map((item) => (
                                                        <SettingsList
                                                                key={item.key}
                                                                iconBgColor={primaryColor}
                                                                leftIcon={<MaterialCommunityIcons name="key-outline" size={24} color={theme.screen.icon} />}
                                                                label={item.key}
                                                                value={formatBytes(item.bytes)}
                                                                groupPosition="middle"
                                                        />
                                                ))
                                        )}
                                </View>
                        ),
                });
        }, [asyncStorageUsage, primaryColor, theme.screen.icon, theme.screen.text, showScrollViewModal]);

        const handleMigrateStorage = useCallback(async () => {
                setIsMigratingStorage(true);
                try {
                        const { migratedKeys } = await migrateAsyncStorageToSqlite();
                        await refreshAsyncStorageUsage();
                        setSqliteStorageRefreshSignal((value) => value + 1);
                        toast(
                                migratedKeys.length > 0
                                        ? `${migratedKeys.length} Einträge migriert: ${migratedKeys.join(', ')}`
                                        : 'Keine Einträge mehr in AsyncStorage',
                                'success'
                        );
                } catch (error) {
                        console.error('Error migrating AsyncStorage to sqlite:', error);
                        toast('Migration fehlgeschlagen', 'error');
                } finally {
                        setIsMigratingStorage(false);
                }
        }, [refreshAsyncStorageUsage, toast]);

        const handleClearAsyncStorage = useCallback(() => {
                Alert.alert(
                        'AsyncStorage löschen',
                        'Löscht nur AsyncStorage (nicht SQLite) - zum Testen/Debuggen der Migration. Fortfahren?',
                        [
                                { text: translate(TranslationKeys.cancel), style: 'cancel' },
                                {
                                        text: 'Löschen',
                                        style: 'destructive',
                                        onPress: async () => {
                                                setIsClearingAsyncStorage(true);
                                                try {
                                                        await clearAsyncStorage();
                                                        await refreshAsyncStorageUsage();
                                                        toast('AsyncStorage geleert', 'success');
                                                } catch (error) {
                                                        console.error('Error clearing AsyncStorage:', error);
                                                        toast('Löschen fehlgeschlagen', 'error');
                                                } finally {
                                                        setIsClearingAsyncStorage(false);
                                                }
                                        },
                                },
                        ]
                );
        }, [refreshAsyncStorageUsage, toast, translate]);

        const handleSqliteStorageCleared = useCallback(() => {
                toast('SQLite geleert', 'success');
        }, [toast]);

        const handleSqliteStorageClearError = useCallback(() => {
                toast('Löschen fehlgeschlagen', 'error');
        }, [toast]);

        const toggleSimulateExpoUpdate = () => {
                dispatch({
                        type: SET_SIMULATE_EXPO_UPDATE_AVAILABLE,
                        payload: !simulateExpoUpdateAvailable,
                });
        };

        const toggleSimulateFeatureWishes = () => {
                dispatch({
                        type: SET_SIMULATE_FEATURE_WISHES_ENABLED,
                        payload: !simulateFeatureWishesEnabled,
                });
        };

        const toggleShowFoodFeedbackChatsInChats = () => {
                dispatch({
                        type: SET_SHOW_FOOD_FEEDBACK_CHATS_IN_CHATS,
                        payload: !showFoodFeedbackChatsInChats,
                });
        };

        /** Debug: forgets which reactions to food feedbacks were seen, so the hint above the food offers shows them again. */
        const foodFeedbackReactionsSeenUntil = (profile as DatabaseTypes.Profiles | undefined)?.food_feedback_reactions_seen_until ?? null;
        const handleResetFoodFeedbackReactionsSeen = useCallback(async () => {
                if (!profile?.id) {
                        return;
                }
                dispatch({ type: UPDATE_PROFILE, payload: { ...profile, food_feedback_reactions_seen_until: null } });
                try {
                        await profileHelper.updateFoodFeedbackReactionsSeenUntil(profile.id, null);
                        toast(translate(TranslationKeys.reset), 'success');
                } catch (error) {
                        console.error('Resetting the seen reactions to food feedbacks failed:', error);
                        toast(translate(TranslationKeys.error), 'error');
                }
        }, [dispatch, profile, profileHelper, toast, translate]);

        const handleResetCollectibles = useCallback(() => {
                dispatch({ type: RESET_ALL_COLLECTIBLE_EVENT_DICTS });
                toast(translate(TranslationKeys.reset), 'success');
        }, [dispatch, toast, translate]);

        const handleSelectCollectibleSize = useCallback(
                (_id: string, value: string) => {
                        const nextSize = (collectibleSizeOptions.find(option => option.label === value)?.value || collectibleItemSize || 'medium') as CollectibleItemSize;
                        dispatch({
                                type: SET_COLLECTIBLE_ITEM_SIZE,
                                payload: nextSize,
                        });
                },
                [collectibleItemSize, collectibleSizeOptions, dispatch]
        );

        const toggleCollectibleRandomPosition = useCallback(() => {
                dispatch({
                        type: SET_COLLECTIBLE_RANDOM_POSITION,
                        payload: !collectibleRandomPosition,
                });
        }, [collectibleRandomPosition, dispatch]);

        const handleCheckForUpdates = () => {
                openUpdateCheckModal();
        };

        const handleLogout = useCallback(() => openConfirmLogoutModal(), [openConfirmLogoutModal]);

        const handleLogin = useCallback(() => openConfirmLogoutModal(), [openConfirmLogoutModal]);

        const logoutButtonHandler = useMemo(() => (isRegisteredUser ? handleLogout : handleLogin), [handleLogin, handleLogout, isRegisteredUser]);

	const handleDeleteAccount = () => {
		router.navigate('/(user)/delete-user');
	};


        const openCollectibleSizeModal = useCallback(() => {
                showScrollViewModal(
                        {
                                title: translate(TranslationKeys.collectible_event_item_size),
                                onClose: () => {
                                        if (isOpeningNestedCollectibleModal.current) {
                                                isOpeningNestedCollectibleModal.current = false;
                                                return;
                                        }

                                        setTimeout(() => collectibleSettingsModalRef.current?.(), 150);
                                },
                                children: (
                                        <View style={{ gap: 16 }}>
                                                <DropdownInput
                                                        id="collectible_item_size"
                                                        value={collectibleSizeLabel}
                                                        onChange={handleSelectCollectibleSize}
                                                        error={undefined}
                                                        isDisabled={false}
                                                        custom_type="collectible_item_size"
                                                        options={collectibleSizeOptions.map(option => option.label)}
                                                        allowCustomValues={false}
                                                        onOpenSheet={() => {
                                                                isOpeningNestedCollectibleModal.current = true;
                                                        }}
                                                        onCloseSheet={() => {
                                                                isOpeningNestedCollectibleModal.current = false;
                                                                setTimeout(() => collectibleSettingsModalRef.current?.(), 150);
                                                        }}
                                                />
                                        </View>
                                ),
                        },
                        {}
                );
        }, [collectibleSizeLabel, collectibleSizeOptions, handleSelectCollectibleSize, showScrollViewModal, translate]);

        const { openFeatureWishesModal } = useFeatureWishesModal();

        const openCollectibleSettingsModal = useCallback(() => {
                showScrollViewModal(
                        {
                                title: translate(TranslationKeys.collectible_event_settings),
                                children: (
                                        <View style={{ gap: 0 }}>
                                                <SettingsList
                                                        iconBgColor={primaryColor}
                                                        leftIcon={<MaterialCommunityIcons name="backup-restore" size={24} color={theme.screen.icon} />}
                                                        label={translate(TranslationKeys.collectible_event_reset_collected)}
                                                        rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
                                                        handleFunction={handleResetCollectibles}
                                                        groupPosition="top"
                                                />
                                                <SettingsList
                                                        iconBgColor={primaryColor}
                                                        leftIcon={<MaterialCommunityIcons name="image-size-select-large" size={24} color={theme.screen.icon} />}
                                                        label={translate(TranslationKeys.collectible_event_item_size)}
                                                        value={collectibleSizeLabel}
                                                        rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
                                                        handleFunction={openCollectibleSizeModal}
                                                        groupPosition="middle"
                                                />
                                                <SettingsListBoolean
                                                        iconBgColor={primaryColor}
                                                        leftIcon={<MaterialIcons name="my-location" size={24} color={theme.screen.icon} />}
                                                        label={translate(TranslationKeys.collectible_event_random_position)}
                                                        isEnabled={collectibleRandomPosition}
                                                        onToggle={toggleCollectibleRandomPosition}
                                                        groupPosition="bottom"
                                                />
                                        </View>
                                ),
                        },
                        {}
                );
        }, [collectibleRandomPosition, collectibleSizeLabel, handleResetCollectibles, openCollectibleSizeModal, primaryColor, showScrollViewModal, theme.screen.icon, theme.screen.iconBg, theme.screen.text, translate, toggleCollectibleRandomPosition]);

        useEffect(() => {
                collectibleSettingsModalRef.current = openCollectibleSettingsModal;
        }, [openCollectibleSettingsModal]);

	const showFriendsInSettings = !!(appSettings?.friends_enabled || isDevMode);

	const { sections, trailingItems } = useMemo(() => {
		const chevron = <Octicons name="chevron-right" size={24} color={theme.screen.icon} />;

		// === Personalization ===
		const personalizationSection: SettingsSection = {
			key: 'section-account',
			title: translate(TranslationKeys.group_personalization),
			rows: [
				settingsRow('avatar', translate(TranslationKeys.avatar_appearance), groupPosition => (
					<SettingsList
						leftIconComponent={
							settingsAvatarConfig ? (
								<MyAvatar
									config={settingsAvatarConfig}
									size={AVATAR_SETTINGS_ROW_SIZE / 2}
									rounded={true}
									backgroundColor={AVATAR_BACKGROUND}
								/>
							) : (
								<View style={{ width: AVATAR_SETTINGS_ROW_SIZE / 2, height: AVATAR_SETTINGS_ROW_SIZE / 2, borderRadius: AVATAR_SETTINGS_ROW_SIZE / 4, backgroundColor: primaryColor + '22', alignItems: 'center', justifyContent: 'center' }}>
									<MaterialCommunityIcons name="account-outline" size={20} color={theme.screen.icon} />
								</View>
							)
						}
						value={translate(TranslationKeys.avatar_appearance)}
						rightIcon={<MaterialCommunityIcons name="pencil" size={20} color={theme.screen.icon} />}
						handleFunction={() => openAvatarEditor(false)}
						isAccountRequired={!isRegisteredUser}
						onAccountRequired={openAccountRequiredModal}
						groupPosition={groupPosition}
					/>
				)),
				settingsRow('nickname', translate(TranslationKeys.nickname), groupPosition => (
					<SettingsListEditable
						iconBgColor={primaryColor}
						leftIcon={<MaterialCommunityIcons name="account" size={24} color={theme.screen.icon} />}
						label={translate(TranslationKeys.nickname)}
						value={profile?.id ? profile?.nickname ?? undefined : nickNameLocal}
						handleFunction={openNicknameSheet}
						groupPosition={groupPosition}
					/>
				)),
				showFriendsInSettings &&
					settingsRow('friendships', translate(TranslationKeys.friendships), groupPosition => (
						<SettingsList
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="account-multiple-plus" size={24} color={theme.screen.icon} />}
							label={translate(TranslationKeys.friendships)}
							value={String(acceptedFriendsCount)}
							rightIcon={chevron}
							handleFunction={openFriendsModal}
							isAccountRequired={!isRegisteredUser}
							accountRequiredGroupPosition="single"
							onAccountRequired={openAccountRequiredModal}
							groupPosition={groupPosition}
						/>
					)),
				settingsRow('language', translate(TranslationKeys.language), groupPosition => (
					<SettingsList iconBgColor={primaryColor} leftIcon={<Ionicons name="language" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.language)} value={languageName} rightIcon={<MaterialCommunityIcons name="pencil" size={20} color={theme.screen.icon} />} handleFunction={() => openLanguageModal()} groupPosition={groupPosition} nativeID={ComponentIds.SETTINGS_LANGUAGE} />
				)),
			],
		};

		// === Canteen Usage ===
		const canteenSection: SettingsSection = {
			key: 'section-canteen',
			title: translate(TranslationKeys.group_canteen_usage),
			titleNativeID: ComponentIds.SETTINGS_GROUP_CANTEEN_USAGE,
			rows: [
				foodofferSettingsRows.canteen,
				foodofferSettingsRows.priceGroup,
				settingsRow('account-balance', translate(TranslationKeys.accountbalance), (groupPosition, showSeparator) => (
					<SettingsList iconBgColor={foods_area_color} leftIcon={<Ionicons name="card" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.accountbalance)} value={profile?.credit_balance ? showFormatedPrice(formatPrice(profile?.credit_balance)) : '€'} rightIcon={chevron} handleFunction={() => router.navigate('/account-balance')} groupPosition={groupPosition} showSeparator={showSeparator} />
				)),
				foodofferSettingsRows.eatingHabits,
				foodofferSettingsRows.sort,
				foodofferSettingsRows.averageRating,
				showFriendsInSettings &&
					settingsRow('canteen-visits-visibility', translate(TranslationKeys.canteen_visits_visibility), (groupPosition, showSeparator) => (
						<SettingsList
							iconBgColor={foods_area_color}
							leftIcon={<MaterialCommunityIcons name="silverware-fork-knife" size={24} color={theme.screen.icon} />}
							label={translate(TranslationKeys.canteen_visits_visibility)}
							value={canteenVisitsVisibilityLabel}
							rightIcon={chevron}
							handleFunction={openCanteenVisitsVisibilityModal}
							groupPosition={groupPosition}
							showSeparator={showSeparator}
						/>
					)),
				settingsRow('notification', translate(TranslationKeys.own_food_feedbacks_title), (groupPosition, showSeparator) => (
					<SettingsList iconBgColor={foods_area_color} leftIcon={<Ionicons name="star" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.own_food_feedbacks_title)} rightIcon={chevron} handleFunction={() => router.navigate('/notification')} groupPosition={groupPosition} showSeparator={showSeparator} />
				)),
			],
		};

		// === App Settings ===
		const colorSchemeValue = resolveColorSchemeLabel(selectedTheme, translate);
		const drawerPositionValue = resolveDrawerPositionLabel(drawerPosition, translate);
		const appSettingsSection: SettingsSection = {
			key: 'section-app-settings',
			title: translate(TranslationKeys.group_app_settings),
			titleNativeID: ComponentIds.SETTINGS_GROUP_APP_SETTINGS,
			rows: [
				settingsRow('color-scheme', translate(TranslationKeys.color_scheme), groupPosition => (
					<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="theme-light-dark" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.color_scheme)} value={colorSchemeValue} rightIcon={chevron} handleFunction={() => openColorSchemeSheet()} groupPosition={groupPosition} nativeID={ComponentIds.SETTINGS_COLOR_SCHEME} />
				)),
				settingsRow('drawer-position', translate(TranslationKeys.drawer_config_position), groupPosition => (
					<SettingsList iconBgColor={primaryColor} leftIcon={<Entypo name="menu" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.drawer_config_position)} value={drawerPositionValue} rightIcon={chevron} handleFunction={openMenuPositionModal} groupPosition={groupPosition} />
				)),
				settingsRow('amount-columns', translate(TranslationKeys.amount_columns_for_cards), groupPosition => (
					<SettingsList iconBgColor={primaryColor} leftIcon={<FontAwesome5 name="columns" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.amount_columns_for_cards)} value={resolveAmountColumnsLabel(amountColumnsForcard, translate)} rightIcon={chevron} handleFunction={openCardColumnsModal} groupPosition={groupPosition} />
				)),
				settingsRow('first-day-of-week', translate(TranslationKeys.first_day_of_week), groupPosition => (
					<SettingsList iconBgColor={primaryColor} leftIcon={<Feather name="calendar" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.first_day_of_week)} value={translate(firstDayOfTheWeek?.name)} rightIcon={chevron} handleFunction={openFirstDayOfWeekModal} groupPosition={groupPosition} />
				)),
			],
		};

		// === Map settings ===
		const mapSection: SettingsSection = {
			key: 'section-map-settings',
			title: 'Karte',
			searchText: translate(TranslationKeys.map),
			rows: [
				settingsRow('map-variants', `Kartenmaterial ${translate(TranslationKeys.map)}`, groupPosition => (
					<SettingsListMyMapThemeSelection
						selectedMapStyleKey={osmVectorMapStyleKey}
						onMapStyleKeyChange={(key) => dispatch({ type: SET_OSM_VECTOR_MAP_STYLE_KEY, payload: key })}
						osmConsent={osmConsent}
						onOsmConsentChange={(value) => dispatch({ type: SET_OSM_VECTOR_MAP_CONSENT, payload: value })}
						iconBgColor={primaryColor}
						leftIcon={<MaterialCommunityIcons name="map-outline" size={24} color={theme.screen.icon} />}
						label="Kartenmaterial"
						modalTitle="🗺️ Kartenmaterial"
						groupPosition={groupPosition}
						nativeID={ComponentIds.SETTINGS_MAP_VARIANTS}
					/>
				)),
			],
		};

		// === Housing (conditional) ===
		const housingSection: SettingsSection | null = appSettings?.housing_enabled
			? { key: 'section-housing', title: translate(TranslationKeys.housing), rows: housingSettingsRows }
			: null;

		// === Campus (conditional) ===
		const campusSection: SettingsSection | null = appSettings?.campus_enabled
			? {
					key: 'section-campus',
					title: translate(TranslationKeys.campus),
					rows: [
						settingsRow('campus-sort', translate(TranslationKeys.sort), groupPosition => (
							<SettingsList
								iconBgColor={campus_area_color}
								leftIcon={<MaterialIcons name="sort" size={24} color={theme.screen.icon} />}
								label={translate(TranslationKeys.sort)}
								value={campusSortingLabel}
								rightIcon={chevron}
								handleFunction={openCampusSortingModal}
								groupPosition={groupPosition}
							/>
						)),
					],
				}
			: null;

		// === Help & Contact ===
		const helpSection: SettingsSection = {
			key: 'section-help',
			title: translate(TranslationKeys.group_help_and_contact),
			rows: [
				settingsRow('feedback-support-faq', translate(TranslationKeys.feedback_support_faq), groupPosition => (
					<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialIcons name="support-agent" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.feedback_support_faq)} rightIcon={chevron} handleFunction={() => router.navigate('/support-FAQ')} groupPosition={groupPosition} nativeID={ComponentIds.SETTINGS_FEEDBACK_SUPPORT_FAQ} />
				)),
			],
		};

		// === App Management ===
		const managementSection: SettingsSection = {
			key: 'section-management',
			title: translate(TranslationKeys.group_app_management),
			rows: [
				settingsRow('check-for-updates', translate(TranslationKeys.CHECK_FOR_APP_UPDATES), groupPosition => (
					<SettingsList iconBgColor={primaryColor} leftIcon={<Ionicons name="cloud-download-outline" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.CHECK_FOR_APP_UPDATES)} rightIcon={chevron} handleFunction={handleCheckForUpdates} groupPosition={groupPosition} />
				)),
				settingsRow('data-access', translate(TranslationKeys.dataAccess), groupPosition => (
					<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="database-eye" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.dataAccess)} rightIcon={chevron} handleFunction={() => router.navigate('/data-access')} groupPosition={groupPosition} />
				)),
				settingsRow('events', translate(TranslationKeys.events), groupPosition => (
					<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialIcons name="event" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.events)} rightIcon={chevron} handleFunction={() => router.navigate('/events')} groupPosition={groupPosition} />
				)),
				settingsRow('collectible-events', translate(TranslationKeys.collectible_events), groupPosition => (
					<SettingsList
						iconBgColor={primaryColor}
						leftIcon={<MaterialCommunityIcons name="trophy-outline" size={24} color={theme.screen.icon} />}
						label={translate(TranslationKeys.collectible_events)}
						rightIcon={chevron}
						handleFunction={() => router.navigate('/collectible-events')}
						groupPosition={groupPosition}
					/>
				)),
				settingsRow('collectible-event-settings', translate(TranslationKeys.collectible_event_settings), groupPosition => (
					<SettingsList
						iconBgColor={primaryColor}
						leftIcon={<MaterialCommunityIcons name="trophy-outline" size={24} color={theme.screen.icon} />}
						label={translate(TranslationKeys.collectible_event_settings)}
						rightIcon={chevron}
						handleFunction={openCollectibleSettingsModal}
						groupPosition={groupPosition}
					/>
				)),
				FeatureWishHelper.isEnabled(featureWishesMode) &&
					settingsRow('feature-wishes', translate(TranslationKeys.feature_wishes), groupPosition => (
						<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.feature_wishes)} rightIcon={chevron} handleFunction={openFeatureWishesModal} groupPosition={groupPosition} />
					)),
				settingsRow('license-information', translate(TranslationKeys.license_information), groupPosition => (
					<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="license" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.license_information)} rightIcon={chevron} handleFunction={() => router.navigate('/licenseInformation')} groupPosition={groupPosition} />
				)),
				// Terms & Conditions
				settingsRow('terms-and-privacy', translate(TranslationKeys.terms_and_conditions_accepted_and_privacy_policy_read_at_date), groupPosition => (
					<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="file-document-check" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.terms_and_conditions_accepted_and_privacy_policy_read_at_date)} value={termsAndPrivacyConsentAcceptedDate ?? undefined} handleFunction={() => {}} groupPosition={groupPosition} />
				)),
			],
		};

		// === Account (Login/Logout, Delete) ===
		const accountSection: SettingsSection = {
			key: 'section-account-actions',
			title: translate(TranslationKeys.group_account),
			rows: [
				isGuestUser &&
					settingsRow('guest-account', `${translate(TranslationKeys.account)} ${translate(TranslationKeys.guest_account)}`, groupPosition => (
						<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="account-clock-outline" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.account)} value={translate(TranslationKeys.guest_account)} groupPosition={groupPosition} nativeID={ComponentIds.SETTINGS_GUEST_ACCOUNT} />
					)),
				// Guests can't log out and come back - their "log out" deletes the account (see useConfirmLogoutModal).
				settingsRow('logout', logoutButtonLabel, groupPosition => (
					<SettingsList iconBgColor={primaryColor} leftIcon={isGuestUser ? <AntDesign name="user-delete" size={22} color={theme.screen.icon} /> : <Entypo name="login" size={24} color={theme.screen.icon} />} label={logoutButtonLabel} rightIcon={isGuestUser ? chevron : <Entypo name="login" size={24} color={theme.screen.icon} />} handleFunction={logoutButtonHandler} groupPosition={groupPosition} />
				)),
				isRegisteredUser &&
					!isGuestUser &&
					settingsRow('account-delete', translate(TranslationKeys.account_delete), groupPosition => (
						<SettingsList iconBgColor={primaryColor} leftIcon={<AntDesign name="user-delete" size={22} color={theme.screen.icon} />} label={`${translate(TranslationKeys.account_delete)}`} rightIcon={chevron} handleFunction={handleDeleteAccount} groupPosition={groupPosition} />
					)),
			],
		};

		const groupStyle = { gap: 0 } as const;

		// Not searchable: only shown while the search field is empty.
		const trailing: SettingsListItem[] = [
			// === Footer ===
			{
			key: 'footer',
			element: (
				<TouchableOpacity
					style={styles.footer}
					onPress={() => {
						if (isManagement) {
							dispatch({ type: UPDATE_DEVELOPER_MODE, payload: false });
							dispatch({ type: UPDATE_MANAGEMENT, payload: false });
						} else {
							dispatch({ type: UPDATE_DEVELOPER_MODE, payload: true });
							dispatch({ type: UPDATE_MANAGEMENT, payload: true });
						}
					}}
				>
					<View style={styles.logoContainer}>
						<MyImage
							remote_image_url={getImageUrl(serverInfo?.info?.project?.project_logo)}
							style={styles.logo}
						/>
					</View>
					<Text style={{ ...styles.heading, color: theme.drawerHeading }}>{ServerInfoHelper.getServerName(serverInfo, customerConfig)}</Text>
				</TouchableOpacity>
			),
		},
			// === Debug View ===
			{
			key: 'debug-view',
			element: (
				<DebugView
					title={translate(TranslationKeys.debug_mode)}
					showInDevMode={true}
				>
					<Text style={{ ...styles.devModeText, color: theme.screen.text }}>{translate(TranslationKeys.developerModeActive)}</Text>
					<View style={groupStyle}>
						<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="server" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.backend_server)} value={selectedCustomerDisplayName} rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />} handleFunction={openServerSheet} groupPosition="top" />
						<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="clock-outline" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.foodoffers_next_day_time)} value={(foodOffersNextDayThreshold || '18:00').toString()} rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />} handleFunction={openFoodOffersTimeSheet} groupPosition="middle" />
						<SettingsListBoolean
							iconBgColor={primaryColor}
							leftIcon={<MaterialIcons name="image" size={24} color={theme.screen.icon} />}
							label="Use WebP images"
							isEnabled={useWebpForAssets}
							onToggle={toggleWebpForAssets}
							groupPosition="middle"
						/>
						<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialIcons name="high-quality" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.image_quality)} value={String(assetImageQuality || DEFAULT_ASSET_IMAGE_QUALITY)} rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />} handleFunction={openImageQualityModal} groupPosition="middle" />
						<SettingsListBoolean
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="bank-transfer" size={24} color={theme.screen.icon} />}
							label={translate(TranslationKeys.debug_mode)}
							isEnabled={debugMode}
							onToggle={toggleDebugMode}
							groupPosition="middle"
						/>
						<SettingsListBoolean
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="update" size={24} color={theme.screen.icon} />}
							label={translate(TranslationKeys.simulate_expo_update_available)}
							isEnabled={simulateExpoUpdateAvailable}
							onToggle={toggleSimulateExpoUpdate}
							groupPosition="middle"
						/>
						<SettingsListBoolean
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={theme.screen.icon} />}
							label={translate(TranslationKeys.simulate_feature_wishes_enabled)}
							isEnabled={simulateFeatureWishesEnabled}
							onToggle={toggleSimulateFeatureWishes}
							groupPosition="middle"
						/>
						<SettingsListBoolean
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="chat-processing-outline" size={24} color={theme.screen.icon} />}
							label={translate(TranslationKeys.show_food_feedback_chats_in_chats)}
							isEnabled={showFoodFeedbackChatsInChats}
							onToggle={toggleShowFoodFeedbackChatsInChats}
							groupPosition="middle"
						/>
						<SettingsList
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="eye-off-outline" size={24} color={theme.screen.icon} />}
							label={translate(TranslationKeys.reset_food_feedback_reactions_seen)}
							value={foodFeedbackReactionsSeenUntil ? new Date(foodFeedbackReactionsSeenUntil).toLocaleString() : '-'}
							rightIcon={<MaterialCommunityIcons name="restore" size={24} color={theme.screen.icon} />}
							handleFunction={() => void handleResetFoodFeedbackReactionsSeen()}
							groupPosition="middle"
						/>
						<SettingsListEditable
							key={String(appRatingScore)}
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="star-outline" size={24} color={theme.screen.icon} />}
							label="App Rating Score"
							value={String(appRatingScore)}
							handleFunction={openAppRatingScoreSheet}
							groupPosition="middle"
						/>
						<SettingsList
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="clock-outline" size={24} color={theme.screen.icon} />}
							label="Foodoffers Letzter Focus"
							value={appRatingData?.lastFocusTime || '-'}
							groupPosition="middle"
						/>
						<SettingsList
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="history" size={24} color={theme.screen.icon} />}
							label="Letzte Rating-Anfrage"
							value={appRatingData?.lastAskedAt ? new Date(appRatingData.lastAskedAt).toLocaleString() : '-'}
							groupPosition="middle"
						/>
						<SettingsList
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="tag-outline" size={24} color={theme.screen.icon} />}
							label="Letzte Rating App-Version"
							value={appRatingData?.lastAskedAppVersion || '-'}
							groupPosition="middle"
						/>
						<SettingsList
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="star-shooting-outline" size={24} color={theme.screen.icon} />}
							label="Open App Rating Modal"
							value=""
							handleFunction={showDebugRatingModal}
							groupPosition="middle"
						/>
						<SettingsList iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="clipboard-account" size={24} color={theme.screen.icon} />} label={translate(TranslationKeys.account)} value={resolveAccountDebugValue(isRegisteredUser, isGuestUser, user?.id, translate)} handleFunction={() => {}} groupPosition="bottom" />
					</View>
					<View style={groupStyle}>
						<SettingsList
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="database" size={24} color={theme.screen.icon} />}
							label="AsyncStorage gesamt"
							value={formatBytes(asyncStorageUsageTotalBytes)}
							rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
							handleFunction={openAsyncStorageKeysSheet}
							groupPosition="top"
						/>
						<SettingsList
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="refresh" size={24} color={theme.screen.icon} />}
							label="Speicher aktualisieren"
							value=""
							handleFunction={refreshAsyncStorageUsage}
							groupPosition="middle"
						/>
						<SettingsList
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="database-sync-outline" size={24} color={theme.screen.icon} />}
							label="Daten migrieren"
							value={isMigratingStorage ? '...' : ''}
							handleFunction={isMigratingStorage ? undefined : handleMigrateStorage}
							groupPosition="middle"
						/>
						<SettingsList
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="delete-outline" size={24} color={theme.screen.icon} />}
							label="AsyncStorage löschen"
							value={isClearingAsyncStorage ? '...' : ''}
							handleFunction={isClearingAsyncStorage ? undefined : handleClearAsyncStorage}
							groupPosition="bottom"
						/>
					</View>
					<View style={groupStyle}>
						<SettingsListSessionDebug iconBgColor={primaryColor} iconColor={theme.screen.icon} />
					</View>
					<View style={groupStyle}>
						<SettingsListSqliteStorage
							dbName="redux_persist.db"
							iconBgColor={primaryColor}
							iconColor={theme.screen.icon}
							textColor={theme.screen.text}
							refreshSignal={sqliteStorageRefreshSignal}
							onCleared={handleSqliteStorageCleared}
							onClearError={handleSqliteStorageClearError}
						/>
					</View>
				</DebugView>
			),
		},
			// === Version ===
			{
			key: 'version',
			element: (
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="numeric" size={24} color={theme.screen.icon} />}
					label="Version"
					value={getVersionInternalForAppsettingsScreen().toString()}
					handleFunction={() => {}}
					groupPosition="single"
				/>
			),
		},
			// === Collectible Spot ===
			{
			key: 'collectible-spot',
			element: <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_settings} />,
		},
		];

		return {
			sections: [personalizationSection, canteenSection, appSettingsSection, mapSection, housingSection, campusSection, helpSection, managementSection, accountSection].filter((section): section is SettingsSection => !!section),
			trailingItems: trailing,
		};
	}, [
		translate, primaryColor, theme, isRegisteredUser, user?.id, profile, nickNameLocal,
		logoutButtonLabel, logoutButtonHandler, openNicknameSheet, openLanguageModal, languageName,
		handleDeleteAccount, foods_area_color, foodofferSettingsRows, housingSettingsRows,
		openColorSchemeSheet, openMenuPositionModal,
		openCardColumnsModal, openFirstDayOfWeekModal, selectedTheme, drawerPosition,
		amountColumnsForcard, firstDayOfTheWeek, appSettings?.housing_enabled, appSettings?.friends_enabled,
		appSettings?.campus_enabled,
		campus_area_color, campusSortingLabel, openCampusSortingModal, handleCheckForUpdates,
		openCollectibleSettingsModal, termsAndPrivacyConsentAcceptedDate, isManagement, dispatch,
		serverInfo, selectedCustomerDisplayName, foodOffersNextDayThreshold, useWebpForAssets, assetImageQuality, openImageQualityModal,
		debugMode, simulateExpoUpdateAvailable, simulateFeatureWishesEnabled, showFoodFeedbackChatsInChats, foodFeedbackReactionsSeenUntil, handleResetFoodFeedbackReactionsSeen, openServerSheet, openFoodOffersTimeSheet,
		toggleWebpForAssets, toggleDebugMode, toggleSimulateExpoUpdate, toggleSimulateFeatureWishes, toggleShowFoodFeedbackChatsInChats, osmVectorMapStyleKey, osmConsent,
		acceptedFriendsCount, showFriendsInSettings, canteenVisitsVisibilityLabel, openCanteenVisitsVisibilityModal, openFriendsModal, openAccountRequiredModal,
		appRatingScore, openAppRatingScoreSheet, showDebugRatingModal, appRatingData,
		settingsAvatarConfig, openAvatarEditor,
		appSettings?.foods_ratings_average_display,
		featureWishesMode, openFeatureWishesModal,
		sqliteStorageRefreshSignal, handleSqliteStorageCleared, handleSqliteStorageClearError,
		asyncStorageUsageTotalBytes, refreshAsyncStorageUsage, openAsyncStorageKeysSheet,
		isMigratingStorage, handleMigrateStorage,
		isClearingAsyncStorage, handleClearAsyncStorage,
		isGuestUser, logoutButtonHandler, handleDeleteAccount,
	]);

	const listData = useMemo(() => {
		const query = normalizeSearchText(searchQuery);
		const items: SettingsListItem[] = [];
		for (const section of sections) {
			const rows = section.rows.filter((row): row is SettingsGroupRow => !!row);
			const sectionMatches = !query || matchesSearch(`${section.title} ${section.searchText ?? ''}`, query);
			const visibleRows = sectionMatches ? rows : rows.filter(row => matchesSearch(row.searchText, query));
			if (visibleRows.length > 0) {
				items.push({
					key: section.key,
					element: (
						<View style={SECTION_STYLE}>
							<SettingsGroupTitle nativeID={section.titleNativeID}>{section.title}</SettingsGroupTitle>
							<View style={GROUP_STYLE}>
								<SettingsGroupRows rows={visibleRows} />
							</View>
						</View>
					),
				});
			}
		}
		if (!query) {
			items.push(...trailingItems);
		} else if (items.length === 0) {
			items.push({
				key: 'nothing-found',
				element: <Text style={[searchStyles.nothingFound, { color: theme.screen.text }]}>{translate(TranslationKeys.nothing_found)}</Text>,
			});
		}
		return items;
	}, [sections, trailingItems, searchQuery, theme.screen.text, translate]);

	let listWidth: '100%' | '80%' = '100%';
	if (windowWidth >= 500 && isWeb) {
		listWidth = '80%';
	}

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.background }}>
			<View style={[searchStyles.searchBarContainer, { width: listWidth, paddingHorizontal: horizontalScreenPadding }]}>
				<View style={[searchStyles.searchBar, { borderColor: theme.screen.placeholder, backgroundColor: theme.screen.background }]}>
					<MaterialIcons name="search" size={22} color={theme.screen.icon} />
					<TextInput
						style={[searchStyles.searchInput, { color: theme.screen.text }]}
						cursorColor={theme.screen.text}
						placeholderTextColor={theme.screen.placeholder}
						onChangeText={setSearchQuery}
						value={searchQuery}
						placeholder={translate(TranslationKeys.search_settings_here)}
						accessibilityLabel={translate(TranslationKeys.search)}
						autoCorrect={false}
						autoCapitalize="none"
						returnKeyType="search"
						clearButtonMode="never"
						nativeID={ComponentIds.SETTINGS_SEARCH}
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.reset)} hitSlop={10}>
							<MaterialIcons name="close" size={22} color={theme.screen.icon} />
						</TouchableOpacity>
					)}
				</View>
			</View>
			<FlatList
				data={listData}
				keyExtractor={(item) => item.key}
				renderItem={({ item }) => item.element}
				style={[
					styles.container,
					{
						width: listWidth,
						alignSelf: 'center',
					},
				]}
				contentContainerStyle={{
					paddingHorizontal: horizontalScreenPadding,
					paddingTop: 20,
					paddingBottom: 40,
					backgroundColor: theme.screen.background,
				}}
				ItemSeparatorComponent={ListItemSeparator}
				keyboardShouldPersistTaps="handled"
			/>
		</SafeAreaView>
	);
};
export default Settings;

const searchStyles = StyleSheet.create({
	searchBarContainer: {
		alignSelf: 'center',
		paddingTop: 16,
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		height: 46,
		borderRadius: 23,
		borderWidth: 1,
		paddingHorizontal: 16,
	},
	searchInput: {
		flex: 1,
		minWidth: 0,
		height: '100%',
		// The rounded search bar is the focus frame, no extra browser outline on web.
		outlineWidth: 0,
		fontFamily: 'Poppins_400Regular',
		fontSize: 16,
	},
	nothingFound: {
		textAlign: 'center',
		fontFamily: 'Poppins_400Regular',
		fontSize: 16,
		paddingVertical: 20,
	},
});
