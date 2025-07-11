import React, { useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '@/components/Drawer/CustomDrawerContent';
import { useTheme } from '@/hooks/useTheme';
import { useDispatch, useSelector } from 'react-redux';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { Redirect, useGlobalSearchParams } from 'expo-router';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { DatabaseTypes } from 'repo-depkit-common';
import {
  SET_APP_ELEMENTS,
  SET_APP_SETTINGS,
  SET_BUSINESS_HOURS,
  SET_BUSINESS_HOURS_GROUPS,
  SET_COLLECTION_DATES_LAST_UPDATED,
  SET_FOOD_ATTRIBUTE_GROUPS,
  SET_FOOD_ATTRIBUTES,
  SET_FOOD_ATTRIBUTES_DICT,
  SET_FOOD_CATEGORIES,
  SET_FOOD_COLLECTION,
  SET_FOOD_OFFERS_CATEGORIES,
  SET_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES,
  SET_POPUP_EVENTS,
  SET_POPUP_EVENTS_HASH,
  SET_SELECTED_DATE,
  SET_WIKIS,
  UPDATE_FOOD_FEEDBACK_LABELS,
  UPDATE_MARKINGS,
  UPDATE_OWN_FOOD_FEEDBACK,
  UPDATE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES,
  UPDATE_PROFILE,
} from '@/redux/Types/types';
import { FoodFeedbackLabelHelper } from '@/redux/actions/FoodFeedbacksLabel/FoodFeedbacksLabel';
import { FoodFeedbackHelper } from '@/redux/actions/FoodFeedbacks/FoodFeedbacks';
import { FoodFeedbackLabelEntryHelper } from '@/redux/actions/FoodFeeedbackLabelEntries/FoodFeedbackLabelEntries';
import { MarkingHelper } from '@/redux/actions/Markings/Markings';
import CustomMenuHeader from '@/components/CustomMenuHeader/CustomMenuHeader';
import { CanteenFeedbackLabelEntryHelper } from '@/redux/actions/CanteenFeedbackLabelEntries/CanteenFeedbackLabelEntries';
import { FoodCategoriesHelper } from '@/redux/actions/FoodCategories/FoodCategories';
import { FoodOffersCategoriesHelper } from '@/redux/actions/FoodOffersCategories/FoodOffersCategories';
import { BusinessHoursHelper } from '@/redux/actions/BusinessHours/BusinessHours';
import CustomStackHeader from '@/components/CustomStackHeader/CustomStackHeader';
import { useLanguage } from '@/hooks/useLanguage';
import { WikisHelper } from '@/redux/actions/Wikis/Wikis';
import { AppSettingsHelper } from '@/redux/actions/AppSettings/AppSettings';
import { MarkingGroupsHelper } from '@/redux/actions/MarkingGroups/MarkingGroups';
import { NewsHelper } from '@/redux/actions/News/News';
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
import { format } from 'date-fns';
import { CanteenHelper } from '@/redux/actions/Canteens/Canteens';
import { SET_CANTEENS, SET_SELECTED_CANTEEN, UPDATE_PRIVACY_POLICY_DATE } from '@/redux/Types/types';
// TODO: replace HashHelper with expo-crypto once packages can be installed
import { HashHelper } from '@/helper/hashHelper';
import { CollectionKeys } from '@/constants/collectionKeys';
import { RootState } from '@/redux/reducer';
import { sortMarkingsByGroup, sortBySortField } from '@/helper/sortingHelper';


export default function Layout() {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const { deviceMock, kioskMode } = useGlobalSearchParams();
  const dispatch = useDispatch();
  const wikisHelper = new WikisHelper();
  const markingHelper = new MarkingHelper();
  const profileHelper = new ProfileHelper();
  const popupEventsHelper = new PopupEventsHelper();
  const appSettingsHelper = new AppSettingsHelper();
  const appElementsHelper = new AppElementsHelper();
  const foodFeedbackHelper = new FoodFeedbackHelper();
  const businessHoursHelper = new BusinessHoursHelper();
  const markingGroupsHelper = new MarkingGroupsHelper();
  const foodAttributesHelper = new FoodAttributesHelper();
  const foodCategoriesHelper = new FoodCategoriesHelper();
  const foodfeedbackLabelHelper = new FoodFeedbackLabelHelper();
  const foodAttributeGroupHelper = new FoodAttributeGroupHelper();
  const businessHoursGroupsHelper = new BusinessHoursGroupsHelper();
  const foodOffersCategoriesHelper = new FoodOffersCategoriesHelper();
  const newsHelper = new NewsHelper();
  const collectionLastUpdateHelper = new CollectionLastUpdateHelper();
  const foodFeedbackLabelEntryHelper = new FoodFeedbackLabelEntryHelper();
  const canteenFeedbackLabelEntryHelper = new CanteenFeedbackLabelEntryHelper();
  const { popupEvents } = useSelector((state: RootState) => state.food);
  const { hashValue } = useSelector(
    (state: RootState) => state.popup_events_hash,
  );
  const { lastUpdatedMap } = useSelector(
    (state: RootState) => state.lastUpdated
  );
  const { drawerPosition } = useSelector((state: RootState) => state.settings);
  const { loggedIn, user } = useSelector(
    (state: RootState) => state.authReducer
  );
  const { canteens } = useSelector(
    (state: RootState) => state.canteenReducer
  );
  const selectedCanteen = useSelectedCanteen();

  useEffect(() => {
    const autoLogin = async () => {
      if (kioskMode === 'true' && !loggedIn) {
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
      if (kioskMode === 'true' && !selectedCanteen) {
        try {
          const helper = new CanteenHelper();
          const result = (await helper.fetchCanteens({})) as DatabaseTypes.Canteens[];
          const published = result.filter((c) => c.status === 'published');
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

  if (!loggedIn && kioskMode !== 'true') {
    return <Redirect href='/(auth)/login' />;
  }

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
      const foodFeedbackLabels =
        (await foodfeedbackLabelHelper.fetchFoodFeedbackLabels(
          {}
        )) as DatabaseTypes.FoodsFeedbacksLabels[];
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

  const fetchProfile = async () => {
    try {
      const profile = (await profileHelper.fetchProfileById(
        user?.profile,
        {}
      )) as DatabaseTypes.Profiles;
      if (profile?.id) {
        getOwnFeedback(profile?.id);
        getFeedbackEntries(profile?.id);
        getCanteenFeedbackEntries(profile?.id);
        dispatch({ type: UPDATE_PROFILE, payload: profile });
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const getOwnFeedback = async (id: string) => {
    try {
      // Fetch own feedback
      const result = (await foodFeedbackHelper.fetchFoodFeedbackByProfileId(
        id
      )) as DatabaseTypes.FoodsFeedbacks[];
      if (result) {
        dispatch({ type: UPDATE_OWN_FOOD_FEEDBACK, payload: result });
      }
    } catch (error) {
      console.error('Error fetching own feedback:', error);
    }
  };

  const getFeedbackEntries = async (id: string) => {
    try {
      const result =
        (await foodFeedbackLabelEntryHelper.fetchFoodFeedbackLabelEntriesByProfile(
          id
        )) as DatabaseTypes.FoodsFeedbacksLabelsEntries[];
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
      const result =
        (await canteenFeedbackLabelEntryHelper.fetchCanteenFeedbackLabelEntriesByProfile(
          id
        )) as DatabaseTypes.CanteensFeedbacksLabelsEntries[];
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
      const markingResult = (await markingHelper.fetchMarkings(
        {}
      )) as DatabaseTypes.Markings[];
      const markingGroupResult = (await markingGroupsHelper.fetchMarkingGroups(
        {}
      )) as DatabaseTypes.MarkingsGroups[];

      // Use the sortMarkingsByGroup function to sort markings
      const sortedMarkings = sortMarkingsByGroup(markingResult, markingGroupResult);

      dispatch({ type: UPDATE_MARKINGS, payload: sortedMarkings });
    } catch (error) {
      console.error('Error fetching markings:', error);
    }
  };

  const getNews = async () => {
    try {
      const result = (await newsHelper.fetchNews({})) as DatabaseTypes.News[];
      if (result) {
        const today = new Date().toISOString().split('T')[0];
        const sortedNews = [...result].sort((a, b) => {
          const dateA = a?.date;
          const dateB = b?.date;

          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;

          const dayA = dateA.split('T')[0];
          const dayB = dateB.split('T')[0];

          if (dayA === today && dayB !== today) return -1;
          if (dayB === today && dayA !== today) return 1;

          return dayA < dayB ? 1 : -1;
        });
        dispatch({ type: SET_NEWS, payload: sortedNews });
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  };

  const getFoodCategories = async () => {
    try {
      const result = (await foodCategoriesHelper.fetchFoodCategories(
        {}
      )) as DatabaseTypes.FoodsCategories[];
      if (result) {
        dispatch({ type: SET_FOOD_CATEGORIES, payload: sortBySortField(result) });
      }
    } catch (error) {
      console.error('Error fetching food categories:', error);
    }
  };

  const getFoodOffersCategories = async () => {
    try {
      const result =
        (await foodOffersCategoriesHelper.fetchFoodOffersCategories(
          {}
        )) as DatabaseTypes.FoodoffersCategories[];
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

  const getAllFoodAttributes = async () => {
    try {
      const result =
        (await foodAttributesHelper.fetchAllFoodAttributes()) as DatabaseTypes.FoodsAttributes[];
      if (result) {
        const attributesDict = result.reduce((acc, attr) => {
          if (attr.id) {
            acc[attr.id] = attr;
          }
          return acc;
        }, {} as Record<string, DatabaseTypes.FoodsAttributes>);
        dispatch({ type: SET_FOOD_ATTRIBUTES, payload: result });
        dispatch({ type: SET_FOOD_ATTRIBUTES_DICT, payload: attributesDict });
      }
    } catch (error) {
      console.error('Error fetching Food attribute', error);
    }
  };

  const getAllFoodAttributesGroups = async () => {
    try {
      const result =
        (await foodAttributeGroupHelper.fetchAllFoodAttributeGroups(
          {}
        )) as DatabaseTypes.FoodsAttributesGroups[];
      if (result) {
        dispatch({ type: SET_FOOD_ATTRIBUTE_GROUPS, payload: result });
      }
    } catch (error) {
      console.error('Error fetching Food attribute groups', error);
    }
  };

  const getAllBusinessHoursGroups = async () => {
    try {
      const result = (await businessHoursGroupsHelper.fetchBusinessHoursGroups(
        {}
      )) as DatabaseTypes.BusinesshoursGroups[];
      if (result) {
        dispatch({ type: SET_BUSINESS_HOURS_GROUPS, payload: result });
      }
    } catch (error) {
      console.error('Error fetching Food attribute groups', error);
    }
  };

  const getBusinessHours = async () => {
    try {
      const businessHours = (await businessHoursHelper.fetchBusinessHours(
        {}
      )) as DatabaseTypes.Businesshours[];
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
      const result = (await appSettingsHelper.fetchAppSettings(
        {}
      )) as DatabaseTypes.AppSettings;
      if (result) {
        dispatch({ type: SET_APP_SETTINGS, payload: result });
      }
    } catch (error) {
      console.error('Error fetching app settings:', error);
    }
  };

  const getAllEvents = async () => {
    try {
      const response =
        (await popupEventsHelper.fetchAllPopupEvents()) as DatabaseTypes.PopupEvents[];
      if (response) {
        const currentDate = new Date();

        const platformKey =
          Platform.OS === 'ios'
            ? 'show_on_ios'
            : Platform.OS === 'android'
            ? 'show_on_android'
            : 'show_on_web';

        const filteredEvents = response
          .filter((event: DatabaseTypes.PopupEvents) => {
            const start = event.date_start ? new Date(event.date_start) : null;
            const end = event.date_end ? new Date(event.date_end) : null;

            const isDateValid =
              (!start && !end) ||
              (start && !end && currentDate >= start) ||
              (start && end && currentDate >= start && currentDate <= end);

            const isPlatformValid = event[platformKey];

            return isDateValid && isPlatformValid;
          })
          .map((event, index) => ({
            ...event,
            isOpen: false,
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
      const result = (await appElementsHelper.fetchAllAppElements(
        {}
      )) as DatabaseTypes.AppElements[];
      if (result) {
        dispatch({ type: SET_APP_ELEMENTS, payload: result });
      }
    } catch (error) {
      console.error('Error fetching app elements:', error);
    }
  };

  const fetchConfig: { key: string | string[]; action: () => Promise<void> }[] = [
    { key: CollectionKeys.APP_ELEMENTS, action: getAllAppElements },
    // refresh markings when any of the related tables change
    {
      key: [
        CollectionKeys.MARKINGS,
        CollectionKeys.MARKINGS_TRANSLATIONS,
        CollectionKeys.MARKINGS_GROUPS,
      ],
      action: getMarkings,
    },
    {
      key: [
        CollectionKeys.FOODS_CATEGORIES,
        CollectionKeys.FOODS_CATEGORIES_TRANSLATIONS,
      ],
      action: getFoodCategories,
    },
    {
      key: [
        CollectionKeys.FOODOFFERS_CATEGORIES,
        CollectionKeys.FOODOFFERS_CATEGORIES_TRANSLATIONS,
      ],
      action: getFoodOffersCategories,
    },
    {
      key: CollectionKeys.FOODS_FEEDBACKS_LABELS,
      action: getFoodFeedBackLabels,
    },
    { key: CollectionKeys.NEWS, action: getNews },
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
  ];

  const getAllCollectionDatesLastUpdate = async () => {
    try {
      const result =
        (await collectionLastUpdateHelper.fetchCollectionDatesLastUpdate(
          {}
        )) as DatabaseTypes.CollectionsDatesLastUpdate[];
      if (result) {
        const serverMap = transformUpdateDatesToMap(result);
        if (
          shouldFetch(
            [
              CollectionKeys.POPUP_EVENTS,
              CollectionKeys.POPUP_EVENTS_TRANSLATIONS,
            ],
            serverMap,
            lastUpdatedMap,
          )
        ) {
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

  return (
    <>
      {deviceMock && deviceMock === 'iphone' && isWeb && <DeviceMock />}
      <Drawer
        screenOptions={{
          headerStyle: { backgroundColor: theme.header.background },
          headerTintColor: theme.header.text,
          drawerType: 'front',
          drawerPosition: drawerPosition === 'system' ? 'left' : drawerPosition,
        }}
        detachInactiveScreens={true}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        backBehavior='history'
      >
        <Drawer.Screen
          name='index'
          options={{
            title: translate(TranslationKeys.please_select_your_canteen),
            headerLeft: () => null,
          }}
        />
        <Drawer.Screen
          name='foodoffers'
          options={{
            title: 'Canteens',
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name='account-balance/index'
          options={{
            header: () => (
              <CustomMenuHeader
                label={translate(TranslationKeys.accountbalance)}
                key={'Account-Balance'}
              />
            ),
            title: translate(TranslationKeys.accountbalance),
          }}
        />
        <Drawer.Screen
          name='campus'
          options={{
            title: 'Campus',
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name='housing'
          options={{
            title: 'Housing',
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name='news/index'
          options={{
            title: 'News',
            header: () => (
              <CustomMenuHeader
                label={translate(TranslationKeys.news)}
                key={'News'}
              />
            ),
          }}
        />
        <Drawer.Screen
          name='course-timetable/index'
          options={{
            header: () => (
              <CustomMenuHeader
                label={translate(TranslationKeys.course_timetable)}
                key={'course_timetable'}
              />
            ),
            title: 'Course Timetable',
          }}
        />
        <Drawer.Screen
          name='settings/index'
          options={{
            title: 'Settings',
            header: () => (
              <CustomMenuHeader
                label={translate(TranslationKeys.settings)}
                key={'settings'}
              />
            ),
          }}
        />
        <Drawer.Screen
          name='faq-food/index'
          options={{
            title: 'FAQ-Food',
          }}
        />
        <Drawer.Screen
          name='faq-living/index'
          options={{
            title: 'FAQ-Living',
          }}
        />

        <Drawer.Screen
          name='management/index'
          options={{
            header: () => (
              <CustomMenuHeader
                label={translate(TranslationKeys.role_management)}
                key={'Management'}
              />
            ),
            title: 'Management',
          }}
        />
        <Drawer.Screen
          name='experimentell/index'
          options={{
            header: () => (
              <CustomMenuHeader
                label={translate(TranslationKeys.experimentell)}
                key={'Experimentell'}
              />
            ),
            title: translate(TranslationKeys.experimentell),
          }}
        />

        <Drawer.Screen
          name='leaflet-map/index'
          options={{
            header: () => (
              <CustomStackHeader
                label={translate(TranslationKeys.leaflet_map)}
                key={'LeafletMap'}
              />
            ),
            title: translate(TranslationKeys.leaflet_map),
          }}
        />

        <Drawer.Screen
          name='vertical-image-scroll/index'
          options={{
            header: () => (
              <CustomStackHeader
                label={translate(TranslationKeys.vertical_image_scroll)}
                key={'vertical_image_scroll'}
              />
            ),
            title: translate(TranslationKeys.vertical_image_scroll),
          }}
        />


        <Drawer.Screen
          name='notification/index'
          options={{
            header: () => (
              <CustomStackHeader
                label={translate(TranslationKeys.notification)}
                key={'notification'}
              />
            ),
            title: translate(TranslationKeys.notification),
          }}
        />
        <Drawer.Screen
          name='events/index'
          options={{
            header: () => (
              <CustomStackHeader
                label={translate(TranslationKeys.events)}
                key={'events'}
              />
            ),
            title: translate(TranslationKeys.events),
          }}
        />
        <Drawer.Screen
          name='support-FAQ/index'
          options={{
            title: translate(TranslationKeys.feedback_support_faq),
            header: () => (
              <CustomStackHeader
                label={translate(TranslationKeys.feedback_support_faq)}
                key={'Feedback Support Faq'}
              />
            ),
          }}
        />

        <Drawer.Screen
          name='feedback-support/index'
          options={{
            title: 'Feedback & Support',
            header: () => (
              <CustomStackHeader
                label={`${translate(TranslationKeys.feedback)} & ${translate(
                  TranslationKeys.support
                )}`}
                key={'Feedback & Support'}
              />
            ),
          }}
        />

        <Drawer.Screen
          name='support-ticket'
          options={{
            title: 'Support Ticket',
            headerShown: false,
          }}
        />

        <Drawer.Screen
          name='licenseInformation/index'
          options={{
            header: () => (
              <CustomStackHeader
                label={translate(TranslationKeys.license_information)}
                key={'license_information'}
              />
            ),
            title: 'License Information',
          }}
        />

        <Drawer.Screen
          name='data-access/index'
          options={{
            title: 'Data Access',
            header: () => (
              <CustomStackHeader
                label={translate(TranslationKeys.dataAccess)}
                key={'Data Access'}
              />
            ),
          }}
        />

        <Drawer.Screen
          name='eating-habits/index'
          options={{
            title: 'Eating Habits',
            header: () => (
              <CustomStackHeader
                label={translate(TranslationKeys.eating_habits)}
                key={'Eating Habits'}
              />
            ),
          }}
        />
        <Drawer.Screen
          name='price-group/index'
          options={{
            title: 'Price Group',
            header: () => (
              <CustomStackHeader
                label={translate(TranslationKeys.price_group)}
                key={'Price Group'}
              />
            ),
          }}
        />

        <Drawer.Screen
          name='form-categories/index'
          options={{
            header: () => (
              <CustomStackHeader
                label={translate(TranslationKeys.select_a_form_category)}
              />
            ),
          }}
        />
        <Drawer.Screen
          name='forms/index'
          options={{
            header: () => (
              <CustomStackHeader
                label={translate(TranslationKeys.select_a_form)}
              />
            ),
          }}
        />
        <Drawer.Screen
          name='form-submissions/index'
          options={{
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name='form-submission/index'
          options={{
            headerShown: false,
          }}
        />
      </Drawer>
    </>
  );
}
