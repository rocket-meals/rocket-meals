import { useState, useEffect, useCallback } from 'react';
import { runAfterInteractions } from '@/helper/interactionHelper';
import { fetchFoodDetailsById, fetchFoodOffersDetailsById, isFoodOfferNotFoundError } from '@/redux/actions/FoodOffers/FoodOffers';
import { invalidateFoodOffers } from '@/helper/foodOffersInvalidation';
import { DatabaseTypes, isSameBaseLanguage } from 'repo-depkit-common';
import { useLanguage } from '@/hooks/useLanguage';
import useToast from '@/hooks/useToast';
import { TranslationKeys } from '@/locales/keys';

interface UseFoodDetailsProps {
    offerId?: string | string[];
    initialFoodId?: string | string[];
    /** The food offer the caller already has (e.g. from the list), shown until the details are loaded */
    initialFoodOffer?: DatabaseTypes.Foodoffers | null;
    /** Called when the offer no longer exists, so the caller can close the outdated details */
    onOfferNoLongerAvailable?: () => void;
    /**
     * When the offer no longer exists but a food id is known, show the food's details
     * instead (e.g. a dish shared in a chat days ago - its offer is long replaced)
     */
    showFoodWhenOfferMissing?: boolean;
}

type TranslationWithName = {
    languages_code?: unknown;
    name?: string | null;
};

const findTranslationForLanguage = <T extends TranslationWithName>(
    translations: T[] | undefined | null,
    languageCode: string | undefined
) => {
    // The app stores the full code ("de-DE"), rows may be "de-DE", "de-AT" or the expanded relation
    return translations?.find((val: T) => {
        const code = typeof val?.languages_code === 'string' ? val.languages_code : (val?.languages_code as DatabaseTypes.Languages | undefined)?.code;
        return isSameBaseLanguage(code, languageCode);
    });
};

const applyFoodOfferDetailsResponse = (
    foodData: any,
    languageCode: string | undefined,
    translateDynamic: (value: any) => any,
    setFoodDetails: (value: any) => void,
    setFoodAttributes: (value: any) => void
) => {
    if (!foodData?.data) return;

    const { food, attribute_values, foodoffer_category, translations: foodofferTranslations } = foodData?.data ?? {};

    // Prefer the foodoffer's own translation; fall back to the food's translation when empty
    const foodofferTranslation = findTranslationForLanguage(
        foodofferTranslations as DatabaseTypes.FoodoffersTranslations[] | undefined,
        languageCode
    );
    const foodTranslation = findTranslationForLanguage(
        food?.translations as DatabaseTypes.FoodsTranslations[] | undefined,
        languageCode
    );
    const name = foodofferTranslation?.name || foodTranslation?.name || null;
    setFoodDetails({
        ...food,
        foodoffer_category,
        name: name ? translateDynamic(name) : null,
    });
    if (attribute_values) {
        setFoodAttributes(attribute_values);
    }
};

const applyFoodDetailsResponse = (
    foodData: any,
    languageCode: string | undefined,
    translateDynamic: (value: any) => any,
    setFoodDetails: (value: any) => void,
    setFoodAttributes: (value: any) => void
) => {
    if (!foodData?.data) return;

    const food = foodData.data;
    const translation = findTranslationForLanguage(food?.translations, languageCode);
    const rawName = translation?.name ?? food?.name ?? null;
    setFoodDetails({
        ...food,
        name: rawName ? translateDynamic(rawName) : null,
    });

    const attributes = food?.attribute_values || food?.foods_attributes_values;
    if (attributes) {
        setFoodAttributes(attributes);
    }
};

const getFirstRouteParam = (value: string | string[] | undefined) => {
    return Array.isArray(value) ? value[0] : value;
};

const shouldFallBackToFood = (showFoodWhenOfferMissing: boolean | undefined, foodId: string | undefined, offerError: unknown) => {
    return Boolean(showFoodWhenOfferMissing && foodId && isFoodOfferNotFoundError(offerError));
};

export const useFoodDetails = ({ offerId, initialFoodId, initialFoodOffer, onOfferNoLongerAvailable, showFoodWhenOfferMissing }: UseFoodDetailsProps) => {
    const { language: languageCode, translate, translateDynamic } = useLanguage();
    const toast = useToast();
    // Start with the offer the caller already has, so name, image and attributes show at once.
    // The request below then replaces it with the full details (e.g. the comments).
    const [initialState] = useState(() => {
        const state: { foodDetails: any; foodAttributes: any } = { foodDetails: null, foodAttributes: [] };
        // Only an offer with its food expanded carries what the details show
        if (initialFoodOffer && typeof initialFoodOffer.food === 'object' && initialFoodOffer.food) {
            applyFoodOfferDetailsResponse(
                { data: initialFoodOffer },
                languageCode,
                translateDynamic,
                value => { state.foodDetails = value; },
                value => { state.foodAttributes = value; }
            );
        }
        return state;
    });
    const [foodDetails, setFoodDetails] = useState<any>(initialState.foodDetails);
    const [foodAttributes, setFoodAttributes] = useState<any>(initialState.foodAttributes);
    const [loading, setLoading] = useState(false);
    const hasInitialData = !!initialState.foodDetails;

    const getFoodDetails = useCallback(async () => {
        const id = getFirstRouteParam(offerId);
        const foodId = getFirstRouteParam(initialFoodId);

        if (!id && !foodId) return;

        const loadFood = async (foodIdToLoad: string) => {
            const foodData = await fetchFoodDetailsById(foodIdToLoad);
            applyFoodDetailsResponse(foodData, languageCode, translateDynamic, setFoodDetails, setFoodAttributes);
        };

        setLoading(true);
        try {
            if (id) {
                try {
                    const foodData = await fetchFoodOffersDetailsById(id.toString(), languageCode);
                    applyFoodOfferDetailsResponse(foodData, languageCode, translateDynamic, setFoodDetails, setFoodAttributes);
                } catch (offerError) {
                    if (!foodId || !shouldFallBackToFood(showFoodWhenOfferMissing, foodId, offerError)) {
                        throw offerError;
                    }
                    await loadFood(foodId.toString());
                }
            } else if (foodId) {
                await loadFood(foodId.toString());
            }
        } catch (e: any) {
            console.error('Error fetching food details: ', e);
            if (id && isFoodOfferNotFoundError(e)) {
                // The list still held an offer the food import has replaced since - reload it
                toast(translate(TranslationKeys.foodoffer_outdated_list_reloaded), 'info');
                invalidateFoodOffers();
                onOfferNoLongerAvailable?.();
            } else {
                toast(translate(TranslationKeys.somethingWentWrong), 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [offerId, initialFoodId, languageCode, translateDynamic, toast, translate, onOfferNoLongerAvailable, showFoodWhenOfferMissing]);

    useEffect(() => {
        runAfterInteractions(() => {
            getFoodDetails();
        });
    }, [getFoodDetails]);

    // With data from the caller the attributes are already visible, no spinner over them
    return { foodDetails, foodAttributes, loading: loading && !hasInitialData };
};
