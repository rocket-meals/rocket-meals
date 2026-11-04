import { Dimensions, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { Entypo, FontAwesome, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { DatabaseTypes } from 'repo-depkit-common';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { isWeb } from '@/constants/Constants';
import { FormsSubmissionsHelper } from '@/redux/actions/Forms/FormSubmitions';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import FilterFormSheet from '@/components/FilterFormSheet/FilterFormSheet';
import { excerpt } from '@/constants/HelperFunctions';
import { filterOptions } from './constants';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import FormSubmissionSortSheet from '@/components/FormSubmissionSortSheet/FormSubmissionSortSheet';
import { FormSubmissionSortOption } from '@/components/FormSubmissionSortSheet/types';
import { useAppSelector } from '@/redux/hooks';
import { FormQueueEntry } from '@/redux/Types/stateTypes';

type FormSubmissionListRow =
	| {
			type: 'folder';
			id: string;
			title: string;
			path: string[];
	  }
	| {
			type: 'submission';
			id: string;
			title: string;
			submission: DatabaseTypes.FormSubmissions;
	  };

/**
 * Resolve the main list area content: loading indicator, the actual list,
 * or an empty-state message. Called directly (not rendered as a JSX tag),
 * so it does not introduce a new component identity.
 */
function resolveSubmissionsContent(
	loading: boolean,
	formSubmissions: DatabaseTypes.FormSubmissions[],
	listData: FormSubmissionListRow[],
	renderItem: (info: { item: FormSubmissionListRow }) => React.ReactElement,
	theme: any,
	translate: (key: string) => string
): React.ReactNode {
	if (loading) {
		return (
			<View
				style={{
					height: 200,
					width: '100%',
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<LoadingIndicator size={30} color={theme.screen.text} />
			</View>
		);
	}

	if (formSubmissions?.length > 0) {
		return <FlatList data={listData} keyExtractor={item => item.id} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 10 }} />;
	}

	return (
		<View style={{ padding: 20, alignItems: 'center' }}>
			<Text style={{ color: theme.screen.text, fontSize: 16 }}>{translate(TranslationKeys.no_data_found)}</Text>
		</View>
	);
}

/**
 * Whether any cached answer of a submission contains the (already lowercased)
 * search term, matching the online search which also looks into the form
 * contents (`value_string` / `value_number`).
 */
function cachedAnswersMatchQuery(answers: DatabaseTypes.FormAnswers[] | undefined, filterQuery: string): boolean {
	if (!answers || answers.length === 0) {
		return false;
	}

	return answers.some(answer => {
		const valueString = typeof answer?.value_string === 'string' ? answer.value_string.toLowerCase() : '';
		if (valueString.includes(filterQuery)) {
			return true;
		}

		const valueNumber = answer?.value_number;
		if (valueNumber === null || valueNumber === undefined) {
			return false;
		}

		return String(valueNumber).toLowerCase().includes(filterQuery);
	});
}

/**
 * Filter cached (offline) form submissions by the currently selected state
 * and the free-text query. Mirrors the filtering previously inlined in
 * both the offline branch and the network-error fallback branch of
 * loadFormSubmissions, and — like the online search — matches the alias as
 * well as the cached answers of the submission.
 */
function filterCachedSubmissions(
	cached: DatabaseTypes.FormSubmissions[],
	selectedOption: string,
	query: string,
	cachedAnswers: Record<string, DatabaseTypes.FormAnswers[]> = {}
): DatabaseTypes.FormSubmissions[] {
	const filterState = selectedOption || 'draft';
	const filterQuery = query ? query.trim().toLowerCase() : '';

	return cached.filter((s: DatabaseTypes.FormSubmissions) => {
		const stateMatch = s.state === filterState;
		if (!stateMatch) {
			return false;
		}
		if (!filterQuery) {
			return true;
		}

		const aliasMatch = (s.alias || '').toLowerCase().includes(filterQuery);
		return aliasMatch || cachedAnswersMatchQuery(cachedAnswers[String(s.id)], filterQuery);
	});
}

/**
 * Replace the current submissions list with a (already sorted) result.
 * Extracted since this was repeated three times inside loadFormSubmissions.
 */
function replaceSortedSubmissions(
	setFormSubmissions: React.Dispatch<React.SetStateAction<DatabaseTypes.FormSubmissions[]>>,
	sortedResult: DatabaseTypes.FormSubmissions[]
): void {
	setFormSubmissions(sortedResult);
}

const Index = () => {
	useSetPageTitle(TranslationKeys.select_a_form_submission);
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { form_id } = useLocalSearchParams();
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const [loading, setLoading] = useState(false);
	const [query, setQuery] = useState<string>('');
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const formsSubmissionsHelper = new FormsSubmissionsHelper();
	const [formSubmissions, setFormSubmissions] = useState<DatabaseTypes.FormSubmissions[]>([]);
    const [selectedOption, setSelectedOption] = useState<string>('draft');
    const [sortOption, setSortOption] = useState<FormSubmissionSortOption>('alphabetical');
    const { drawerPosition, language, offlineMode } = useAppSelector((state) => state.settings);
    const [currentPath, setCurrentPath] = useState<string[]>([]);
	const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
	const { formQueue, cachedFormData } = useAppSelector((state) => state.form);
	const [isShowingCachedData, setIsShowingCachedData] = useState(false);
	const [hasLoadError, setHasLoadError] = useState(false);

	const queueEntries = useMemo(
		() => (formQueue || []).filter((entry: FormQueueEntry) => entry.form_id === String(form_id)),
		[formQueue, form_id]
	);

	const folderPrefixes = useMemo(() => {
		const prefixes = new Set<string>();

		if (!formSubmissions || formSubmissions.length === 0) {
			return prefixes;
		}

		formSubmissions.forEach(submission => {
			const alias = submission.alias || '';
			const segments = alias
				.split('/')
				.map(segment => segment.trim())
				.filter(Boolean);

			for (let index = 0; index < segments.length - 1; index += 1) {
				const prefix = segments.slice(0, index + 1).join('/');
				prefixes.add(prefix);
			}
		});

		return prefixes;
	}, [formSubmissions]);

	const listData = useMemo<FormSubmissionListRow[]>(() => {
		if (!formSubmissions || formSubmissions.length === 0) {
			return [];
		}

		const rows: FormSubmissionListRow[] = [];
		const seenFolders = new Set<string>();
		const fallbackTitle = translate(TranslationKeys.no_value);

		formSubmissions.forEach(submission => {
			const alias = submission.alias || '';
			const segments = alias
				.split('/')
				.map(segment => segment.trim())
				.filter(Boolean);

			if (currentPath.length === 0) {
				if (segments.length === 0) {
					rows.push({
						type: 'submission',
						id: submission.id.toString(),
						title: alias || fallbackTitle,
						submission,
					});

					return;
				}

				const folderPath = segments[0];
				const folderKey = folderPath;

				if (segments.length > 1 || folderPrefixes.has(folderKey)) {
					if (!seenFolders.has(folderKey)) {
						seenFolders.add(folderKey);
						rows.push({
							type: 'folder',
							id: `folder-${encodeURIComponent(folderKey)}`,
							title: folderPath,
							path: [folderPath],
						});
					}
				} else {
					rows.push({
						type: 'submission',
						id: submission.id.toString(),
						title: segments[0] || alias || fallbackTitle,
						submission,
					});
				}

				return;
			}

			if (segments.length < currentPath.length) {
				return;
			}

			const matchesPath = currentPath.every((segment, index) => segments[index] === segment);

			if (!matchesPath) {
				return;
			}

			if (segments.length === currentPath.length) {
				rows.push({
					type: 'submission',
					id: submission.id.toString(),
					title: segments[segments.length - 1] || alias || fallbackTitle,
					submission,
				});
				return;
			}

			const remainder = segments.slice(currentPath.length);
			const nextFolder = remainder[0];
			const folderPath = [...currentPath, nextFolder];
			const folderKey = folderPath.join('/');

			if (remainder.length === 1 && !folderPrefixes.has(folderKey)) {
				rows.push({
					type: 'submission',
					id: submission.id.toString(),
					title: remainder[0] || alias || fallbackTitle,
					submission,
				});
				return;
			}

			if (!seenFolders.has(folderKey)) {
				seenFolders.add(folderKey);
				rows.push({
					type: 'folder',
					id: `folder-${encodeURIComponent(folderKey)}`,
					title: nextFolder,
					path: folderPath,
				});
			}
		});

		return rows;
	}, [formSubmissions, currentPath, folderPrefixes, translate]);

	const openFilterSheet = () => {
		setIsFilterModalVisible(true);
	};

	const closeFilterSheet = () => {
		setIsFilterModalVisible(false);
	};

	const openSortSheet = () => {
		showScrollViewModal({
			children: <FormSubmissionSortSheet closeSheet={closeScrollViewModal} selectedOption={sortOption} setSelectedOption={setSortOption} />,
		});
	};

	const sortFormSubmissions = useCallback(
		(submissions: DatabaseTypes.FormSubmissions[], option: FormSubmissionSortOption) => {
			if (!submissions || submissions.length === 0) {
				return submissions;
			}

			const normalizedLocale = language || undefined;
			const sortedSubmissions = [...submissions];

			// 'alphabetical' is currently the only supported option; any other
			// value falls back to the same alphabetical sort.
			sortedSubmissions.sort((first, second) => {
				const firstAlias = (first.alias || '').trim();
				const secondAlias = (second.alias || '').trim();

				if (!firstAlias && !secondAlias) {
					return 0;
				}

				if (!firstAlias) {
					return 1;
				}

				if (!secondAlias) {
					return -1;
				}

				return firstAlias.localeCompare(secondAlias, normalizedLocale, {
					sensitivity: 'base',
				});
			});

			return sortedSubmissions;
		},
		[language]
	);

	const loadFormSubmissions = async (pageNumber: number) => {
		if (!form_id) return;
		setLoading(true);
		setIsShowingCachedData(false);
		setHasLoadError(false);

		// When offline mode is active, use cache directly without attempting API call
		if (offlineMode) {
			const cached = cachedFormData?.[String(form_id)]?.submissions || [];
			const cachedAnswers = cachedFormData?.[String(form_id)]?.answers || {};
			const filtered = filterCachedSubmissions(cached, selectedOption, query, cachedAnswers);
			replaceSortedSubmissions(setFormSubmissions, sortFormSubmissions(filtered, sortOption));
			if (cached.length > 0) setIsShowingCachedData(true);
			setLoading(false);
			return;
		}

		try {
			const result = (await formsSubmissionsHelper.fetchFormSubmissions({
				state: selectedOption || 'draft',
				form: form_id,
				alias: query ? query?.trim() : '',
			})) as DatabaseTypes.FormSubmissions[];

			if (result) {
				replaceSortedSubmissions(setFormSubmissions, sortFormSubmissions(result, sortOption));
			}
		} catch (error) {
			// Network failed – fall back to locally cached submissions for this form
			const cached = cachedFormData?.[String(form_id)]?.submissions || [];
			if (cached.length > 0) {
				const cachedAnswers = cachedFormData?.[String(form_id)]?.answers || {};
				const filtered = filterCachedSubmissions(cached, selectedOption, query, cachedAnswers);
				replaceSortedSubmissions(setFormSubmissions, sortFormSubmissions(filtered, sortOption));
				setIsShowingCachedData(true);
			} else {
				console.error('Error fetching form submissions', error);
				setHasLoadError(true);
			}
		} finally {
			setLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			if (form_id) {
				void loadFormSubmissions(1);
			}
			return () => {};
		}, [form_id, selectedOption, sortOption])
	);

	useEffect(() => {
		setFormSubmissions(prev => sortFormSubmissions(prev, sortOption));
	}, [sortFormSubmissions, sortOption]);

	const handleSearchFilter = () => {
		void loadFormSubmissions(1);
	};

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	useEffect(() => {
		if (currentPath.length === 0) {
			return;
		}

		const pathExists = formSubmissions.some(submission => {
			const alias = submission.alias || '';
			const segments = alias
				.split('/')
				.map(segment => segment.trim())
				.filter(Boolean);

			if (segments.length < currentPath.length) {
				return false;
			}

			return currentPath.every((segment, index) => segments[index] === segment);
		});

		if (!pathExists) {
			setCurrentPath([]);
		}
	}, [currentPath, formSubmissions]);

	const renderItem = useCallback(
		({ item }: { item: FormSubmissionListRow }) => {
			const baseStyle = {
				...styles.formCategory,
				backgroundColor: theme.screen.iconBg,
				paddingLeft: 10 + currentPath.length * 8,
			};

			if (item.type === 'folder') {
				return (
					<TouchableOpacity
						style={baseStyle}
						onPress={() => {
							setCurrentPath(item.path);
						}}
					>
						<Text style={{ ...styles.body, color: theme.screen.text }}>{item.title}</Text>
						<Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />
					</TouchableOpacity>
				);
			}

			return (
				<TouchableOpacity
					style={baseStyle}
					onPress={() => {
						router.push({
							pathname: '/form-submission',
							params: { form_submission_id: item?.submission?.id },
						});
					}}
				>
					<Text style={{ ...styles.body, color: theme.screen.text }}>{item.title || item.submission?.alias}</Text>
					<Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />
				</TouchableOpacity>
			);
		},
		[currentPath.length, router, theme.screen.icon, theme.screen.iconBg, theme.screen.text]
	);

	let headingExcerptLength = 22;
	if (screenWidth > 900) {
		headingExcerptLength = 100;
	} else if (screenWidth > 700) {
		headingExcerptLength = 80;
	}

	const submissionsContent: React.ReactNode = resolveSubmissionsContent(loading, formSubmissions, listData, renderItem, theme, translate);

	const isWideHeader = screenWidth > 768;
	const headerRowFlexDirection = drawerPosition === 'right' ? 'row-reverse' : 'row';
	const headerRowGap = isWideHeader ? 20 : 10;
	const searchContainerWidth = isWideHeader ? '60%' : '90%';
	const searchContainerVerticalSpacing = isWideHeader ? 20 : 0;
	const searchInputWidth = isWideHeader ? '90%' : '85%';
	const searchButtonWidth = isWideHeader ? '10%' : '15%';
	const contentWrapperWidth = isWideHeader ? '70%' : '90%';

	return (
		<View
			style={{
				...styles.container,
				backgroundColor: theme.screen.background,
			}}
		>
			<View
				style={{
					...styles.header,
					backgroundColor: theme.header.background,
					paddingHorizontal: isWeb ? 20 : 10,
					gap: headerRowGap,
				}}
			>
				<View
					style={[
						styles.row,
						{
							flexDirection: headerRowFlexDirection,
						},
					]}
				>
					<View
						style={[
							styles.col1,
							{ gap: headerRowGap },
							{
								flexDirection: headerRowFlexDirection,
							},
						]}
					>
						<TouchableOpacity
							onPress={() => {
								if (!hasLoadError && currentPath.length > 0) {
									setCurrentPath(prev => prev.slice(0, -1));
								} else {
									router.navigate('/form-categories');
								}
							}}
							style={{ padding: 10 }}
						>
							<Ionicons name="arrow-back" size={26} color={theme.header.text} />
						</TouchableOpacity>
						<Text style={{ ...styles.heading, color: theme.header.text }}>{excerpt(translate(TranslationKeys.select_a_form_submission), headingExcerptLength)}</Text>
					</View>
					<View style={{ ...styles.col2, gap: isWeb ? 30 : 15 }}>
						<TouchableOpacity onPress={openSortSheet} style={{ padding: 10 }}>
							<FontAwesome5 name="sort-alpha-down" size={22} color={theme.header.text} />
						</TouchableOpacity>
						<TouchableOpacity onPress={openFilterSheet} style={{ padding: 10 }}>
							<FontAwesome name="filter" size={24} color={theme.header.text} />
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => router.push('/form-queue')}
							style={{ padding: 10 }}
						>
							<View>
								<MaterialCommunityIcons
									name="clock-outline"
									size={24}
									color={theme.header.text}
								/>
								{queueEntries.length > 0 && (
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
										<Text style={{ color: 'white', fontSize: 10, fontFamily: 'Poppins_700Bold' }}>{queueEntries.length}</Text>
									</View>
								)}
							</View>
						</TouchableOpacity>
					</View>
				</View>
			</View>
			<View style={styles.contentContainer}>
			<>
				<View style={styles.stateContainer}>
					<Text
						style={{
							...styles.selectedState,
							color: theme.screen.text,
							fontSize: screenWidth > 600 ? 30 : 20,
							marginBottom: screenWidth > 600 ? 0 : 10,
						}}
					>
						{`${translate(TranslationKeys.state)}: ${translate(selectedOption)}`}
					</Text>
					{isShowingCachedData && (
						<View style={styles.cachedRow}>
							<MaterialCommunityIcons name="cached" size={18} color={theme.screen.icon} />
						</View>
					)}
					{offlineMode && (
						<View style={styles.cachedRow}>
							<FontAwesome name="cloud-download" size={18} color="green" />
						</View>
					)}
				</View>
				<View
					style={{
						...styles.searchContainer,
						width: searchContainerWidth,
						marginTop: searchContainerVerticalSpacing,
						marginBottom: searchContainerVerticalSpacing,
					}}
				>
					<TextInput
						style={{
							...styles.searchInput,
							width: searchInputWidth,
							color: theme.screen.text,
						}}
						cursorColor={theme.screen.text}
						placeholderTextColor={theme.screen.placeholder}
						onChangeText={setQuery}
						value={query}
						placeholder={translate(TranslationKeys.form_submissions_search_hint)}
						accessibilityLabel={translate(TranslationKeys.form_submissions_search_hint)}
						// Enter/return triggers the search too, not only the button next to it.
						onSubmitEditing={handleSearchFilter}
						returnKeyType="search"
					/>
					<TouchableOpacity
						style={{
							...styles.searchButton,
							backgroundColor: theme.screen.iconBg,
							width: searchButtonWidth,
						}}
						onPress={handleSearchFilter}
						accessibilityRole="button"
						accessibilityLabel={translate(TranslationKeys.search)}
					>
						<Ionicons name="search" color={theme.screen.icon} size={22} />
					</TouchableOpacity>
				</View>
			</>
		</View>
		<View
			style={{
				flex: 1,
				width: '100%',
				marginTop: 10,
				alignItems: 'center',
			}}
		>
			<View style={{ flex: 1, width: contentWrapperWidth }}>
				{submissionsContent}
			</View>
		</View>
			<FilterFormSheet isVisible={isFilterModalVisible} closeSheet={closeFilterSheet} isFormSubmission={true} setSelectedOption={setSelectedOption} selectedOption={selectedOption} options={filterOptions} />
		</View>
	);
};

// Guard rail: a screen that throws is replaced by an error page with "try
// again" and "back" instead of closing the app.
export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ScreenErrorBoundary';

export default Index;
