import { ActivityIndicator, Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { FontAwesome, FontAwesome6, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { isWeb } from '@/constants/Constants';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import useToast from '@/hooks/useToast';
import { FormAnswersHelper } from '@/redux/actions/Forms/FormAnswers';
import SubmissionWarningModal from '@/components/SubmissionWarningModal/SubmissionWarningModal';
import { FormsSubmissionsHelper } from '@/redux/actions/Forms/FormSubmitions';
import { DatabaseTypes, FormHelperCommon } from 'repo-depkit-common';
import SingleLineInput from '@/components/SingleLineInput/SingleLineInput';
import MultiLineInput from '@/components/MultiLineInput/MultiLineInput';
import IBANInput from '@/components/IBANInput/IBANInput';
import NumberInput from '@/components/NumberInput/NumberInput';
import EmailInput from '@/components/EmailInput/EmailInput';
import { DateWithTimeInput, PreciseTimestampInput, TimeInput } from '@/components/DateTimeInputs';
import SettingsListDate from '@/components/SettingsListDate';
import DebugView from '@/components/DebugView';
import TriStateCheckbox from '@/components/TriStateCheckbox/TriStateCheckbox';
import FileUpload from '@/components/FileUpload/FileUpload';
import ImageUpload from '@/components/ImageUpload/ImageUpload';
import SignatureInterface from '@/components/SignatureInterface/SignatureInterface';
import DropdownInput from '@/components/DropdownInput/DropdownInput';
import { getFromCategoryTranslation, getFromDescriptionTranslation } from '@/helper/resourceHelper';
import { iconLibraries } from '@/components/Drawer/CustomDrawerContent';
import { DynamicCollectionHelper } from '@/redux/actions/DynamicCollection/DynamicCollection';
import CollectionSelection from '@/components/CollectionSelection/CollectionSelection';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { filterOptions } from './constants';
import EditFormSubmissionSheet from '@/components/EditFormSubmissionSheet/EditFormSubmissionSheet';
import { SET_FORM_SUBMISSION } from '@/redux/Types/types';
import { excerpt, getFileFromDirectus, getFormValueImageUrl, uploadToDirectus, uploadToDirectusFromMobile } from '@/constants/HelperFunctions';
import SubmissionWarningSheet from '@/components/SubmissionWarningSheet/SubmissionWarningSheet';
import { format, isValid, parse, parseISO } from 'date-fns';
import { Buffer } from 'buffer';
import FilterFormSheet from '@/components/FilterFormSheet/FilterFormSheet';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';

const parseDropdownValues = (input: unknown): string[] => {
	if (!input) return [];

	if (Array.isArray(input)) {
		return input.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map(value => value.trim());
	}

	if (typeof input === 'string') {
		try {
			const parsed = JSON.parse(input);
			if (Array.isArray(parsed)) {
				return parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map(value => value.trim());
			}
		} catch (error) {
			const candidates = input
				.split(/\r?\n|,/)
				.map(value => value.trim())
				.filter(Boolean);
			if (candidates.length > 0) {
				return candidates;
			}
		}
	}

	return [];
};

const isFormFieldEntity = (field: DatabaseTypes.FormFields | string | null | undefined): field is DatabaseTypes.FormFields => typeof field === 'object' && field !== null && 'id' in field;

const extractFormFieldId = (field: DatabaseTypes.FormFields | string | null | undefined): string | undefined => {
	if (!field) return undefined;
	if (typeof field === 'string') return field;
	if (isFormFieldEntity(field)) return field.id;

	return undefined;
};

const normalizeExpectedValue = (value: unknown): string => {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value.trim().toLowerCase();
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (Array.isArray(value)) {
		return value.map(item => String(item).trim().toLowerCase()).join(',');
	}

	return String(value).trim().toLowerCase();
};

const normalizeCurrentValue = (value: unknown, customType?: string): string => {
        if (customType === 'value_boolean') {
                if (value === null || value === undefined) return 'false';
                if (value === 1 || value === true) return 'true';
                if (value === 0 || value === false) return 'false';

                return 'null';
        }

        if (value === null || value === undefined) return '';

	if (typeof value === 'string') return value.trim().toLowerCase();
	if (typeof value === 'number') return String(value);
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (Array.isArray(value)) {
		return value.map(item => String(item).trim().toLowerCase()).join(',');
	}

	return String(value).trim().toLowerCase();
};

const Index = () => {
	const toast = useToast();
	const scrollViewRef = useRef(null);
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { form_submission_id } = useLocalSearchParams();
	const formAnswersHelper = new FormAnswersHelper();
	const formsSubmissionsHelper = new FormsSubmissionsHelper();
	const editSheetRef = useRef<BottomSheet>(null);
	const warningSheetRef = useRef<BottomSheet>(null);
	const [loading, setLoading] = useState(false);
	const [isActive, setIsActive] = useState(false);
	const [isWarning, setIsWarning] = useState(false);
	const [formAnswers, setFormAnswers] = useState<DatabaseTypes.FormAnswers[]>([]);
	const [loadingCollection, setLoadingCollection] = useState(false);
	const [collectionData, setCollectionData] = useState<any>([]);
	const [selectedState, setSelectedState] = useState('submitted');
	const [currentState, setCurrentState] = useState<string | null>(null);
	const { formSubmission } = useSelector((state: RootState) => state.form);
	const { user } = useSelector((state: RootState) => state.authReducer);
	const [submissionLoading, setSubmissionLoading] = useState(false);
	const [formData, setFormData] = useState<{
		[key: string]: { value: any; error: string; custom_type?: string };
	}>({});
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const { language, drawerPosition, primaryColor } = useSelector((state: RootState) => state.settings);
	const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

	// Set Page Title
	useSetPageTitle(formSubmission?.alias || TranslationKeys.form_submission);

	const isEditMode = useMemo(() => {
		if (!formData || typeof formData !== 'object') return false;

		return Object.values(formData).some(field => {
			if (!field || typeof field !== 'object' || !('value' in field)) return false;

			const value = field.value;

			if (value === null || value === undefined) return false;

			if (typeof value === 'string') {
				return value.trim().length > 0;
			}

			if (typeof value === 'number') {
				return !isNaN(value);
			}

			if (typeof value === 'boolean') {
				return true;
			}

			if (Array.isArray(value)) {
				return value.length > 0;
			}

			if (typeof value === 'object') {
				return Object.keys(value).length > 0;
			}

			return false;
		});
	}, [formData]);

	const handleChange = (id: string, value: any, custom_type?: string) => {
		setFormData(prev => ({
			...prev,
			[id]: { ...prev[id], value, error: '', custom_type },
		}));
	};
	const handleError = (id: string, error: string) => {
		setFormData(prev => ({
			...prev,
			[id]: { ...prev[id], error },
		}));
	};

	const openFilterSheet = () => {
		setIsFilterModalVisible(true);
	};

	const closeFilterSheet = () => {
		setIsFilterModalVisible(false);
	};

	const openEditSheet = () => {
		editSheetRef.current?.expand();
	};

	const closeEditSheet = () => {
		editSheetRef?.current?.close();
	};

	const openWarningSheet = () => {
		warningSheetRef.current?.expand();
	};

	const closeWarningSheet = () => {
		warningSheetRef?.current?.close();
	};

	const getDirectusFilesData = async (data: any) => {
		if (!data) return [];

		const filePromises = data.map(async (file: any) => {
			if (file?.directus_files_id) {
				const response = await getFileFromDirectus(file?.directus_files_id);
				if (!response) return null;

				return {
					image: response.type.startsWith('image/') ? getFormValueImageUrl(response.id) : null,
					name: response.filename_download,
					type: response.type,
					edit: true,
					directus_files_id: file?.directus_files_id,
				};
			}
			return null;
		});

		const filesData = await Promise.all(filePromises);

		return filesData.filter(Boolean);
	};

	const checkValidity = async () => {
		const result = (await formsSubmissionsHelper.fetchFormubmissionById(String(form_submission_id))) as DatabaseTypes.FormSubmissions;
		if (result) {
			dispatch({ type: SET_FORM_SUBMISSION, payload: result });
			if (result?.user_locked_by && result?.user_locked_by !== user?.id) {
				if (isWeb) {
					setIsWarning(true);
				} else {
					openWarningSheet();
				}
			} else {
				const update = (await formsSubmissionsHelper.updateFormSubmissionById(String(form_submission_id), {
					user_locked_by: String(user?.id),
					date_started: new Date().toISOString(),
				})) as DatabaseTypes.FormSubmissions;
			}
		} else {
			toast('Please reload the page', 'error');
		}
		return result;
	};

	// Helfer: finde den nächsten Zustand in der filterOptions-Liste (fallback: 'submitted')
	const getNextState = (current?: string | null | undefined) => {
		if (!current) return 'submitted';
		const idx = filterOptions.findIndex(opt => opt.id === current);
		if (idx === -1) return 'submitted';
		if (idx < filterOptions.length - 1) return filterOptions[idx + 1].id;
		return filterOptions[idx].id; // letzter Zustand bleibt gleich
	};

	const fetchAllFormAnswers = async () => {
		setLoading(true);
		const formSubmissionPayload = await checkValidity();

		if (formSubmissionPayload) {
			// Merke den aktuellen Zustand und setze die Auswahl auf den nächsten Zustand
			setCurrentState(formSubmissionPayload?.state || null);
			setSelectedState(getNextState(formSubmissionPayload?.state));
		}

		const result = (await formAnswersHelper.fetchFormAnswers({
			filter: { form_submission: { _eq: form_submission_id } },
		})) as DatabaseTypes.FormAnswers[];

		if (result) {
			const sortedResult = result.sort((a, b) => {
				const sortA = a.form_field?.sort ?? Number.MAX_SAFE_INTEGER;
				const sortB = b.form_field?.sort ?? Number.MAX_SAFE_INTEGER;
				return sortA - sortB;
			});

			setFormAnswers(sortedResult);

			const initialFormData: {
				[key: string]: { value: any; error: string; custom_type: string };
			} = {};

			const fieldPromises = sortedResult.map(async answer => {
				const fieldId = String(answer?.id);
				const fieldType = answer?.form_field?.field_type || '';
				const prefix = answer?.form_field?.value_prefix || '-';
				const [custom_type, ...idParts] = fieldType.split('-');
				const defaultValue = answer[custom_type];
				let value;

				if (custom_type === 'value_custom') {
					value = defaultValue ? defaultValue : null;
				} else if (FormHelperCommon.isFieldTypeNumber(fieldType)) {
					value = defaultValue ? String(defaultValue)?.replace('.', ',') : null;
				} else if (custom_type === 'value_boolean') {
					value = defaultValue === false ? 0 : defaultValue === true ? 1 : null;
				} else if (FormHelperCommon.isDateFieldType(fieldType)) {
					value = parseDateForEdit(fieldType, defaultValue);
				} else if (custom_type === 'value_files') {
					value = defaultValue ? await getDirectusFilesData(defaultValue) : [];
				} else if (custom_type === 'value_image') {
					value = defaultValue ? getFormValueImageUrl(defaultValue) : null;
				} else {
					value = defaultValue || null;
				}

				if (value) {
					return { fieldId, value, error: '', custom_type };
				}
				return null;
			});

			const resolvedFields = await Promise.all(fieldPromises);

			resolvedFields.forEach(field => {
				if (field) {
					initialFormData[field.fieldId] = {
						value: field.value,
						error: field.error,
						custom_type: field.custom_type,
					};
				}
			});

			setFormData(initialFormData);
			setLoading(false);
		}
	};

	const fetchCollection = async (collection: string) => {
		if (collection) {
			setLoadingCollection(true);
			try {
				const dynamicCollectionHelper = new DynamicCollectionHelper(collection);
				const data = (await dynamicCollectionHelper.fectAllCollection()) as any;
				if (data) {
					if (collection === 'apartments' && data && data?.length > 0) {
						const buildingsHelper = new BuildingsHelper();
						const apartmentWithBuilding = await Promise.all(
							data.map(async (apartment: any) => {
								const buildingData = (await buildingsHelper.fetchBuildingById(apartment?.building)) as DatabaseTypes.Buildings;

								return {
									...apartment,
									...buildingData,
								};
							})
						);

						setCollectionData(apartmentWithBuilding);
					} else {
						setCollectionData(data);
					}
				}
			} catch (error) {
				console.error('Error fetching collection:', error);
			} finally {
				setLoadingCollection(false);
			}
		}
	};

	const formatDateForSubmission = (fieldType: string, value: string): string | null => {
		try {
			if (!value) return null;

			let dateObj;

			switch (fieldType) {
				case FormHelperCommon.FORM_FIELD_TYPE.DATE_DATE_AND_HH_MM: // Convert DD.MM.YYYY HH:MM → ISO
					dateObj = parse(value, 'dd.MM.yyyy HH:mm', new Date());
					break;

				case FormHelperCommon.FORM_FIELD_TYPE.DATE: // Convert DD.MM.YYYY → ISO
					dateObj = parse(value, 'dd.MM.yyyy', new Date());
					break;

				case FormHelperCommon.FORM_FIELD_TYPE.DATE_HH_MM: // Convert HH:MM → ISO (Assuming today's date)
					const today = format(new Date(), 'yyyy-MM-dd');
					dateObj = parse(`${today} ${value}`, 'yyyy-MM-dd HH:mm', new Date());
					break;

				case FormHelperCommon.FORM_FIELD_TYPE.DATE_TIMESTAMP: // Convert DD.MM.YYYY HH:MM:SS → ISO
					dateObj = parse(value, 'dd.MM.yyyy HH:mm:ss', new Date());
					break;

				default:
					return value; // Return as-is for unknown formats
			}

			if (!isValid(dateObj)) return null; // Ensure valid date before formatting

			return format(dateObj, "yyyy-MM-dd'T'HH:mm:ss.SSSX"); // Convert to ISO format
		} catch (error) {
			console.error('Error formatting date:', error);
			return null;
		}
	};

	const parseDateForEdit = (fieldType: string, value: string): string => {
		try {
			if (!value) return '';

			let dateObj = parseISO(value);
			if (!isValid(dateObj)) return value; // Return raw value if parsing fails

			switch (fieldType) {
				case FormHelperCommon.FORM_FIELD_TYPE.DATE_DATE_AND_HH_MM: // Convert ISO → DD.MM.YYYY HH:MM
					return format(dateObj, 'dd.MM.yyyy HH:mm');

				case FormHelperCommon.FORM_FIELD_TYPE.DATE: // Convert ISO → DD.MM.YYYY
					return format(dateObj, 'dd.MM.yyyy');

				case FormHelperCommon.FORM_FIELD_TYPE.DATE_HH_MM: // Convert ISO → HH:MM
					return format(dateObj, 'HH:mm');

				case FormHelperCommon.FORM_FIELD_TYPE.DATE_TIMESTAMP: // Convert ISO → DD.MM.YYYY HH:MM:SS
					return format(dateObj, 'dd.MM.yyyy HH:mm:ss');

				default:
					return value; // Return as-is for unknown formats
			}
		} catch (error) {
			console.error('Error parsing date:', error);
			return value;
		}
	};

	const getAnswerValue = useCallback(
		(answer: DatabaseTypes.FormAnswers) => {
			const key = String(answer?.id);
			const formDataEntry = formData[key];

			if (formDataEntry !== undefined) {
				return formDataEntry.value;
			}

			const formField = isFormFieldEntity(answer?.form_field) ? answer.form_field : null;

			if (!formField) {
				return undefined;
			}

			const fieldType = formField.field_type || '';
			const [custom_type, ...idParts] = fieldType.split('-');
			const custom_id = idParts.join('-');
			const defaultValue = (answer as any)?.[custom_type];

			if (custom_type === 'value_custom') {
				return defaultValue ?? null;
			}

			if (custom_type === 'value_number') {
				if (typeof defaultValue === 'number') {
					return String(defaultValue).replace('.', ',');
				}

				return defaultValue ?? null;
			}

			if (custom_type === 'value_boolean') {
				if (defaultValue === false) return 0;
				if (defaultValue === true) return 1;

				return null;
			}

			if (['date_hh_mm', 'date', 'hh_mm', 'timestamp'].includes(custom_id) && typeof defaultValue === 'string') {
				return parseDateForEdit(custom_id, defaultValue);
			}

			return defaultValue ?? null;
		},
		[formData]
	);

	const getDirectusUploadId = async (value: any) => {
		const response = await fetch(value.image);
		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const fileData = {
			name: value.name,
			type: value.type,
			buffer: isWeb ? buffer : value.image,
			edit: true,
		};
		let fileId;
		if (isWeb) {
			fileId = await uploadToDirectus(fileData);
		} else {
			fileId = await uploadToDirectusFromMobile(fileData);
		}
		return fileId;
	};

	const handleFormSubmission = async () => {
		setSubmissionLoading(true);
		let hasError = false;

		const filteredFormAnswers = formAnswers.filter(answer => formData.hasOwnProperty(String(answer?.id)));

		const updatedFormAnswers = await Promise.all(
			filteredFormAnswers.map(async answer => {
				const fieldId = answer?.id;
				const isRequired = answer?.form_field?.is_required;
				const formDataEntry = formData[String(fieldId)];
				const value = formDataEntry?.value;
				const fieldType = answer?.form_field?.field_type || '';
				const prefix = answer?.form_field?.value_prefix || '-';
				const custom_id = fieldType?.split('-')[1];

				if (isRequired && (!value || value.trim() === '')) {
					hasError = true;
					const fieldName = answer?.form_field?.translations?.length > 0 ? getFromCategoryTranslation(answer?.form_field?.translations, language) : answer?.form_field?.alias;
					toast(`Field "${fieldName}" is required`, 'error');
					return null;
				}

				const { custom_type } = formDataEntry;
				let formateDate;
				if (FormHelperCommon.isDateFieldType(fieldType)) {
					formateDate = formatDateForSubmission(fieldType, value);
				}

				let updatedValueFields = {};
				if (custom_type === 'value_string') {
					updatedValueFields = { value_string: value };
				} else if (custom_type === 'value_number') {
					updatedValueFields = {
						value_number: value ? value.replace(',', '.') : null,
					};
				} else if (custom_type === 'value_boolean') {
					updatedValueFields = {
						value_boolean: value === 0 ? false : value === 1 ? true : null,
					};
				} else if (custom_type === 'value_custom') {
					updatedValueFields = { value_custom: value };
				} else if (custom_type === 'value_date') {
					updatedValueFields = { value_date: formateDate };
				} else if (custom_type === 'value_image') {
					if (value?.name) {
						const directusFileId = await getDirectusUploadId(value);
						updatedValueFields = { value_image: directusFileId };
					}
				} else if (custom_type === 'value_files' && Array.isArray(value)) {
					const uploadedFileIds = await Promise.all(value.filter((file: any) => !file?.edit).map(async (file: any) => await getDirectusUploadId(file)));
					updatedValueFields = {
						value_files: {
							create: uploadedFileIds.filter(Boolean).map(fileId => ({
								directus_files_id: fileId,
							})),
						},
					};
				}
				return {
					id: fieldId,
					...updatedValueFields,
				};
			})
		);

		const finalAnswers = updatedFormAnswers.filter(Boolean);
		if (hasError) {
			setSubmissionLoading(false);
			return;
		}

		if (finalAnswers.length > 0) {
			try {
				await Promise.all(finalAnswers.map((answer: any) => formAnswersHelper.updateFormAnswers(answer.id, answer)));

				await formsSubmissionsHelper.updateFormSubmissionById(String(form_submission_id), { state: selectedState });

				setSubmissionLoading(false);
				setFormData({});
				if (router.canGoBack()) {
					router.back();
				} else {
					router.navigate('/form-categories');
				}
			} catch (error) {
				console.error('Error updating form answers:', error);
				const errorMessage = error instanceof Error ? error.message : String(error);
				toast(errorMessage || 'An error occurred while updating form answers', 'error');
			} finally {
				setSubmissionLoading(false);
				setFormData({});
			}
		} else {
			setSubmissionLoading(false);
		}
	};

	useEffect(() => {
		if (formAnswers) {
			formAnswers.forEach(answer => {
				const fieldType = answer?.form_field?.field_type || '';
				const prefix = answer?.form_field?.value_prefix || '-';

				const parts = fieldType.split('-');
				if (parts) {
					const collection = parts?.length > 2 ? parts.slice(2).join('-') : '';
					if (parts[0] === 'value_custom') {
						fetchCollection(collection);
					}
				}
			});
		}
	}, [formAnswers]);

	useFocusEffect(
		useCallback(() => {
			if (form_submission_id) {
				fetchAllFormAnswers();
			}
			return () => {};
		}, [form_submission_id])
	);

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
						<TouchableOpacity onPress={() => router.back()} style={{ padding: 10 }}>
							<Ionicons name="arrow-back" size={26} color={theme.header.text} />
						</TouchableOpacity>
						<Text style={{ ...styles.heading, color: theme.header.text }}>{formSubmission ? excerpt(formSubmission?.alias, screenWidth > 900 ? 100 : screenWidth > 700 ? 80 : 22) : ''}</Text>
					</View>
					<View style={{ ...styles.col2, gap: isWeb ? 30 : 15 }}>
						<TouchableOpacity onPress={openEditSheet} style={{ padding: 10 }}>
							<FontAwesome name="edit" size={24} color={theme.header.text} />
						</TouchableOpacity>
					</View>
				</View>
			</View>
			<ScrollView style={{ flex: 1, width: '100%', marginTop: 10 }} contentContainerStyle={{ alignItems: 'center' }} ref={scrollViewRef} keyboardShouldPersistTaps="handled">
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
					) : (
						<View style={styles.content}>
							<View
								style={{
									...styles.formSubmissionId,
									backgroundColor: theme.screen.iconBg,
								}}
							>
								<Text style={{ ...styles.body, color: theme.screen.text }}>{formSubmission ? formSubmission?.id : ''}</Text>
							</View>
							{formAnswers &&
								formAnswers.map((answer, index) => {
									const formField = isFormFieldEntity(answer?.form_field) ? answer.form_field : null;
									const fieldType = formField?.field_type || '';
									const prefix = answer?.form_field?.value_prefix;
									const suffix = answer?.form_field?.value_suffix;
									const [custom_type, ...idParts] = fieldType.split('-');
									const custom_id = idParts.join('-');
									const fieldId = String(answer?.id);
									const dropdownValues = parseDropdownValues(answer?.form_field?.dropdown_values);
									const description = answer?.form_field?.translations?.length > 0 ? getFromDescriptionTranslation(answer?.form_field?.translations, language) : '';
									const visibilityDependsOnFieldId = formField ? extractFormFieldId(formField.visibility_depends_on_referenced_field) : undefined;
									const expectedVisibilityValue = formField?.visibility_depends_on_referenced_value_equals;
									const normalizedExpectedValue = normalizeExpectedValue(expectedVisibilityValue);
									const baseVisibility = formField?.is_visible_in_form ?? true;
									const hasVisibilityDependency = Boolean(visibilityDependsOnFieldId && normalizedExpectedValue !== '');
									let showInForm = baseVisibility;

									if (showInForm && hasVisibilityDependency) {
										const referencedAnswer = formAnswers.find(item => {
											const referencedField = isFormFieldEntity(item?.form_field) ? item.form_field : null;
											const referencedFieldId = extractFormFieldId(referencedField || item?.form_field);

											return referencedFieldId === visibilityDependsOnFieldId;
										});

										if (referencedAnswer) {
											const referencedField = isFormFieldEntity(referencedAnswer?.form_field) ? referencedAnswer.form_field : null;
											const referencedFieldType = referencedField?.field_type || '';
											const [referencedCustomType] = referencedFieldType.split('-');
											const currentValue = getAnswerValue(referencedAnswer);
											const normalizedCurrentValue = normalizeCurrentValue(currentValue, referencedCustomType);

											showInForm = normalizedCurrentValue === normalizedExpectedValue;
										} else {
											showInForm = false;
										}
									}
									if (!showInForm) {
										return null;
									}

									const isDisabled = answer?.form_field?.is_disabled || false;
									let IconComponent: any = null;
									let iconName = '';
									if (answer?.form_field?.icon_expo) {
										const [library, name] = answer?.form_field?.icon_expo?.split(':') ?? [];
										if (iconLibraries[library]) {
											IconComponent = iconLibraries[library];
											iconName = name;
										}
									}

									return (
										<View
											style={{
												...styles.formFieldContainer,
												borderWidth: 1,
												borderColor: theme.screen.iconBg,
											}}
											key={answer?.id + index}
										>
											<View
												style={{
													...styles.formNameContainer,
													backgroundColor: theme.screen.iconBg,
												}}
											>
												{IconComponent && <IconComponent name={iconName} size={20} color={theme.screen.icon} />}

												<Text
													style={{
														...styles.body,
														color: theme.screen.text,
													}}
												>
													{`${index + 1}. `}
													{answer?.form_field?.translations?.length > 0 ? getFromCategoryTranslation(answer?.form_field?.translations, language) : answer?.form_field?.alias}
												</Text>
												{answer?.form_field?.is_required && <FontAwesome6 name="star-of-life" size={12} color={'red'} />}
											</View>
											{Boolean(description) && (
												<View
													style={{
														...styles.descriptionContainer,
														backgroundColor: theme.screen.iconBg,
													}}
												>
													<Text
														style={{
															...styles.body,
															color: theme.screen.text,
														}}
													>
														{description}
													</Text>
												</View>
											)}
											{custom_id === 'string' && showInForm && <SingleLineInput id={fieldId} value={formData[fieldId]?.value || ''} onChange={handleChange} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} prefix={prefix} suffix={suffix} />}
											{custom_id === 'dropdown' && showInForm && <DropdownInput id={fieldId} value={formData[fieldId]?.value} onChange={handleChange} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} options={dropdownValues} prefix={prefix} suffix={suffix} />}
											{custom_id === 'multiline' && showInForm && <MultiLineInput id={fieldId} value={formData[fieldId]?.value || ''} onChange={handleChange} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} />}
											{custom_id === 'bank_account_number' && showInForm && <IBANInput id={fieldId} value={formData[fieldId]?.value || ''} onChange={handleChange} onError={handleError} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} prefix={prefix} suffix={suffix} />}
											{custom_id === 'number' && showInForm && <NumberInput id={fieldId} value={formData[fieldId]?.value || ''} onChange={handleChange} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} prefix={prefix} suffix={suffix} />}
											{custom_id === 'email' && showInForm && <EmailInput id={fieldId} value={formData[fieldId]?.value || ''} onChange={handleChange} onError={handleError} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} prefix={prefix} suffix={suffix} />}
											{custom_id === 'date_hh_mm' && showInForm && <DateWithTimeInput id={fieldId} value={formData[fieldId]?.value || ''} onChange={handleChange} onError={handleError} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} prefix={prefix} suffix={suffix} />}
											{custom_id === 'date' && showInForm && <SettingsListDate id={fieldId} value={formData[fieldId]?.value || ''} onChange={handleChange} onError={handleError} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} prefix={prefix} suffix={suffix} />}
											{custom_id === 'hh_mm' && showInForm && <TimeInput id={fieldId} value={formData[fieldId]?.value || ''} onChange={handleChange} onError={handleError} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} prefix={prefix} suffix={suffix} />}
											{custom_id === 'timestamp' && showInForm && <PreciseTimestampInput id={fieldId} value={formData[fieldId]?.value || ''} onChange={handleChange} onError={handleError} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} prefix={prefix} suffix={suffix} />}
                                                                                        {custom_id === 'checkbox' &&
                                                                                                showInForm && (
                                                                                                        <TriStateCheckbox
                                                                                                                id={fieldId}
                                                                                                                value={formData[fieldId]?.value}
                                                                                                                onChange={handleChange}
                                                                                                                isDisabled={isDisabled}
                                                                                                                custom_type={custom_type}
                                                                                                                onlyTwo
                                                                                                        />
                                                                                                )}
											{custom_id === 'files' && showInForm && <FileUpload id={fieldId} value={formData[fieldId]?.value} onChange={handleChange} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} />}
											{custom_id === 'image' && showInForm && <ImageUpload id={fieldId} value={formData[fieldId]?.value} onChange={handleChange} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} />}
											{custom_id === 'signature' && showInForm && <SignatureInterface id={fieldId} value={formData[fieldId]?.value} onChange={handleChange} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} scrollViewRef={scrollViewRef} />}
											{custom_type === 'value_custom' && showInForm && <CollectionSelection id={fieldId} value={formData[fieldId]?.value} onChange={handleChange} error={formData[fieldId]?.error} isDisabled={isDisabled} loading={loadingCollection} data={collectionData} custom_type={custom_type} />}
										</View>
									);
								})}
							<DebugView title="Form Data" isVisible>
								<Text style={{ ...styles.body, color: theme.screen.text }}>{JSON.stringify(formData, null, 2)}</Text>
							</DebugView>
						</View>
					)}
				</View>
			</ScrollView>
			<View
				style={{
					...styles.actionContainer,
					width: screenWidth > 768 ? '70%' : '90%',
				}}
			>
			<View style={styles.pickerContainer}>
				{/* Aktueller Zustand und Auswahl des nächsten Zustands */}
				<Text style={{ ...styles.body, marginBottom: 6, color: theme.screen.text }}>
					{`${translate(TranslationKeys.state_current)}: ${translate(currentState || formSubmission?.state || 'draft')}`}
				</Text>
				<TouchableOpacity
					style={{
						...styles.stateChangeButton,
						backgroundColor: theme.screen.iconBg,
					}}
					onPress={openFilterSheet}
				>
					<View
						style={{
							marginLeft: -34,
							flexDirection: 'row',
							alignItems: 'center',
							gap: 10,
						}}
					>
						<MaterialIcons name="edit" size={20} color={theme.screen.text} />
						<Text style={{ ...styles.state, color: theme.screen.text }}>{`${translate(TranslationKeys.state_next)}: ${translate(selectedState)}`}</Text>
					</View>
				</TouchableOpacity>
			</View>
				<TouchableOpacity style={{ ...styles.button, backgroundColor: primaryColor }} onPress={handleFormSubmission}>
					{submissionLoading ? <ActivityIndicator size={22} color={theme.screen.text} /> : <Text style={{ ...styles.buttonLabel, color: theme.activeText }}>{translate(TranslationKeys.save)}</Text>}
				</TouchableOpacity>
			</View>
			<SubmissionWarningModal isVisible={isWarning} setIsVisible={setIsWarning} id={String(form_submission_id)} />
			{isActive && (
				<BaseBottomSheet
					ref={editSheetRef}
					index={-1}
					backgroundStyle={{
						...styles.sheetBackground,
						backgroundColor: theme.sheet.sheetBg,
					}}
					enablePanDownToClose
					handleComponent={null}
					onClose={closeEditSheet}
				>
					<EditFormSubmissionSheet id={String(form_submission_id)} closeSheet={closeEditSheet} />
				</BaseBottomSheet>
			)}
			{isActive && (
				<BaseBottomSheet
					ref={warningSheetRef}
					index={-1}
					backgroundStyle={{
						...styles.sheetBackground,
						backgroundColor: theme.sheet.sheetBg,
					}}
					enablePanDownToClose={false}
					handleComponent={null}
				>
					<SubmissionWarningSheet id={String(form_submission_id)} closeSheet={closeWarningSheet} />
				</BaseBottomSheet>
			)}
			<FilterFormSheet isVisible={isFilterModalVisible} closeSheet={closeFilterSheet} isFormSubmission={true} setSelectedOption={setSelectedState} selectedOption={selectedState} options={filterOptions} isEditMode={isEditMode} />
		</View>
	);
};

export default Index;
