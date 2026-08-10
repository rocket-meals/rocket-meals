import React from 'react';
import { FontAwesome, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { DatabaseTypes, StringHelper } from 'repo-depkit-common';

export type TranslationEntry = {
	languages_code: string;
	[key: string]: any;
};

const getIconComponent = (iconString: string, iconColor: string): React.JSX.Element | null => {
	if (!iconString) return null;

	const [library, iconName] = iconString.split(':') as [string, string];

	switch (library) {
		case 'MaterialCommunityIcons':
			return <MaterialCommunityIcons name={iconName as any} size={24} color={iconColor} />;
		case 'MaterialIcons':
			return <MaterialIcons name={iconName as any} size={24} color={iconColor} />;
		case 'FontAwesome':
			return <FontAwesome name={iconName as any} size={24} color={iconColor} />;
		default:
			console.warn(`Icon library "${library}" is not supported`);
			return null;
	}
};

interface Translation {
	languages_code: string | DatabaseTypes.Languages | null;
	text?: string | null;
	name?: string | null;
	content?: string | null;
	description?: string | null;
	title?: string | null;
}

const getTextFromTranslation = (translations: Array<Partial<Translation>> | null | undefined, languageCode: string): string => {
	if (!translations || translations.length === 0) return '';
	const translation = translations.find(t => (t.languages_code as string)?.split('-')[0] === languageCode);
	return translation?.text || translation?.name || translation?.content || '';
};

export const getIntroDescriptionTranslation = (translations: Array<any>, languageCode: string): string => {
	if (!translations || translations.length === 0) return '';
	const translation = translations.find(t => t.languages_code?.split('-')[0] === languageCode);
	return translation?.intro_description || '';
};

export const getDetailedDescriptionTranslation = (translations: Array<any>, languageCode: string): string => {
	if (!translations || translations.length === 0) return '';
	const translation = translations.find(t => t.languages_code?.split('-')[0] === languageCode);
	return translation?.detailed_description || '';
};

const getNameFromTranslation = (translations: Array<{ languages_code?: string | DatabaseTypes.Languages | null; name?: string | null }> | null | undefined, languageCode: string): string => {
	if (!translations || translations.length === 0) return '';
	const translation = translations.find(t => (t.languages_code as string)?.split('-')[0] === languageCode);
	return translation?.name || '';
};

export const getFromCategoryTranslation = (translations: Array<DatabaseTypes.FormCategoriesTranslations | DatabaseTypes.FormsTranslations | DatabaseTypes.FormFieldsTranslations>, languageCode: string): string =>
	getNameFromTranslation(translations, languageCode);

export const getFoodAttributesTranslation = (translations: Array<Partial<DatabaseTypes.FoodsAttributesTranslations> | Partial<Translation>> | null | undefined, languageCode: string): string =>
	getNameFromTranslation(translations, languageCode);

const getFoodCategoryName = (categories: DatabaseTypes.FoodsCategories[], category: string | DatabaseTypes.FoodsCategories | null | undefined, languageCode: string): string => {
	if (!category) return '';
	const cat = typeof category === 'object' ? category : categories.find(c => c.id === category);
	if (!cat) return '';
	const translations: DatabaseTypes.FoodsCategoriesTranslations[] = (cat.translations as DatabaseTypes.FoodsCategoriesTranslations[]) || [];
	const translation = translations.find(t => (t.languages_code as string)?.split('-')[0] === languageCode);
	return translation?.name || '';
};

const getFoodOfferCategoryName = (categories: DatabaseTypes.FoodoffersCategories[], category: string | DatabaseTypes.FoodoffersCategories | null | undefined, languageCode: string): string => {
	if (!category) return '';
	const cat = typeof category === 'object' ? category : categories.find(c => c.id === category);
	if (!cat) return '';
	const translations: DatabaseTypes.FoodoffersCategoriesTranslations[] = (cat.translations as DatabaseTypes.FoodoffersCategoriesTranslations[]) || [];
	const translation = translations.find(t => (t.languages_code as string)?.split('-')[0] === languageCode);
	return translation?.name || '';
};

export const getFromDescriptionTranslation = (translations: Array<DatabaseTypes.FormFieldsTranslations>, languageCode: string): string => {
	if (!translations || translations.length === 0) return '';
	const translation = translations.find(t => (t.languages_code as string)?.split('-')[0] === languageCode);
	return translation?.description || '';
};

export const getTitleFromTranslation = (translations: Array<Translation | DatabaseTypes.WikisTranslations>, languageCode: string): string => {
	if (!translations || translations.length === 0) return '';
	const translation = translations.find(t => t.languages_code?.toString()?.split('-')[0] === languageCode);
	return translation?.title || '';
};

const getDescriptionFromTranslation = (translations: Array<Translation | DatabaseTypes.MarkingsTranslations>, languageCode: string): string => {
	if (!translations || translations.length === 0) return '';

	const prioritizedTranslation = translations.find(t => t.languages_code?.toString()?.split('-')[0] === languageCode && Boolean(t.description));

	// Fall back to any translation matching the language code
	const fallbackTranslation = translations.find(t => t.languages_code?.toString()?.split('-')[0] === languageCode);

	const translation = prioritizedTranslation || fallbackTranslation;
	return translation?.description || '';
};

const extractFoodDetails = (food: DatabaseTypes.Foods) => {
	const { fat_g, protein_g, saturated_fat_g, sugar_g, carbohydrate_g, calories_kcal, fiber_g, salt_g } = food as any;

	return {
		fat_g,
		protein_g,
		saturated_fat_g,
		sugar_g,
		carbohydrate_g,
		calories_kcal,
		fiber_g,
		salt_g,
	};
};


const DEFAULT_LANGUAGE_CODE_GERMAN = 'de';
const FALLBACK_LANGUAGE_CODE_ENGLISH = 'en';
const MISSING_TRANSLATION = 'Missing translation';

export function getDirectusTranslation(params: any, translations: TranslationEntry[], field: string, ignoreFallbackLanguage?: boolean, fallback_text?: string | null): string {
	const languageCode = params?.languageCode || FALLBACK_LANGUAGE_CODE_ENGLISH;

        const translationDict = translations.reduce(
                (acc, translation) => {
                        acc[translation.languages_code] = translation;

                        const [baseLanguageCode] = translation.languages_code?.split?.('-') || [];
                        if (baseLanguageCode && !acc[baseLanguageCode]) {
                                acc[baseLanguageCode] = translation;
                        }

                        return acc;
                },
                {} as { [key: string]: TranslationEntry }
        );

	const getTranslation = (dict: { [key: string]: TranslationEntry }, langCode: string, params?: any) => {
		const languageKey = langCode?.split('-')[0];
		const translationEntry = dict[langCode] || dict[languageKey];
		if (!translationEntry) return null;

		let translation = translationEntry[field];
		if (params) {
			Object.keys(params).forEach(key => {
				translation = StringHelper.replaceAllWithOptions({
					str: translation,
					find: `%${key}`,
					replace: params[key],
				});
			});
		}
		return translation;
	};

	// Try to get the translation for the requested language
	let translation = getTranslation(translationDict, languageCode, params);
	if (translation) return translation;

	// If not found, fallback to English (en)
	translation = getTranslation(translationDict, FALLBACK_LANGUAGE_CODE_ENGLISH, params);
	if (translation) return translation;

	// Optionally fallback to German (de) if needed
	if (!ignoreFallbackLanguage) {
		translation = getTranslation(translationDict, DEFAULT_LANGUAGE_CODE_GERMAN, params);
		if (translation) return translation;
	}

	// Return fallback text or "Missing translation" if nothing is found
	return fallback_text || `${MISSING_TRANSLATION}(${field})`;
}

const MAX_RATING = 5;
const MIN_RATING = 1;
const MINIMUM_RATING_AS_FAVORITE = (MAX_RATING + MIN_RATING) / 2;

export function isRatingPositive(rating: number | null | undefined): boolean {
	return rating !== null && rating !== undefined && rating >= MINIMUM_RATING_AS_FAVORITE;
}

export function isRatingNegative(rating: number | null | undefined): boolean {
	return rating !== null && rating !== undefined && rating < MINIMUM_RATING_AS_FAVORITE;
}

/**
 * Resolves the display name of a foodoffer in the given language.
 * Prefers the foodoffer's own translation; when the foodoffer has no translation,
 * the translation of the related food is used instead.
 */
export function getFoodOfferName(foodoffer: DatabaseTypes.Foodoffers | null | undefined, languageCode: string): string {
	if (!foodoffer) return '';
	const offerName = getTextFromTranslation(foodoffer.translations as Array<Partial<Translation>>, languageCode);
	if (offerName) return offerName;
	const food = typeof foodoffer.food === 'object' ? (foodoffer.food as DatabaseTypes.Foods | null) : null;
	return getTextFromTranslation(food?.translations as Array<Partial<Translation>> | undefined, languageCode);
}

export function getFoodName(food: string | DatabaseTypes.Foods | null | undefined, languageCode: string) {
	if (typeof food === 'object' && food !== null) {
		const translations = food.translations as TranslationEntry[];
		const translation = getDirectusTranslation({ languageCode }, translations, 'name', false, food.alias);
		if (translation) {
			return translation.charAt(0).toUpperCase() + translation.slice(1);
		}
		if (food?.alias) {
			return food.alias.charAt(0).toUpperCase() + food.alias.slice(1);
		}
	}
	return null;
}

export const getNewsTranslationByLanguageCode = (translations: DatabaseTypes.NewsTranslations[], languageCode: string): any => {
        if (!translations || translations.length === 0) return '';

	const translation = translations?.find(item => item.languages_code?.toString().split('-')[0] === languageCode);

        if (translation) {
                return {
                        title: translation.title,
                        content: translation.content,
                };
        }
};

export const getCollectibleEventTranslation = (
        translations: DatabaseTypes.CollectibleEventsTranslations[] | undefined,
        languageCode: string,
        fallbackTitle?: string | null,
        fallbackDescription?: string | null
) => {
        translations = translations ?? [];

        const title = getDirectusTranslation({ languageCode }, translations as any, 'title', false, fallbackTitle || '');
        const description = getDirectusTranslation(
                { languageCode },
                translations as any,
                'description',
                false,
                fallbackDescription || ''
        );

        return { title, description };
};

export const getBuildingTranslationByLanguageCode = (translations: DatabaseTypes.BuildingsTranslations[], languageCode: string) => {
	if (!translations || translations.length === 0) return '';

	const translation = translations?.find(item => item.languages_code?.toString().split('-')[0] === languageCode);

	if (translation?.content) {
		return translation?.content || '';
	}
};

export const getAppElementTranslation = (translations: DatabaseTypes.AppElementsTranslations[] | any[], languageCode: string): any => {
	if (!translations || translations.length === 0) return '';

	const translation = translations?.find(item => item.languages_code?.toString().split('-')[0] === languageCode);

	if (translation) {
		return {
			content: translation?.content || '',
			popup_button_text: translation.popup_button_text || '',
			popup_content: translation.popup_content || '',
		};
	}
};

export { getIconComponent, getTextFromTranslation, getDescriptionFromTranslation, getFoodCategoryName, getFoodOfferCategoryName };








