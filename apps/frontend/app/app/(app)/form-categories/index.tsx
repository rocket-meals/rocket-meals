import { ActivityIndicator, Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { Entypo, FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FormCategoriesHelper } from '@/redux/actions/Forms/FormCategories';
import { FormsHelper } from '@/redux/actions/Forms/Forms';
import { FormsSubmissionsHelper } from '@/redux/actions/Forms/FormSubmitions';
import { FormAnswersHelper } from '@/redux/actions/Forms/FormAnswers';
import { DatabaseTypes } from 'repo-depkit-common';
import { router, useFocusEffect } from 'expo-router';
import { useAppSelector } from '@/redux/hooks';
import { useDispatch } from 'react-redux';
import { getFromCategoryTranslation } from '@/helper/resourceHelper';
import { iconLibraries } from '@/components/Drawer/CustomDrawerContent';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { SET_CACHED_FORM_CATEGORIES, SET_CACHED_FORMS, SET_CACHED_FORM_DATA, SET_OFFLINE_MODE } from '@/redux/Types/types';
import { useLanguage } from '@/hooks/useLanguage';
import useToast from '@/hooks/useToast';
import SettingsListBoolean from '@/components/SettingsListBoolean/SettingsListBoolean';

const Index = () => {
	useSetPageTitle(TranslationKeys.select_a_form_category);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const toast = useToast();
	const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [isShowingCachedData, setIsShowingCachedData] = useState(false);
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const { language, offlineMode } = useAppSelector((state) => state.settings);
    const [formCategories, setFormCategories] = useState<DatabaseTypes.FormCategories[]>([]);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const formCategoriesHelper = new FormCategoriesHelper();
	const formsHelper = new FormsHelper();
	const formsSubmissionsHelper = new FormsSubmissionsHelper();
	const formAnswersHelper = new FormAnswersHelper();
	const { cachedFormCategories, cachedForms, formQueue } = useAppSelector((state) => state.form);

	const queueCount = (formQueue || []).length;

	const getAllCategories = async () => {
		setLoading(true);
		setIsShowingCachedData(false);

		if (offlineMode) {
			// In offline mode, use cache only
			const cached = cachedFormCategories || [];
			setFormCategories(cached);
			if (cached.length > 0) setIsShowingCachedData(true);
			setLoading(false);
			return;
		}

		try {
			const result = (await formCategoriesHelper.fetchFormCategories({
				filter: { status: { _eq: 'published' } },
			})) as DatabaseTypes.FormCategories[];

			if (result) {
				setFormCategories(result);
				dispatch({ type: SET_CACHED_FORM_CATEGORIES, payload: result });
			}
		} catch {
			// Network failed – fall back to locally cached data
			const cached = cachedFormCategories || [];
			if (cached.length > 0) {
				setFormCategories(cached);
				setIsShowingCachedData(true);
			}
		} finally {
			setLoading(false);
		}
	};

	const downloadAllData = async () => {
		if (isDownloadingAll) return;
		setIsDownloadingAll(true);
		try {
			// 1. Fetch ALL form categories (regardless of status), limit 1000
			const allCategories = (await formCategoriesHelper.fetchFormCategories({
				limit: 1000,
			})) as DatabaseTypes.FormCategories[];

			if (allCategories) {
				dispatch({ type: SET_CACHED_FORM_CATEGORIES, payload: allCategories });
			}

			const categoriesToProcess = allCategories || [];

			// 2. For each category, fetch ALL forms (regardless of status), limit 1000
			const allForms: DatabaseTypes.Forms[] = [];
			await Promise.allSettled(
				categoriesToProcess.map(async (category) => {
					const categoryId = String(category.id);
					const categoryForms = (await formsHelper.fetchForms({
						filter: {
							category: { _eq: categoryId },
						},
						limit: 1000,
					})) as DatabaseTypes.Forms[];

					if (categoryForms) {
						allForms.push(...categoryForms);
						dispatch({ type: SET_CACHED_FORMS, payload: { category_id: categoryId, forms: categoryForms } });
					}
				})
			);

			// 3. For each form, fetch all submissions with state != 'closed', limit 1000, and bulk-fetch answers
			await Promise.allSettled(
				allForms.map(async (form) => {
					const formId = String(form.id);
					const [formDetails, submissions] = await Promise.all([
						formsHelper.fetchFormsById(formId) as Promise<DatabaseTypes.Forms | null>,
						formsSubmissionsHelper.fetchFormSubmissions({
							limit: 1000,
							filter: {
								form: { _eq: formId },
								state: { _neq: 'closed' },
							},
						}) as Promise<DatabaseTypes.FormSubmissions[]>,
					]);

					const submissionList = submissions || [];
					const answersMap: Record<string, DatabaseTypes.FormAnswers[]> = {};

					if (submissionList.length > 0) {
						const submissionIds = submissionList.map((s) => String(s.id));
						const allAnswers = (await formAnswersHelper.fetchFormAnswers({
							filter: { form_submission: { _in: submissionIds } },
						})) as DatabaseTypes.FormAnswers[];

						(allAnswers || []).forEach((answer: DatabaseTypes.FormAnswers) => {
							const subId = String(
								typeof answer.form_submission === 'object'
									? (answer.form_submission as any)?.id
									: answer.form_submission
							);
							if (!answersMap[subId]) answersMap[subId] = [];
							answersMap[subId].push(answer);
						});
					}

					dispatch({
						type: SET_CACHED_FORM_DATA,
						payload: {
							form_id: formId,
							form: formDetails || null,
							submissions: submissionList,
							answers: answersMap,
						},
					});
				})
			);

			toast(translate(TranslationKeys.form_cache_downloaded), 'success');
		} catch {
			// keep existing cache unchanged
		} finally {
			setIsDownloadingAll(false);
		}
	};

	const toggleOfflineMode = async () => {
		const newValue = !offlineMode;
		dispatch({ type: SET_OFFLINE_MODE, payload: newValue });
		if (newValue) {
			await downloadAllData();
		}
	};

	useFocusEffect(
		useCallback(() => {
			getAllCategories();
			return () => {};
		}, [offlineMode])
	);

	useEffect(() => {
		const handleResize = () => setScreenWidth(Dimensions.get('window').width);
		const subscription = Dimensions.addEventListener('change', handleResize);
		return () => subscription?.remove();
	}, []);

	const isCategoryCached = (categoryId: string | number) => {
		const key = String(categoryId);
		return !!(cachedForms && cachedForms[key] && cachedForms[key].length > 0);
	};

	return (
		<ScrollView style={{ ...styles.container, backgroundColor: theme.screen.background }} contentContainerStyle={{ ...styles.contentContainer }}>
			<View
				style={{
					...styles.formCategories,
					width: screenWidth > 600 ? '80%' : '90%',
				}}
			>
				{/* Top action row: download button + queue button */}
				<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 6 }}>
					<TouchableOpacity
						onPress={downloadAllData}
						disabled={isDownloadingAll || loading}
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							gap: 6,
							paddingVertical: 8,
							paddingHorizontal: 14,
							borderRadius: 20,
							backgroundColor: theme.screen.iconBg,
						}}
					>
						{isDownloadingAll ? (
							<ActivityIndicator size={18} color={theme.screen.icon} />
						) : (
							<FontAwesome name="cloud-download" size={20} color={theme.screen.icon} />
						)}
						<Text style={{ color: theme.screen.text, fontFamily: 'Poppins_400Regular', fontSize: 14 }}>
							{isDownloadingAll ? translate(TranslationKeys.form_cache_downloading) : translate(TranslationKeys.form_download_all)}
						</Text>
					</TouchableOpacity>

					{/* Queue button */}
					<TouchableOpacity
						onPress={() => router.push('/form-queue')}
						style={{
							padding: 10,
							borderRadius: 20,
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<View>
							<MaterialCommunityIcons
								name="clock-outline"
								size={22}
								color={theme.screen.icon}
							/>
							{queueCount > 0 && (
								<View
									style={{
										position: 'absolute',
										top: -4,
										right: -4,
										backgroundColor: 'red',
										borderRadius: 8,
										minWidth: 16,
										height: 16,
										justifyContent: 'center',
										alignItems: 'center',
										paddingHorizontal: 2,
									}}
								>
									<Text style={{ color: 'white', fontSize: 10, fontFamily: 'Poppins_700Bold' }}>{queueCount}</Text>
								</View>
							)}
						</View>
					</TouchableOpacity>
				</View>

				{/* Offline mode toggle */}
				<SettingsListBoolean
					isEnabled={!!offlineMode}
					onToggle={toggleOfflineMode}
					disabled={isDownloadingAll}
					leftIcon={<Ionicons name="cloud-offline-outline" size={20} />}
					title={translate(TranslationKeys.form_offline_mode)}
					groupPosition="single"
				/>

				{/* Category list */}
				{loading ? (
					<View
						style={{
							height: 200,
							width: '100%',
							justifyContent: 'center',
							alignItems: 'center',
						}}
					>
						<ActivityIndicator size={30} color={theme.screen.text} />
					</View>
				) : (
					<>
						{formCategories &&
							formCategories?.map((category) => {
								let IconComponent: any = null;
								let iconName = '';
								if (category?.icon_expo) {
									const [library, name] = category?.icon_expo?.split(':') ?? [];
									if (iconLibraries[library]) {
										IconComponent = iconLibraries[library];
										iconName = name;
									}
								}
								const cached = isCategoryCached(category.id);
								return (
									<TouchableOpacity
										style={{
											...styles.formCategory,
											backgroundColor: theme.screen.iconBg,
										}}
										key={category?.id}
										onPress={() => {
											router.push({
												pathname: '/forms',
												params: { category_id: category?.id },
											});
										}}
									>
										<View style={styles.col}>
											{IconComponent && <IconComponent name={iconName} size={20} color={theme.screen.icon} />}
											<Text style={{ ...styles.body, color: theme.screen.text }}>{category?.translations ? getFromCategoryTranslation(category?.translations, language) : category?.alias}</Text>
										</View>
										<View style={styles.rowEnd}>
											{cached && (
												<FontAwesome name="cloud-download" size={16} color={offlineMode ? 'green' : theme.screen.icon} />
											)}
											{isShowingCachedData && (
												<MaterialCommunityIcons name="cached" size={18} color={theme.screen.icon} />
											)}
											<Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />
										</View>
									</TouchableOpacity>
								);
							})}
					</>
				)}
			</View>
		</ScrollView>
	);
};

export default Index;
