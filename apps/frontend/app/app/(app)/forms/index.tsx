import { Dimensions } from 'react-native';
import AppLoadingView from '@/components/AppLoadingView';
import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { FontAwesome } from '@expo/vector-icons';
import { DatabaseTypes } from 'repo-depkit-common';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAppSelector } from '@/redux/hooks';
import { useDispatch } from 'react-redux';
import { getFromCategoryTranslation } from '@/helper/resourceHelper';
import { FormsHelper } from '@/redux/actions/Forms/Forms';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useLanguage } from '@/hooks/useLanguage';
import { SET_CACHED_FORMS } from '@/redux/Types/types';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import AppScreen from '@/components/AppScreen';
import AppListItem from '@/components/AppListItem';
import AppExpoIcon from '@/components/AppExpoIcon';

const CACHED_COLOR = '#22c55e';

const Index = () => {
	useSetPageTitle(TranslationKeys.select_a_form);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const [loading, setLoading] = useState(false);
	const [isShowingCachedData, setIsShowingCachedData] = useState(false);
	const { category_id } = useLocalSearchParams();
	const { language } = useAppSelector((state) => state.settings);
	const isLtrLanguage = useIsLtrLanguage();
	const isArabic = !isLtrLanguage;
	const [forms, setForms] = useState<DatabaseTypes.Forms[]>([]);
	const formsHelper = new FormsHelper();
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const { cachedFormData, cachedFormsDict } = useAppSelector((state) => state.form);

	const getAllForms = async () => {
		setLoading(true);
		setIsShowingCachedData(false);
		try {
			const result = (await formsHelper.fetchForms({
				filter: { category: { _eq: category_id }, status: { _eq: 'published' } },
			})) as DatabaseTypes.Forms[];
			if (result) {
				setForms(result);
				dispatch({ type: SET_CACHED_FORMS, payload: { category_id: String(category_id), forms: result } });
			}
		} catch {
			const cached = Object.values((cachedFormsDict || {})[String(category_id)] || {}) as DatabaseTypes.Forms[];
			if (cached.length > 0) {
				setForms(cached);
				setIsShowingCachedData(true);
			}
		} finally {
			setLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			if (category_id) {
				getAllForms();
			}
			return () => { };
		}, [category_id])
	);

	useEffect(() => {
		const handleResize = () => setScreenWidth(Dimensions.get('window').width);
		const subscription = Dimensions.addEventListener('change', handleResize);
		return () => subscription?.remove();
	}, []);

	return (
		<AppScreen>
			{loading ? (
				<AppLoadingView size={30} height={200} />
			) : (
				<>
					{forms &&
						forms.map((form) => {
							const formId = String(form?.id);
							const isCached = !!(cachedFormData && cachedFormData[formId]);
							return (
								<AppListItem
									key={form?.id}
									title={(form?.translations ? getFromCategoryTranslation(form?.translations, language) : form?.alias) || ''}
									onPress={() => {
										router.push({
											pathname: '/form-submissions',
											params: { form_id: form?.id },
										});
									}}
									leftIcon={form?.icon_expo ? <AppExpoIcon iconString={form.icon_expo} size={20} color={theme.screen.icon} /> : undefined}
									rightElement={
										isCached ? <FontAwesome name="cloud-download" size={18} color={CACHED_COLOR} /> : null
									}
								/>
							);
						})}
				</>
			)}
		</AppScreen>
	);
};

export default Index;
