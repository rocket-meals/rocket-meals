import React, { useEffect, useMemo, useRef } from 'react';
import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '@/components/Drawer/CustomDrawerContent';
import { useTheme } from '@/hooks/useTheme';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { ErrorBoundaryProps, Redirect, useGlobalSearchParams } from 'expo-router';
import useKioskMode from '@/hooks/useKioskMode';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import {AppScreens, DatabaseTypes, filterPopupEvents, sortBySortField, sortMarkingsByGroup} from 'repo-depkit-common';
import { SET_APP_ELEMENTS, SET_APP_SETTINGS, SET_BUILDINGS_DICT, SET_BUILDINGS_ORGANIZATIONS, SET_BUSINESS_HOURS, SET_BUSINESS_HOURS_GROUPS, SET_CAMPUSES, SET_CAMPUSES_DICT, SET_CANTEENS, SET_CHATS, SET_CHAT_READ_STATUS, SET_COLLECTION_DATES_LAST_UPDATED, SET_FOOD_ATTRIBUTE_GROUPS, SET_FOOD_ATTRIBUTES_DICT, SET_FOOD_CATEGORIES, SET_FOOD_COLLECTION, SET_FOOD_OFFERS_CATEGORIES, SET_FOODOFFERS_INFO_ITEMS, SET_FRIENDSHIPS, SET_COLLECTIBLE_EVENTS, SET_ORGANISATIONS, SET_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES, SET_POPUP_EVENTS, SET_POPUP_EVENTS_HASH, SET_SELECTED_CANTEEN, SET_SELECTED_DATE, SET_WIKIS, UPDATE_FOOD_FEEDBACK_LABELS, UPDATE_MARKING_GROUPS, UPDATE_MARKINGS, UPDATE_OWN_FOOD_FEEDBACK, UPDATE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES, UPDATE_PRIVACY_POLICY_DATE, UPDATE_PROFILE } from '@/redux/Types/types';
import { FoodFeedbackLabelHelper } from '@/redux/actions/FoodFeedbacksLabel/FoodFeedbacksLabel';
import { FoodFeedbackHelper } from '@/redux/actions/FoodFeedbacks/FoodFeedbacks';
import { FoodFeedbackLabelEntryHelper } from '@/redux/actions/FoodFeeedbackLabelEntries/FoodFeedbackLabelEntries';
import { MarkingHelper } from '@/redux/actions/Markings/Markings';
import TranslatedMenuHeader from '@/components/CustomMenuHeader/TranslatedMenuHeader';
import { CanteenFeedbackLabelEntryHelper } from '@/redux/actions/CanteenFeedbackLabelEntries/CanteenFeedbackLabelEntries';
import { FoodCategoriesHelper } from '@/redux/actions/FoodCategories/FoodCategories';
import { FoodOffersCategoriesHelper } from '@/redux/actions/FoodOffersCategories/FoodOffersCategories';
import { FoodOffersInfoItemsHelper } from '@/redux/actions/FoodOffersInfoItems/FoodOffersInfoItems';
import { BusinessHoursHelper } from '@/redux/actions/BusinessHours/BusinessHours';
import CustomStackHeader from '@/components/CustomStackHeader/CustomStackHeader';
import TranslatedStackHeader from '@/components/CustomStackHeader/TranslatedStackHeader';
import { useLanguage } from '@/hooks/useLanguage';
import { markOnboardingShouldBeShownAfterLogin } from '@/helper/onboardingIntentHelper';
import { WikisHelper } from '@/redux/actions/Wikis/Wikis';
import { AppSettingsHelper } from '@/redux/actions/AppSettings/AppSettings';
import { MarkingGroupsHelper } from '@/redux/actions/MarkingGroups/MarkingGroups';
import { CollectibleEventsHelper } from '@/redux/actions/CollectibleEvents/CollectibleEvents';
import { ChatsHelper } from '@/redux/actions/Chats/Chats';
import { FoodAttributeGroupHelper } from '@/redux/actions/FoodAttributes/FoodAttributeGroup';
import { FoodAttributesHelper } from '@/redux/actions/FoodAttributes/FoodAttributes';
import DeviceMock from '@/components/DeviceMock/DeviceMock';
import { isWeb } from '@/constants/Constants';
import { fetchSpecificField } from '@/redux/actions/Fields/Fields';
import { BusinessHoursGroupsHelper } from '@/redux/actions/BusinessHours/BusinessHoursGroups';
import { PopupEventsHelper } from '@/redux/actions/PopupEvents/PopupEvents';
import { Platform } from 'react-native';
import { AppElementsHelper } from '@/redux/actions/AppElements/AppElements';
import { TranslationKeys } from '@/locales/keys';
import { CollectionLastUpdateHelper } from '@/redux/actions/CollectionLastUpdate/CollectionLastUpdate';
import { transformUpdateDatesToMap } from '@/helper/dateMap';
import { shouldFetch } from '@/helper/shouldFetch';
import { updateLoginStatus } from '@/constants/HelperFunctions';
import { getVersion } from '@/config';
import { format } from 'date-fns';
import { CanteenHelper } from '@/redux/actions/Canteens/Canteens';
import { BuildingsHelper, BuildingsOrganizationsHelper } from '@/redux/actions/Buildings/Buildings';
import { OrganizationsHelper } from '@/redux/actions/Organizations/Organizations';
import { HashHelper } from '@/helper/hashHelper';
import { CollectionKeys } from '@/constants/collectionKeys';
import { loadChatReadStatus } from '@/helper/chatReadStatus';
import { FriendshipsHelper } from '@/redux/actions/Friendships/Friendships';
import { PriceGroupKey } from '@/app/(app)/settings/types';
import { UserHelper } from '@/helper/UserHelper';
import AppErrorBoundary from '@/components/AppErrorBoundary';

const renderDrawerContent = (props: React.ComponentProps<typeof CustomDrawerContent>) => <CustomDrawerContent {...props} />;

/**
 * Catches render errors from every screen inside the drawer. The root layout in
 * `app/_layout.tsx` stays mounted, so the fallback can additionally offer a way
 * back to the start screen instead of only a full app reload.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
	return <AppErrorBoundary error={error} retry={retry} variant="screen" />;
}

// The `header` screen option is invoked by react-navigation as a plain render
// function, not mounted as a component. Hooks therefore MUST NOT be called in
// the function passed to `header` directly — they would register on the
// surrounding DrawerViewBase and crash with "Rendered more hooks than during
// the previous render" as soon as the set of rendered scenes changes. Any
// header that needs hooks lives in a *Content component rendered as an element
// by a stable render function (same pattern as makeTranslated*Header below).
function FeedbackAndSupportHeaderContent() {
	const { translate } = useLanguage();
	return <CustomStackHeader label={`${translate(TranslationKeys.feedback)} & ${translate(TranslationKeys.support)}`} key={'Feedback & Support'} />;
}

const FeedbackAndSupportHeader = () => <FeedbackAndSupportHeaderContent />;

function PlaybookHeader() {
	return <CustomStackHeader label={'Playbook'} key={'Playbook'} />;
}

function PlaybookComponentHeaderContent() {
	const { component } = useGlobalSearchParams<{ component?: string | string[] }>();
	const componentName = Array.isArray(component) ? component[0] : component;
	return <CustomStackHeader label={componentName ? `Playbook: ${componentName}` : 'Playbook'} key={'Playbook-Component'} />;
}

const PlaybookComponentHeader = () => <PlaybookComponentHeaderContent />;

// Screen `options.header` render-props below are almost all "translate one key,
// render Translated{Menu,Stack}Header" — these factories return a stable function
// per call site instead of defining a new arrow (nested in this component's render
// body) for every `Drawer.Screen`.
const makeTranslatedMenuHeader = (labelKey: TranslationKeys, headerKey?: string) => () => <TranslatedMenuHeader labelKey={labelKey} headerKey={headerKey} />;

const makeTranslatedStackHeader = (labelKey: TranslationKeys, headerKey?: string) => () => <TranslatedStackHeader labelKey={labelKey} headerKey={headerKey} />;

export default function Layout() {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { deviceMock } = useGlobalSearchParams();
	const kioskMode = useKioskMode();
	const dispatch = useDispatch();
	const wikisHelper = useMemo(() => new WikisHelper(), []);
	const markingHelper = useMemo(() => new MarkingHelper(), []);
	const profileHelper = useMemo(() => new ProfileHelper(), []);
	const popupEventsHelper = useMemo(() => new PopupEventsHelper(), []);
	const appSettingsHelper = useMemo(() => new AppSettingsHelper(), []);
	const appElementsHelper = useMemo(() => new AppElementsHelper(), []);
	const foodFeedbackHelper = useMemo(() => new FoodFeedbackHelper(), []);
	const businessHoursHelper = useMemo(() => new BusinessHoursHelper(), []);
	const markingGroupsHelper = useMemo(() => new MarkingGroupsHelper(), []);
	const foodAttributesHelper = useMemo(() => new FoodAttributesHelper(), []);
	const foodCategoriesHelper = useMemo(() => new FoodCategoriesHelper(), []);
	const foodfeedbackLabelHelper = useMemo(() => new FoodFeedbackLabelHelper(), []);
	const foodAttributeGroupHelper = useMemo(() => new FoodAttributeGroupHelper(), []);
	const businessHoursGroupsHelper = useMemo(() => new BusinessHoursGroupsHelper(), []);
	const foodOffersCategoriesHelper = useMemo(() => new FoodOffersCategoriesHelper(), []);
	const foodOffersInfoItemsHelper = useMemo(() => new FoodOffersInfoItemsHelper(), []);
	const collectibleEventsHelper = useMemo(() => new CollectibleEventsHelper(), []);
	const chatsHelper = useMemo(() => new ChatsHelper(), []);
	const collectionLastUpdateHelper = useMemo(() => new CollectionLastUpdateHelper(), []);
	const foodFeedbackLabelEntryHelper = useMemo(() => new FoodFeedbackLabelEntryHelper(), []);
	const canteenFeedbackLabelEntryHelper = useMemo(() => new CanteenFeedbackLabelEntryHelper(), []);
	const buildingsHelper = useMemo(() => new BuildingsHelper(), []);
	const buildingsOrganizationsHelper = useMemo(() => new BuildingsOrganizationsHelper(), []);
	const organizationsHelper = useMemo(() => new OrganizationsHelper(), []);
	const friendshipsHelper = useMemo(() => new FriendshipsHelper(), []);
	const { popupEvents } = useAppSelector((state) => state.food);
	const { hashValue } = useAppSelector((state) => state.popup_events_hash);
	const { lastUpdatedMap } = useAppSelector((state) => state.lastUpdated);
	const { drawerPosition } = useAppSelector((state) => state.settings);
	const { loggedIn, user } = useAppSelector((state) => state.authReducer);
	// Live view of loggedIn for async fetch callbacks. The fetches below can still be
	// in flight while performLogout runs; when they resolve afterwards, their closures
	// hold pre-logout state. Dispatching then would resurrect just-cleared slices
	// (e.g. popup events incl. their isOpen dismiss flags, or the collection
	// last-updated map) and redux-persist would write that state right back to the
	// storage performLogout just purged - the next login would rehydrate it again.
	const loggedInRef = useRef(loggedIn);
	useEffect(() => {
		loggedInRef.current = loggedIn;
	}, [loggedIn]);
	const { selectedCanteen: persistedCanteen } = useAppSelector((state) => state.canteenReducer);
	const selectedCanteen = useSelectedCanteen();

	useEffect(() => {
		const autoLogin = async () => {
			if (kioskMode && !loggedIn) {
				updateLoginStatus(dispatch, { id: '' } as any);
				const currentDate = format(new Date(), 'dd.MM.yyyy HH:mm:ss');
				dispatch({ type: UPDATE_PRIVACY_POLICY_DATE, payload: currentDate });
				const demoProfile: DatabaseTypes.Profiles = {
					id: 'demo',
					nickname: 'Demo User',
					credit_balance: 20.5,
					credit_balance_date_updated: currentDate,
					credit_balance_last_transaction: 20.5,
					markings: [],
					buildings_favorites: [],
					buildings_last_opened: [],
					devices: [],
				} as any;
				dispatch({ type: UPDATE_PROFILE, payload: demoProfile });
			}
		};
		autoLogin();
	}, [kioskMode, loggedIn]);

	useEffect(() => {
		const selectCanteen = async () => {
			if (kioskMode && !selectedCanteen) {
				try {
					const helper = new CanteenHelper();
					const result = (await helper.fetchCanteens({})) as DatabaseTypes.Canteens[];
					const published = result.filter(c => c.status === 'published');
					if (published.length > 0) {
						dispatch({ type: SET_CANTEENS, payload: published });
						dispatch({ type: SET_SELECTED_CANTEEN, payload: published[0] });
					}
				} catch (error) {
					console.error('Error fetching canteens:', error);
				}
			}
		};
		selectCanteen();
	}, [kioskMode, selectedCanteen]);

	const fetchFields = async () => {
		try {
			const fieldResponse: any = await fetchSpecificField('foods');
			if (fieldResponse) {
				const foodImageCollection = fieldResponse['image'];
				dispatch({ type: SET_FOOD_COLLECTION, payload: foodImageCollection });
			}
		} catch (error) {
			console.error('Error fetching fields:', error);
		}
	};

	useEffect(() => {
		fetchFields();
	}, []);

	const getFoodFeedBackLabels = async () => {
		try {
			const foodFeedbackLabels = (await foodfeedbackLabelHelper.fetchFoodFeedbackLabels({})) as DatabaseTypes.FoodsFeedbacksLabels[];
			if (foodFeedbackLabels) {
				dispatch({
					type: UPDATE_FOOD_FEEDBACK_LABELS,
					payload: foodFeedbackLabels,
				});
			} else {
				console.log('No food feedback labels found');
			}
		} catch (e) {
			console.error('Error fetching food feedback labels: ', e);
		}
	};

	// Syncs locally stored canteen and price_group to the online profile when the server profile
	// is missing those fields (e.g. user configured the app before having a server profile).
	const syncProfileDefaults = async (fetchedProfile: DatabaseTypes.Profiles) => {
		if (!UserHelper.isRegisteredUser(user)) return;
		const updates: Record<string, any> = {};

		// Transfer locally persisted canteen to the online profile
		const persistedCanteenIdStr: string | null =
			persistedCanteen?.id != null ? String(persistedCanteen.id) : null;
		if (!fetchedProfile.canteen && persistedCanteenIdStr) {
			updates.canteen = persistedCanteenIdStr;
		}

		// Default price_group to Student if not set on the server
		if (!fetchedProfile.price_group) {
			updates.price_group = PriceGroupKey.student;
		}

		if (Object.keys(updates).length === 0) return;

		try {
			const updatedPayload = { ...fetchedProfile, ...updates };
			const result = (await profileHelper.updateProfile(updatedPayload)) as DatabaseTypes.Profiles;
			if (result) {
				dispatch({ type: UPDATE_PROFILE, payload: result });
			}
		} catch (error) {
			console.error('Error syncing profile defaults:', error);
		}
	};

	const fetchProfile = async () => {
		try {
			const profile = (await profileHelper.fetchProfileById(user?.profile, {})) as DatabaseTypes.Profiles;
			if (profile?.id) {
				getOwnFeedback(profile?.id);
				getFeedbackEntries(profile?.id);
				getCanteenFeedbackEntries(profile?.id);
				dispatch({ type: UPDATE_PROFILE, payload: profile });
				fetchChats();
				fetchFriendships(profile?.id);
				// Sync defaults: transfer locally stored values to the online profile if missing
				syncProfileDefaults(profile);
			}
		} catch (error) {
			console.error('Error fetching profiles:', error);
		}
	};

	const fetchFriendships = async (profileId: string) => {
		try {
			const result = await friendshipsHelper.fetchFriendshipsByProfileId(profileId);
			if (result) {
				dispatch({ type: SET_FRIENDSHIPS, payload: result });
			}
		} catch (error) {
			console.error('Error fetching friendships:', error);
		}
	};

        const fetchChats = async () => {
                try {
                        const storedStatus = await loadChatReadStatus();
                        dispatch({ type: SET_CHAT_READ_STATUS, payload: storedStatus });

                        if (user?.profile) {
                                const result = (await chatsHelper.fetchChatsByProfile(user.profile)) as DatabaseTypes.Chats[];
                                if (result) {
                                        dispatch({ type: SET_CHATS, payload: result });
                                }
			}
		} catch (error) {
			console.error('Error fetching chats:', error);
		}
	};

	const getOwnFeedback = async (id: string) => {
		try {
			// Fetch own feedback
			const result = (await foodFeedbackHelper.fetchFoodFeedbackByProfileId(id)) as DatabaseTypes.FoodsFeedbacks[];
			if (result) {
				dispatch({ type: UPDATE_OWN_FOOD_FEEDBACK, payload: result });
			}
		} catch (error) {
			console.error('Error fetching own feedback:', error);
		}
	};

	const getFeedbackEntries = async (id: string) => {
		try {
			const result = (await foodFeedbackLabelEntryHelper.fetchFoodFeedbackLabelEntriesByProfile(id)) as DatabaseTypes.FoodsFeedbacksLabelsEntries[];
			if (result) {
				dispatch({
					type: UPDATE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES,
					payload: result,
				});
			}
		} catch (error) {
			console.error('Error fetching feedback entries:', error);
		}
	};

	const getCanteenFeedbackEntries = async (id: string) => {
		try {
			const result = (await canteenFeedbackLabelEntryHelper.fetchCanteenFeedbackLabelEntriesByProfile(id)) as DatabaseTypes.CanteensFeedbacksLabelsEntries[];
			if (result) {
				dispatch({
					type: SET_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES,
					payload: result,
				});
			}
		} catch (error) {
			console.error('Error fetching feedback entries:', error);
		}
	};

	const getMarkings = async () => {
		try {
			const markingResult = (await markingHelper.fetchMarkings({})) as DatabaseTypes.Markings[];
			const markingGroupResult = (await markingGroupsHelper.fetchMarkingGroups({})) as DatabaseTypes.MarkingsGroups[];

			// Use the sortMarkingsByGroup function to sort markings
			const sortedMarkings = sortMarkingsByGroup(markingResult, markingGroupResult);

			dispatch({ type: UPDATE_MARKINGS, payload: sortedMarkings });
			dispatch({ type: UPDATE_MARKING_GROUPS, payload: markingGroupResult });
		} catch (error) {
			console.error('Error fetching markings:', error);
		}
	};

        const getCollectibleEvents = async () => {
                try {
                        const result = (await collectibleEventsHelper.fetchCollectibleEvents({})) as DatabaseTypes.CollectibleEvents[];
                        if (result) {
                                dispatch({ type: SET_COLLECTIBLE_EVENTS, payload: sortBySortField(result) });
                        }
                } catch (error) {
                        console.error('Error fetching collectible events:', error);
                }
        };

	const getFoodCategories = async () => {
		try {
			const result = (await foodCategoriesHelper.fetchFoodCategories({})) as DatabaseTypes.FoodsCategories[];
			if (result) {
				dispatch({ type: SET_FOOD_CATEGORIES, payload: sortBySortField(result) });
			}
		} catch (error) {
			console.error('Error fetching food categories:', error);
		}
	};

	const getFoodOffersCategories = async () => {
		try {
			const result = (await foodOffersCategoriesHelper.fetchFoodOffersCategories({})) as DatabaseTypes.FoodoffersCategories[];
			if (result) {
				dispatch({
					type: SET_FOOD_OFFERS_CATEGORIES,
					payload: sortBySortField(result),
				});
			}
		} catch (error) {
			console.error('Error fetching food offers categories:', error);
		}
	};

	const getFoodOffersInfoItems = async () => {
		try {
			const result = (await foodOffersInfoItemsHelper.fetchFoodOffersInfoItems({})) as DatabaseTypes.FoodoffersInfoItems[];
			if (result) {
				dispatch({
					type: SET_FOODOFFERS_INFO_ITEMS,
					payload: sortBySortField(result),
				});
			}
		} catch (error) {
			console.error('Error fetching food offers info items:', error);
		}
	};

	const getAllFoodAttributes = async () => {
		try {
			const result = (await foodAttributesHelper.fetchAllFoodAttributes()) as DatabaseTypes.FoodsAttributes[];
			if (result) {
				const attributesDict = result.reduce(
					(acc, attr) => {
						if (attr.id) {
							acc[attr.id] = attr;
						}
						return acc;
					},
					{} as Record<string, DatabaseTypes.FoodsAttributes>
				);
				console.log('✅ foodAttributes as Dictionary (O(1) Access):', attributesDict);
				dispatch({ type: SET_FOOD_ATTRIBUTES_DICT, payload: attributesDict });
			}
		} catch (error) {
			console.error('Error fetching Food attribute', error);
		}
	};

	const getAllFoodAttributesGroups = async () => {
		try {
			const result = (await foodAttributeGroupHelper.fetchAllFoodAttributeGroups({})) as DatabaseTypes.FoodsAttributesGroups[];
			if (result) {
				dispatch({ type: SET_FOOD_ATTRIBUTE_GROUPS, payload: result });
			}
		} catch (error) {
			console.error('Error fetching Food attribute groups', error);
		}
	};

	const getAllBusinessHoursGroups = async () => {
		try {
			const result = (await businessHoursGroupsHelper.fetchBusinessHoursGroups({})) as DatabaseTypes.BusinesshoursGroups[];
			if (result) {
				dispatch({ type: SET_BUSINESS_HOURS_GROUPS, payload: result });
			}
		} catch (error) {
			console.error('Error fetching Food attribute groups', error);
		}
	};

	const getBusinessHours = async () => {
		try {
			const businessHours = (await businessHoursHelper.fetchBusinessHours({})) as DatabaseTypes.Businesshours[];
			dispatch({ type: SET_BUSINESS_HOURS, payload: businessHours });
		} catch (error) {
			console.error('Error fetching business hours:', error);
		}
	};

	const getWikis = async () => {
		try {
			const response = (await wikisHelper.fetchWikis()) as DatabaseTypes.Wikis[];
			if (response) {
				dispatch({ type: SET_WIKIS, payload: response });
			}
		} catch (error) {
			console.error('Error fetching wikis:', error);
		}
	};

	const getAppSettings = async () => {
		try {
			const result = (await appSettingsHelper.fetchAppSettings({})) as DatabaseTypes.AppSettings;
			if (result) {
				dispatch({ type: SET_APP_SETTINGS, payload: result });
			}
		} catch (error) {
			console.error('Error fetching app settings:', error);
		}
	};

	const getAllEvents = async () => {
		if (kioskMode) {
			return;
		}
		try {
			const response = (await popupEventsHelper.fetchAllPopupEvents()) as DatabaseTypes.PopupEvents[];
			// Re-check AFTER the await: a logout may have completed while the fetch was in
			// flight. Dispatching now would resurrect the popup events - including this
			// closure's pre-logout isOpen dismiss flags - after performLogout already
			// cleared them, and redux-persist would persist that resurrected state again.
			if (!loggedInRef.current) {
				return;
			}
                        if (response) {
                                let platformKey: 'show_on_ios' | 'show_on_android' | 'show_on_web';
                                if (Platform.OS === 'ios') {
                                        platformKey = 'show_on_ios';
                                } else if (Platform.OS === 'android') {
                                        platformKey = 'show_on_android';
                                } else {
                                        platformKey = 'show_on_web';
                                }

                                // Keep each event's already-seen/closed state across refetches - only default
                                // to unseen for events we haven't stored before. Without this, refetching
                                // (triggered whenever *any* popup event's data changes) would reset isOpen
                                // back to false for every event, including ones the user already permanently
                                // dismissed, making them pop back up.
                                const previousIsOpenById = new Map(popupEvents.map((e: any) => [String(e.id), Boolean(e.isOpen)]));

                                const filteredEvents = filterPopupEvents(response, platformKey, new Date(), getVersion()).map((event, index) => ({
                                        ...event,
                                        isOpen: previousIsOpenById.get(String(event.id)) ?? false,
                                        isCurrent: index === 0,
                                }));
				const eventsHash = HashHelper.md5(JSON.stringify(filteredEvents));
				if (eventsHash !== hashValue) {
					dispatch({ type: SET_POPUP_EVENTS, payload: filteredEvents });
					dispatch({ type: SET_POPUP_EVENTS_HASH, payload: eventsHash });
				}
			}
		} catch (error) {
			console.log('Error Fetching Popup Events', error);
		}
	};

	const getAllAppElements = async () => {
		try {
			const result = (await appElementsHelper.fetchAllAppElements({})) as DatabaseTypes.AppElements[];
			if (result) {
				dispatch({ type: SET_APP_ELEMENTS, payload: result });
			}
		} catch (error) {
			console.error('Error fetching app elements:', error);
		}
	};

	const getBuildings = async () => {
		try {
			const result = (await buildingsHelper.fetchBuildings({})) as DatabaseTypes.Buildings[];
			if (result) {
				const dict = result.reduce<Record<string, DatabaseTypes.Buildings>>((acc, b) => {
					if (b.id) acc[String(b.id)] = b;
					return acc;
				}, {});
				console.log('✅ buildings as Dictionary (O(1) Access):', dict);
				dispatch({ type: SET_BUILDINGS_DICT, payload: dict });
				dispatch({ type: SET_CAMPUSES, payload: result });
				dispatch({ type: SET_CAMPUSES_DICT, payload: dict });
			}
		} catch (error) {
			console.error('Error fetching buildings:', error);
		}
	};

	const getBuildingsOrganizations = async () => {
		try {
			const result = (await buildingsOrganizationsHelper.fetchBuildingsOrganizations({})) as DatabaseTypes.BuildingsOrganizations[];
			if (result) {
				dispatch({ type: SET_BUILDINGS_ORGANIZATIONS, payload: result });
			}
		} catch (error) {
			console.error('Error fetching buildings organizations:', error);
		}
	};

	const getOrganizations = async () => {
		try {
			const result = (await organizationsHelper.fetchOrganizations({})) as DatabaseTypes.Organizations[];
			if (result) {
				dispatch({ type: SET_ORGANISATIONS, payload: result });
			}
		} catch (error) {
			console.error('Error fetching organizations:', error);
		}
	};

	const fetchConfig: { key: string | string[]; action: () => Promise<void> }[] = [
		{ key: CollectionKeys.APP_ELEMENTS, action: getAllAppElements },
		// refresh markings when any of the related tables change
		{
			key: [CollectionKeys.MARKINGS, CollectionKeys.MARKINGS_TRANSLATIONS, CollectionKeys.MARKINGS_GROUPS],
			action: getMarkings,
		},
		{
			key: [CollectionKeys.FOODS_CATEGORIES, CollectionKeys.FOODS_CATEGORIES_TRANSLATIONS],
			action: getFoodCategories,
		},
		{
			key: [CollectionKeys.FOODOFFERS_CATEGORIES, CollectionKeys.FOODOFFERS_CATEGORIES_TRANSLATIONS],
			action: getFoodOffersCategories,
		},
		{
			key: CollectionKeys.FOODOFFERS_INFO_ITEMS,
			action: getFoodOffersInfoItems,
		},
		{
			key: CollectionKeys.FOODS_FEEDBACKS_LABELS,
			action: getFoodFeedBackLabels,
		},
                {
                        key: [CollectionKeys.COLLECTIBLE_EVENTS, CollectionKeys.COLLECTIBLE_EVENTS_TRANSLATIONS],
                        action: getCollectibleEvents,
                },
                { key: CollectionKeys.BUSINESSHOURS, action: getBusinessHours },
		{
			key: CollectionKeys.BUSINESSHOURS_GROUPS,
			action: getAllBusinessHoursGroups,
		},
		{ key: CollectionKeys.WIKIS, action: getWikis },
		{ key: CollectionKeys.APP_SETTINGS, action: getAppSettings },
		{
			key: CollectionKeys.FOODS_ATTRIBUTES_GROUPS,
			action: getAllFoodAttributesGroups,
		},
		{ key: CollectionKeys.FOODS_ATTRIBUTES, action: getAllFoodAttributes },
		{
			key: [CollectionKeys.BUILDINGS, CollectionKeys.BUILDINGS_TRANSLATIONS],
			action: getBuildings,
		},
		{ key: CollectionKeys.BUILDINGS_ORGANIZATIONS, action: getBuildingsOrganizations },
		{ key: CollectionKeys.ORGANIZATIONS, action: getOrganizations },
	];

	const getAllCollectionDatesLastUpdate = async () => {
		// The [user] effect below also fires when performLogout clears the user - don't
		// kick off the whole refetch cascade for a session that is just being torn down.
		// (Kiosk mode fetches without a real login, so it stays exempt.)
		if (!loggedInRef.current && !kioskMode) {
			return;
		}
		try {
			const result = (await collectionLastUpdateHelper.fetchCollectionDatesLastUpdate({})) as DatabaseTypes.CollectionsDatesLastUpdate[];
			if (result) {
				const serverMap = transformUpdateDatesToMap(result);
				if (!kioskMode && shouldFetch([CollectionKeys.POPUP_EVENTS, CollectionKeys.POPUP_EVENTS_TRANSLATIONS], serverMap, lastUpdatedMap)) {
					getAllEvents();
				}
				await Promise.all(
					fetchConfig.map(({ key, action }) => {
						if (shouldFetch(key, serverMap, lastUpdatedMap)) {
							return action();
						}
						return Promise.resolve();
					})
				);

				// Re-check AFTER the awaits above: if a logout finished in the meantime,
				// storing the fresh server dates now would mark all collections as
				// up-to-date in the persisted state while their data was just cleared -
				// the next login would then skip refetching them entirely.
				if (!loggedInRef.current && !kioskMode) {
					return;
				}
				dispatch({
					type: SET_COLLECTION_DATES_LAST_UPDATED,
					payload: serverMap,
				});
			}
		} catch (error) {
			console.error('Error fetching app elements:', error);
		}
	};

	const resetCalendarSelectedDate = () => {
		dispatch({
			type: SET_SELECTED_DATE,
			payload: new Date().toISOString().split('T')[0],
		});
	};

	useEffect(() => {
		if (user?.id) {
			fetchProfile();
		}
		resetCalendarSelectedDate();
		getAllCollectionDatesLastUpdate();
	}, [user]);

	const drawerScreenOptions = useMemo(
		() => ({
			headerStyle: { backgroundColor: theme.header.background },
			headerTintColor: theme.header.text,
			drawerType: 'front' as const,
			drawerPosition: (() => {
				const position = drawerPosition === 'system' ? 'left' : drawerPosition;
				return position === 'left' || position === 'right' ? position : 'left';
			})() as 'left' | 'right',
		}),
		[theme.header.background, theme.header.text, drawerPosition]
	);

	if (!loggedIn && !kioskMode) {
		markOnboardingShouldBeShownAfterLogin();
		return <Redirect href="/(auth)/login" />;
	}

	return (
		<>
			{deviceMock && deviceMock === 'iphone' && isWeb && <DeviceMock />}
			<Drawer
				screenOptions={drawerScreenOptions}
				detachInactiveScreens={true}
				drawerContent={renderDrawerContent}
				backBehavior="history"
			>
				<Drawer.Screen
					name="index"
					options={{
						title: translate(TranslationKeys.please_select_your_canteen),
						headerLeft: () => null,
					}}
				/>
				<Drawer.Screen
					name={AppScreens.FOOD_OFFERS}
					options={{
						title: 'Canteens',
						headerShown: false,
					}}
				/>
				<Drawer.Screen
					name="account-balance/index"
					options={{
						header: makeTranslatedMenuHeader(TranslationKeys.accountbalance, 'Account-Balance'),
						title: translate(TranslationKeys.accountbalance),
					}}
				/>
				<Drawer.Screen
					name="campus"
					options={{
						title: 'Campus',
						headerShown: false,
					}}
				/>
				<Drawer.Screen
					name="housing"
					options={{
						title: 'Housing',
						headerShown: false,
					}}
				/>
				<Drawer.Screen
					name="news/index"
					options={{
						title: 'News',
						header: makeTranslatedMenuHeader(TranslationKeys.news, 'News'),
					}}
				/>
				<Drawer.Screen
					name="course-timetable/index"
					options={{
						header: makeTranslatedMenuHeader(TranslationKeys.course_timetable, 'course_timetable'),
						title: 'Course Timetable',
					}}
				/>
				<Drawer.Screen
					name="settings/index"
					options={{
						title: 'Settings',
						header: makeTranslatedMenuHeader(TranslationKeys.settings, 'settings'),
					}}
				/>
				<Drawer.Screen
					name="faq-food/index"
					options={{
						title: 'FAQ-Food',
					}}
				/>
				<Drawer.Screen
					name="faq-living/index"
					options={{
						title: 'FAQ-Living',
					}}
				/>

				<Drawer.Screen
					name="management/index"
					options={{
						header: makeTranslatedMenuHeader(TranslationKeys.role_management, 'Management'),
						title: 'Management',
					}}
				/>
				<Drawer.Screen
					name="experimentell/index"
					options={{
						header: makeTranslatedMenuHeader(TranslationKeys.experimentell, 'Experimentell'),
						title: translate(TranslationKeys.experimentell),
					}}
				/>
				<Drawer.Screen
					name="experimentell/onboarding/index"
					options={{
						headerShown: false,
						title: translate(TranslationKeys.onboarding),
					}}
				/>
				<Drawer.Screen
					name="experimentell/playbook/index"
					options={{
						header: PlaybookHeader,
						title: 'Playbook',
					}}
				/>
				<Drawer.Screen
					name="experimentell/playbook/[component]"
					options={{
						header: PlaybookComponentHeader,
						title: 'Playbook',
					}}
				/>
				<Drawer.Screen
					name="experimentell/crash-test/index"
					options={{
						header: makeTranslatedStackHeader(TranslationKeys.crash_test, 'crash_test'),
						title: translate(TranslationKeys.crash_test),
					}}
				/>
				<Drawer.Screen
					name="map/index"
					options={{
						headerShown: false,
						title: translate(TranslationKeys.map),
					}}
				/>
				<Drawer.Screen
					name="vertical-image-scroll/index"
					options={{
						header: makeTranslatedStackHeader(TranslationKeys.vertical_image_scroll, 'vertical_image_scroll'),
						title: translate(TranslationKeys.vertical_image_scroll),
					}}
				/>


				<Drawer.Screen
					name="chats"
					options={{
						title: translate(TranslationKeys.chats),
						headerShown: false,
					}}
				/>

				<Drawer.Screen
					name="notification/index"
					options={{
						header: makeTranslatedStackHeader(TranslationKeys.notification, 'notification'),
						title: translate(TranslationKeys.notification),
					}}
				/>
                                <Drawer.Screen
                                        name="events/index"
                                        options={{
                                                header: makeTranslatedStackHeader(TranslationKeys.events, 'events'),
                                                title: translate(TranslationKeys.events),
                                        }}
                                />
                                <Drawer.Screen
                                        name="collectible-events/index"
                                        options={{
                                                header: makeTranslatedStackHeader(TranslationKeys.collectible_events, 'collectible_events'),
                                                title: translate(TranslationKeys.collectible_events),
                                        }}
                                />
                                <Drawer.Screen
                                        name="collectible-event/index"
                                        options={{
                                                title: translate(TranslationKeys.collectible_event_active),
                                                headerShown: false,
                                        }}
                                />
                                <Drawer.Screen
                                        name="support-FAQ/index"
                                        options={{
                                                title: translate(TranslationKeys.feedback_support_faq),
                                                header: makeTranslatedStackHeader(TranslationKeys.feedback_support_faq, 'Feedback Support Faq'),
					}}
				/>

				<Drawer.Screen
					name="feedback-support/index"
					options={{
						title: 'Feedback & Support',
						header: FeedbackAndSupportHeader,
					}}
				/>

				<Drawer.Screen
					name="give-feedback/index"
					options={{
						title: translate(TranslationKeys.rueckmeldung_geben),
						header: makeTranslatedStackHeader(TranslationKeys.rueckmeldung_geben, 'rueckmeldung_geben'),
					}}
				/>

				<Drawer.Screen
					name="app-download-management/index"
					options={{
						title: translate(TranslationKeys.app_download),
						headerShown: false,
					}}
				/>

				<Drawer.Screen
					name="support-ticket"
					options={{
						title: 'Support Ticket',
						headerShown: false,
					}}
				/>

				<Drawer.Screen
					name="licenseInformation/index"
					options={{
						header: makeTranslatedStackHeader(TranslationKeys.license_information, 'license_information'),
						title: 'License Information',
					}}
				/>

				<Drawer.Screen
					name="data-access/index"
					options={{
						title: 'Data Access',
						header: makeTranslatedStackHeader(TranslationKeys.dataAccess, 'Data Access'),
					}}
				/>

				<Drawer.Screen
					name="eating-habits/index"
					options={{
						title: 'Eating Habits',
						header: makeTranslatedStackHeader(TranslationKeys.eating_habits, 'Eating Habits'),
					}}
				/>

				<Drawer.Screen
					name="form-categories/index"
					options={{
						header: makeTranslatedStackHeader(TranslationKeys.select_a_form_category),
					}}
				/>
				<Drawer.Screen
					name="forms/index"
					options={{
						header: makeTranslatedStackHeader(TranslationKeys.select_a_form),
					}}
				/>
				<Drawer.Screen
					name="form-submissions/index"
					options={{
						headerShown: false,
					}}
				/>
				<Drawer.Screen
					name="form-submission/index"
					options={{
						headerShown: false,
					}}
				/>
				<Drawer.Screen
					name="form-queue/index"
					options={{
						header: makeTranslatedStackHeader(TranslationKeys.form_queue),
					}}
				/>
				<Drawer.Screen
					name="image-full-screen"
					options={{
						headerShown: false,
					}}
				/>
			</Drawer>
		</>
	);
}
