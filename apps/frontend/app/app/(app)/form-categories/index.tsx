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
import { SET_CACHED_FORM_CATEGORIES, SET_CACHED_FORMS, SET_CACHED_FORM_DATA, SET_OFFLINE_MODE, CLEAR_CACHED_FORM_DATA, CLEAR_CACHED_FORMS } from '@/redux/Types/types';
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
    const [downloadStage, setDownloadStage] = useState<string | null>(null);
    const [downloadProgressDone, setDownloadProgressDone] = useState(0);
    const [downloadProgressTotal, setDownloadProgressTotal] = useState(0);
    const [downloadSubmissionsCount, setDownloadSubmissionsCount] = useState(0);
    const [downloadAnswersCount, setDownloadAnswersCount] = useState(0);
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
		setDownloadStage('counting_categories');
		setDownloadProgressDone(0);
		setDownloadProgressTotal(0);
		setDownloadSubmissionsCount(0);
		setDownloadAnswersCount(0);
		try {
			// Stage 1: Fetch ALL form categories (regardless of status), limit 1000
			const allCategories = (await formCategoriesHelper.fetchFormCategories({
				limit: 1000,
			})) as DatabaseTypes.FormCategories[];

			const categoriesToProcess = allCategories || [];

			// Stage 2: Load categories + their forms
			setDownloadStage('loading_categories');
			setDownloadProgressTotal(categoriesToProcess.length);
			setDownloadProgressDone(0);

			if (allCategories) {
				dispatch({ type: SET_CACHED_FORM_CATEGORIES, payload: allCategories });
			}

			const allForms: DatabaseTypes.Forms[] = [];
			for (const category of categoriesToProcess) {
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
				setDownloadProgressDone(prev => prev + 1);
			}

			// Stage 3: Count total submissions across all forms
			setDownloadStage('counting_submissions');
			setDownloadProgressDone(0);
			setDownloadProgressTotal(allForms.length);

			// Stage 4: Download submissions + answers (batched) per form
			setDownloadStage('loading_submissions');
			setDownloadProgressDone(0);
			setDownloadProgressTotal(allForms.length);

			const ANSWERS_BATCH_SIZE = 20;
			let totalSubmissions = 0;
			let totalAnswers = 0;

			for (const form of allForms) {
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

					// Batch fetch answers to avoid overly long URLs
					for (let i = 0; i < submissionIds.length; i += ANSWERS_BATCH_SIZE) {
						const batchIds = submissionIds.slice(i, i + ANSWERS_BATCH_SIZE);
						const batchAnswers = (await formAnswersHelper.fetchFormAnswers({
							filter: { form_submission: { _in: batchIds } },
						})) as DatabaseTypes.FormAnswers[];

						(batchAnswers || []).forEach((answer: DatabaseTypes.FormAnswers) => {
							const subId = String(
								typeof answer.form_submission === 'object'
									? (answer.form_submission as any)?.id
									: answer.form_submission
							);
							if (!answersMap[subId]) answersMap[subId] = [];
							answersMap[subId].push(answer);
						});

						totalAnswers += (batchAnswers || []).length;
						setDownloadAnswersCount(totalAnswers);
					}
				}

				// Dispatch intermediate result so UI shows live data during download
				dispatch({
					type: SET_CACHED_FORM_DATA,
					payload: {
						form_id: formId,
						form: formDetails || null,
						submissions: submissionList,
						answers: answersMap,
					},
				});

				totalSubmissions += submissionList.length;
				setDownloadSubmissionsCount(totalSubmissions);
				setDownloadProgressDone(prev => prev + 1);
			}

			toast(translate(TranslationKeys.form_cache_downloaded), 'success');
		} catch {
			// keep existing cache unchanged
		} finally {
			setIsDownloadingAll(false);
			setDownloadStage(null);
			setDownloadProgressDone(0);
			setDownloadProgressTotal(0);
			setDownloadSubmissionsCount(0);
			setDownloadAnswersCount(0);
		}
	};

	const toggleOfflineMode = async () => {
		const newValue = !offlineMode;
		dispatch({ type: SET_OFFLINE_MODE, payload: newValue });
		if (newValue) {
			await downloadAllData();
		} else {
			// Clear all cached form data so a fresh download occurs next time offline mode is enabled
			dispatch({ type: CLEAR_CACHED_FORM_DATA });
			dispatch({ type: CLEAR_CACHED_FORMS });
			dispatch({ type: SET_CACHED_FORM_CATEGORIES, payload: [] });
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

	const getDownloadStageLabel = () => {
		switch (downloadStage) {
			case 'counting_categories':
				return translate(TranslationKeys.form_download_stage_counting_categories);
			case 'loading_categories':
				return `${translate(TranslationKeys.form_download_stage_loading_categories)} (${downloadProgressDone}/${downloadProgressTotal})`;
			case 'counting_submissions':
				return translate(TranslationKeys.form_download_stage_counting_submissions);
			case 'loading_submissions':
				return `${translate(TranslationKeys.form_download_stage_loading_submissions)} (${downloadProgressDone}/${downloadProgressTotal}) – S:${downloadSubmissionsCount} A:${downloadAnswersCount}`;
			default:
				return translate(TranslationKeys.form_cache_downloading);
		}
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
							{isDownloadingAll ? getDownloadStageLabel() : translate(TranslationKeys.form_download_all)}
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
