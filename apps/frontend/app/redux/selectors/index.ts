import { createSelector } from 'reselect';
import { CollectionHelper } from '@/helper/collectionHelper';

// Root state type (you might need to import your actual RootState type)
type RootState = any;

// Canteen selectors
export const getCanteensDict = (state: RootState) => state.canteenReducer.canteensDict;
export const getBuildingsDict = (state: RootState) => state.canteenReducer.buildingsDict;
export const getBusinessHoursDict = (state: RootState) => state.canteenReducer.businessHoursDict;
export const getBusinessHoursGroupsDict = (state: RootState) => state.canteenReducer.businessHoursGroupsDict;
export const getCanteenFeedbackLabelsDict = (state: RootState) => state.canteenReducer.canteenFeedbackLabelsDict;

// Backward compatibility selectors - convert dictionaries back to arrays
export const getCanteensArray = createSelector(
  [getCanteensDict],
  (canteensDict) => CollectionHelper.convertDictToList(canteensDict)
);

export const getBuildingsArray = createSelector(
  [getBuildingsDict],
  (buildingsDict) => CollectionHelper.convertDictToList(buildingsDict)
);

export const getBusinessHoursArray = createSelector(
  [getBusinessHoursDict],
  (businessHoursDict) => CollectionHelper.convertDictToList(businessHoursDict)
);

export const getBusinessHoursGroupsArray = createSelector(
  [getBusinessHoursGroupsDict],
  (businessHoursGroupsDict) => CollectionHelper.convertDictToList(businessHoursGroupsDict)
);

export const getCanteenFeedbackLabelsArray = createSelector(
  [getCanteenFeedbackLabelsDict],
  (canteenFeedbackLabelsDict) => CollectionHelper.convertDictToList(canteenFeedbackLabelsDict)
);

// Food selectors
export const getFoodCategoriesDict = (state: RootState) => state.foodReducer.foodCategoriesDict;
export const getFoodOfferCategoriesDict = (state: RootState) => state.foodReducer.foodOfferCategoriesDict;
export const getFoodOffersInfoItemsDict = (state: RootState) => state.foodReducer.foodOffersInfoItemsDict;
export const getMarkingsDict = (state: RootState) => state.foodReducer.markingsDict;
export const getFoodFeedbackLabelsDict = (state: RootState) => state.foodReducer.foodFeedbackLabelsDict;
export const getPopupEventsDict = (state: RootState) => state.foodReducer.popupEventsDict;

export const getFoodCategoriesArray = createSelector(
  [getFoodCategoriesDict],
  (foodCategoriesDict) => CollectionHelper.convertDictToList(foodCategoriesDict)
);

export const getFoodOfferCategoriesArray = createSelector(
  [getFoodOfferCategoriesDict],
  (foodOfferCategoriesDict) => CollectionHelper.convertDictToList(foodOfferCategoriesDict)
);

export const getFoodOffersInfoItemsArray = createSelector(
  [getFoodOffersInfoItemsDict],
  (foodOffersInfoItemsDict) => CollectionHelper.convertDictToList(foodOffersInfoItemsDict)
);

export const getMarkingsArray = createSelector(
  [getMarkingsDict],
  (markingsDict) => CollectionHelper.convertDictToList(markingsDict)
);

export const getFoodFeedbackLabelsArray = createSelector(
  [getFoodFeedbackLabelsDict],
  (foodFeedbackLabelsDict) => CollectionHelper.convertDictToList(foodFeedbackLabelsDict)
);

export const getPopupEventsArray = createSelector(
  [getPopupEventsDict],
  (popupEventsDict) => CollectionHelper.convertDictToList(popupEventsDict)
);

// Food Attributes selectors
export const getFoodAttributeGroupsDict = (state: RootState) => state.foodAttributesReducer.foodAttributeGroupsDict;
export const getFoodAttributesDict = (state: RootState) => state.foodAttributesReducer.foodAttributesDict;

export const getFoodAttributeGroupsArray = createSelector(
  [getFoodAttributeGroupsDict],
  (foodAttributeGroupsDict) => CollectionHelper.convertDictToList(foodAttributeGroupsDict)
);

export const getFoodAttributesArray = createSelector(
  [getFoodAttributesDict],
  (foodAttributesDict) => CollectionHelper.convertDictToList(foodAttributesDict)
);

// News selectors
export const getNewsDict = (state: RootState) => state.newsReducer.newsDict;

export const getNewsArray = createSelector(
  [getNewsDict],
  (newsDict) => CollectionHelper.convertDictToList(newsDict)
);

// App Elements selectors
export const getAppElementsDict = (state: RootState) => state.appElementsReducer.appElementsDict;

export const getAppElementsArray = createSelector(
  [getAppElementsDict],
  (appElementsDict) => CollectionHelper.convertDictToList(appElementsDict)
);

// Settings selectors (Wikis)
export const getWikisDict = (state: RootState) => state.settingsReducer.wikisDict;

export const getWikisArray = createSelector(
  [getWikisDict],
  (wikisDict) => CollectionHelper.convertDictToList(wikisDict)
);

// Chats selectors
export const getChatsDict = (state: RootState) => state.chatsReducer.chatsDict;

export const getChatsArray = createSelector(
  [getChatsDict],
  (chatsDict) => CollectionHelper.convertDictToList(chatsDict)
);

// Utility selectors for O(1) access
export const getCanteenById = (state: RootState, id: string) => state.canteenReducer.canteensDict[id];
export const getBuildingById = (state: RootState, id: string) => state.canteenReducer.buildingsDict[id];
export const getBusinessHourById = (state: RootState, id: string) => state.canteenReducer.businessHoursDict[id];
export const getBusinessHourGroupById = (state: RootState, id: string) => state.canteenReducer.businessHoursGroupsDict[id];
export const getCanteenFeedbackLabelById = (state: RootState, id: string) => state.canteenReducer.canteenFeedbackLabelsDict[id];

export const getFoodCategoryById = (state: RootState, id: string) => state.foodReducer.foodCategoriesDict[id];
export const getFoodOfferCategoryById = (state: RootState, id: string) => state.foodReducer.foodOfferCategoriesDict[id];
export const getFoodOffersInfoItemById = (state: RootState, id: string) => state.foodReducer.foodOffersInfoItemsDict[id];
export const getMarkingById = (state: RootState, id: string) => state.foodReducer.markingsDict[id];
export const getFoodFeedbackLabelById = (state: RootState, id: string) => state.foodReducer.foodFeedbackLabelsDict[id];
export const getPopupEventById = (state: RootState, id: string) => state.foodReducer.popupEventsDict[id];

export const getFoodAttributeGroupById = (state: RootState, id: string) => state.foodAttributesReducer.foodAttributeGroupsDict[id];
export const getFoodAttributeById = (state: RootState, id: string) => state.foodAttributesReducer.foodAttributesDict[id];

export const getNewsById = (state: RootState, id: string) => state.newsReducer.newsDict[id];
export const getAppElementById = (state: RootState, id: string) => state.appElementsReducer.appElementsDict[id];
export const getWikiById = (state: RootState, id: string) => state.settingsReducer.wikisDict[id];
export const getChatById = (state: RootState, id: string) => state.chatsReducer.chatsDict[id];