import { ActivityIndicator, Dimensions, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { Entypo, FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { DatabaseTypes } from 'repo-depkit-common';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { isWeb } from '@/constants/Constants';
import { FormsSubmissionsHelper } from '@/redux/actions/Forms/FormSubmitions';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import FilterFormSheet from '@/components/FilterFormSheet/FilterFormSheet';
import { excerpt } from '@/constants/HelperFunctions';
import { filterOptions } from './constants';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';
import FormSubmissionSortSheet from '@/components/FormSubmissionSortSheet/FormSubmissionSortSheet';
import { FormSubmissionSortOption } from '@/components/FormSubmissionSortSheet/types';

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

const Index = () => {
	useSetPageTitle(TranslationKeys.select_a_form_submission);
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { form_id } = useLocalSearchParams();
	const sortSheetRef = useRef<BottomSheet>(null);
	const [loading, setLoading] = useState(false);
	const [query, setQuery] = useState<string>('');
	const [isActive, setIsActive] = useState(false);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const formsSubmissionsHelper = new FormsSubmissionsHelper();
	const [formSubmissions, setFormSubmissions] = useState<DatabaseTypes.FormSubmissions[]>([]);
	const [selectedOption, setSelectedOption] = useState<string>('draft');
	const [sortOption, setSortOption] = useState<FormSubmissionSortOption>('alphabetical');
	const { drawerPosition, language } = useSelector((state: RootState) => state.settings);
	const [currentPath, setCurrentPath] = useState<string[]>([]);
	const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

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
		sortSheetRef.current?.expand();
	};

	const closeSortSheet = () => {
		sortSheetRef.current?.close();
	};

	const sortFormSubmissions = useCallback(
		(submissions: DatabaseTypes.FormSubmissions[], option: FormSubmissionSortOption) => {
			if (!submissions || submissions.length === 0) {
				return submissions;
			}

			const normalizedLocale = language || undefined;
			const sortedSubmissions = [...submissions];

			switch (option) {
				case 'alphabetical':
				default:
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
					break;
			}

			return sortedSubmissions;
		},
		[language]
	);

	const loadFormSubmissions = async (pageNumber: number, append: boolean = false) => {
		if (!form_id) return;
		setLoading(true);

		try {
			const result = (await formsSubmissionsHelper.fetchFormSubmissions({
				state: selectedOption || 'draft',
				form: form_id,
				alias: query ? query?.trim() : '',
			})) as DatabaseTypes.FormSubmissions[];

			if (result) {
				const sortedResult = sortFormSubmissions(result, sortOption);
				if (append) {
					setFormSubmissions(prev => {
						const merged = [...(prev || []), ...sortedResult];
						return sortFormSubmissions(merged, sortOption);
					});
				} else {
					setFormSubmissions(sortedResult);
				}
			}
		} catch (error) {
			console.error('Error fetching form submissions', error);
		} finally {
			setLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			if (form_id) {
				loadFormSubmissions(1, false);
			}
			return () => {};
		}, [form_id, selectedOption, sortOption])
	);

	useEffect(() => {
		setFormSubmissions(prev => sortFormSubmissions(prev, sortOption));
	}, [sortFormSubmissions, sortOption]);

	const handleSearchFilter = () => {
		loadFormSubmissions(1, false);
	};

	useFocusEffect(
		useCallback(() => {
			setIsActive(true);
			return () => {
				setIsActive(false);
			};
		}, [])
	);

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
					gap: screenWidth > 768 ? 20 : 10,
				}}
			>
				<View
					style={[
						styles.row,
						{
							flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row',
						},
					]}
				>
					<View
						style={[
							styles.col1,
							screenWidth > 768
								? {
										gap: 20,
									}
								: {
										gap: 10,
									},
							{
								flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row',
							},
						]}
					>
						<TouchableOpacity
							onPress={() => {
								if (currentPath.length > 0) {
									setCurrentPath(prev => prev.slice(0, -1));
								} else {
									router.navigate('/form-categories');
								}
							}}
							style={{ padding: 10 }}
						>
							<Ionicons name="arrow-back" size={26} color={theme.header.text} />
						</TouchableOpacity>
						<Text style={{ ...styles.heading, color: theme.header.text }}>{excerpt(translate(TranslationKeys.select_a_form_submission), screenWidth > 900 ? 100 : screenWidth > 700 ? 80 : 22)}</Text>
					</View>
					<View style={{ ...styles.col2, gap: isWeb ? 30 : 15 }}>
						<TouchableOpacity onPress={openSortSheet} style={{ padding: 10 }}>
							<FontAwesome5 name="sort-alpha-down" size={22} color={theme.header.text} />
						</TouchableOpacity>
						<TouchableOpacity onPress={openFilterSheet} style={{ padding: 10 }}>
							<FontAwesome name="filter" size={24} color={theme.header.text} />
						</TouchableOpacity>
					</View>
				</View>
			</View>
			<View style={styles.contentContainer}>
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
				</View>
				<View
					style={{
						...styles.searchContainer,
						width: screenWidth > 768 ? '60%' : '90%',
						marginTop: screenWidth > 768 ? 20 : 0,
						marginBottom: screenWidth > 768 ? 20 : 0,
					}}
				>
					<TextInput
						style={{
							...styles.searchInput,
							width: screenWidth > 768 ? '90%' : '85%',
							color: theme.screen.text,
						}}
						cursorColor={theme.screen.text}
						placeholderTextColor={theme.screen.placeholder}
						onChangeText={setQuery}
						value={query}
						placeholder={translate(TranslationKeys.search_with_alias)}
					/>
					<TouchableOpacity
						style={{
							...styles.searchButton,
							backgroundColor: theme.screen.iconBg,
							width: screenWidth > 768 ? '10%' : '15%',
						}}
						onPress={handleSearchFilter}
					>
						<Ionicons name="search" color={theme.screen.icon} size={22} />
					</TouchableOpacity>
				</View>
			</View>
			<View
				style={{
					flex: 1,
					width: '100%',
					marginTop: 10,
					alignItems: 'center',
				}}
			>
				<View style={{ flex: 1, width: screenWidth > 768 ? '70%' : '90%' }}>
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
					) : formSubmissions?.length > 0 ? (
						<FlatList data={listData} keyExtractor={item => item.id} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 10 }} />
					) : (
						<View style={{ padding: 20, alignItems: 'center' }}>
							<Text style={{ color: theme.screen.text, fontSize: 16 }}>{translate(TranslationKeys.no_data_found)}</Text>
						</View>
					)}
				</View>
			</View>
			<FilterFormSheet isVisible={isFilterModalVisible} closeSheet={closeFilterSheet} isFormSubmission={true} setSelectedOption={setSelectedOption} selectedOption={selectedOption} options={filterOptions} />
			{isActive && (
				<>
					<BaseBottomSheet
						ref={sortSheetRef}
						index={-1}
						backgroundStyle={{
							...styles.sheetBackground,
							backgroundColor: theme.sheet.sheetBg,
						}}
						enablePanDownToClose
						handleComponent={null}
						onClose={closeSortSheet}
					>
						<FormSubmissionSortSheet closeSheet={closeSortSheet} selectedOption={sortOption} setSelectedOption={setSortOption} />
					</BaseBottomSheet>
				</>
			)}
		</View>
	);
};

export default Index;
