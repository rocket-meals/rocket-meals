import { useMemo } from 'react';
import { useAppSelector } from '@/redux/hooks';
import { useLanguage } from '@/hooks/useLanguage';
import { getFoodCategoryName, getFoodOfferCategoryName } from '@/helper/resourceHelper';
import { TranslationKeys } from '@/locales/keys';

interface UseFoodAttributesProps {
    foodAttributes: any[];
    foodDetails: any;
}

export const useFoodAttributes = ({ foodAttributes, foodDetails }: UseFoodAttributesProps) => {
    const { language: languageCode, translate } = useLanguage();
    const { foodAttributeGroups } = useAppSelector((state) => state.foodAttributes);
    const { foodCategories, foodOfferCategories } = useAppSelector((state) => state.food);

    const groupedAttributes = useMemo(() => {
        if (!foodAttributeGroups || !foodAttributes) return [];

        const grouped = foodAttributeGroups?.map((group: any) => {
            const attributes = foodAttributes
                ?.filter((attr: any) => attr?.food_attribute?.group === group?.id)
                ?.sort((a: any, b: any) => {
                    const sortA = a?.food_attribute?.sort || 0;
                    const sortB = b?.food_attribute?.sort || 0;
                    return sortA - sortB;
                });

            return {
                ...group,
                attributes: attributes || [],
            };
        });

        const generalAttributes: any[] = [];
        if (foodDetails && foodCategories.length) {
            const name = getFoodCategoryName(foodCategories, foodDetails.food_category, languageCode);
            if (name) {
                generalAttributes.push({
                    id: 'food_category',
                    string_value: name,
                    food_attribute: {
                        status: 'published',
                        translations: [
                            {
                                languages_code: languageCode,
                                name: translate(TranslationKeys.food_category_label),
                            },
                        ],
                    },
                });
            }
        }

        if (foodDetails && foodOfferCategories.length && foodDetails.foodoffer_category) {
            const name = getFoodOfferCategoryName(foodOfferCategories, foodDetails.foodoffer_category, languageCode);
            if (name) {
                generalAttributes.push({
                    id: 'foodoffer_category',
                    string_value: name,
                    food_attribute: {
                        status: 'published',
                        translations: [
                            {
                                languages_code: languageCode,
                                name: translate(TranslationKeys.foodoffer_category_label),
                            },
                        ],
                    },
                });
            }
        }

        if (generalAttributes.length) {
            grouped?.push({
                id: 'general',
                translations: [{ languages_code: languageCode, name: translate(TranslationKeys.general) }],
                attributes: generalAttributes,
            });
        }

        return grouped;
    }, [foodAttributeGroups, foodAttributes, foodDetails, foodCategories, foodOfferCategories, languageCode, translate]);

    return { groupedAttributes };
};
