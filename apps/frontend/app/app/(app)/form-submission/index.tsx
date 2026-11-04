import { Dimensions, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { FontAwesome, FontAwesome6, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { isWeb } from '@/constants/Constants';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import useToast from '@/hooks/useToast';
import { FormAnswersHelper } from '@/redux/actions/Forms/FormAnswers';
import SubmissionWarningModal from '@/components/SubmissionWarningModal/SubmissionWarningModal';
import { FormsSubmissionsHelper } from '@/redux/actions/Forms/FormSubmitions';
import { DatabaseTypes, FileNameHelper, FormHelperCommon, MathHelper } from 'repo-depkit-common';
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
import { SET_FORM_SUBMISSION, ADD_FORM_QUEUE_ENTRY, REMOVE_FORM_QUEUE_ENTRY } from '@/redux/Types/types';
import { deleteDirectusFile, excerpt, getFileFromDirectus, getFormValueImageUrl, uploadToDirectus, uploadToDirectusFromMobile } from '@/constants/HelperFunctions';
import { fetchSpecificField } from '@/redux/actions/Fields/Fields';
import SubmissionWarningSheet from '@/components/SubmissionWarningSheet/SubmissionWarningSheet';
import { format, isValid, parse, parseISO } from 'date-fns';
import { MyBuffer } from 'repo-depkit-common-ui';
import FilterFormSheet from '@/components/FilterFormSheet/FilterFormSheet';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { myContrastColor } from '@/helper/ColorHelper';
import { Theme } from '@/context/ThemeContext';
import { getUserDisplayName } from '@/helper/UserDisplayNameHelper';
import * as FileSystem from 'expo-file-system/legacy';
import { authorizedFetch } from '@/helper/authorizedFetch';

/**
 * Convert a file data object (from signature capture) to a base64 data URI.
 * On web the image is already a data URI; on mobile it is a file path
 * that needs to be read and encoded.
 */
async function toBase64DataUri(fileData: { name: string; type: string; image: string }): Promise<string> {
	if (fileData.image.startsWith('data:')) {
		return fileData.image;
	}
	// Mobile: read the file from the filesystem as base64
	const base64 = await FileSystem.readAsStringAsync(fileData.image, {
		encoding: FileSystem.EncodingType.Base64,
	});
	return `data:${fileData.type || 'image/png'};base64,${base64}`;
}

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
			console.warn('parseDropdownValues: input is not valid JSON, falling back to line/comma splitting', error);
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

	return JSON.stringify(value).trim().toLowerCase();
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

	return JSON.stringify(value).trim().toLowerCase();
};

const isAnswerVisible = (
	answer: DatabaseTypes.FormAnswers,
	formAnswers: DatabaseTypes.FormAnswers[],
	getAnswerValueFn: (a: DatabaseTypes.FormAnswers) => any
): boolean => {
	const formField = isFormFieldEntity(answer?.form_field) ? answer.form_field : null;
	const baseVisibility = formField?.is_visible_in_form ?? true;
	if (!baseVisibility) return false;

	const visibilityDependsOnFieldId = formField ? extractFormFieldId(formField.visibility_depends_on_referenced_field) : undefined;
	const expectedVisibilityValue = formField?.visibility_depends_on_referenced_value_equals;
	const normalizedExpectedValue = normalizeExpectedValue(expectedVisibilityValue);
	const hasVisibilityDependency = Boolean(visibilityDependsOnFieldId && normalizedExpectedValue !== '');

	if (!hasVisibilityDependency) return true;

	const referencedAnswer = formAnswers.find(item => {
		const referencedFieldId = extractFormFieldId(item?.form_field);
		return referencedFieldId === visibilityDependsOnFieldId;
	});

	if (!referencedAnswer) return false;

	const referencedField = isFormFieldEntity(referencedAnswer?.form_field) ? referencedAnswer.form_field : null;
	const referencedCustomType = (referencedField?.field_type || '').split('-')[0];
	const currentValue = getAnswerValueFn(referencedAnswer);
	return normalizeCurrentValue(currentValue, referencedCustomType) === normalizedExpectedValue;
};

/**
 * Resolve the icon component/name for a form field's `icon_expo` value
 * (format `library:name`), looking up the library in `iconLibraries`.
 */
const resolveFieldIcon = (iconExpo: string | undefined | null): { IconComponent: any; iconName: string } => {
	let IconComponent: any = null;
	let iconName = '';
	if (iconExpo) {
		const [library, name] = iconExpo.split(':') ?? [];
		if (iconLibraries[library]) {
			IconComponent = iconLibraries[library];
			iconName = name;
		}
	}
	return { IconComponent, iconName };
};

// Styles that belong to this screen only. New styles stay in this file (see AGENTS.md);
// the pre-existing `./styles` module is kept as-is.
const localStyles = StyleSheet.create({
	groupTabBar: {
		width: '100%',
		// Without this the horizontal ScrollView would stretch inside the
		// vertical content column on narrow phones.
		flexGrow: 0,
	},
	groupTabBarContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 2,
		paddingRight: 10,
	},
	groupTab: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		borderRadius: 20,
		paddingHorizontal: 14,
		paddingVertical: 8,
	},
	lastEditedContainer: {
		width: '100%',
		padding: 10,
		borderRadius: 10,
		gap: 4,
	},
});

/**
 * Pseudo group id for all form fields that are not assigned to a
 * `form_field_groups` entry. Rendered as the last tab.
 */
const OTHER_FIELDS_GROUP_ID = '__other_fields__';

type FormFieldGroupTab = {
	id: string;
	label: string;
	iconExpo?: string | null;
};

const isFormFieldGroupEntity = (group: DatabaseTypes.FormFieldGroups | string | null | undefined): group is DatabaseTypes.FormFieldGroups => typeof group === 'object' && group !== null && 'id' in group;

/**
 * The expanded `form_field_groups` row of an answer's form field, or null when
 * the field has no group (or the relation was not expanded).
 */
const getAnswerFieldGroup = (answer: DatabaseTypes.FormAnswers): DatabaseTypes.FormFieldGroups | null => {
	const formField = isFormFieldEntity(answer?.form_field) ? answer.form_field : null;
	const group = formField?.group;
	return isFormFieldGroupEntity(group) ? group : null;
};

/** The tab id an answer belongs to (its group id, or the "other fields" pseudo group). */
const getAnswerGroupTabId = (answer: DatabaseTypes.FormAnswers): string => {
	const group = getAnswerFieldGroup(answer);
	return group ? String(group.id) : OTHER_FIELDS_GROUP_ID;
};

/**
 * Derive the ordered tab list from the (already sorted) answers: one tab per
 * distinct form field group, in order of first appearance, plus a trailing
 * "other fields" tab when at least one answer has no group.
 *
 * Returns an empty list when no answer has a group at all — the screen then
 * renders the flat field list without any tab bar.
 */
const buildFormFieldGroupTabs = (answers: DatabaseTypes.FormAnswers[], language: string, otherFieldsLabel: string): FormFieldGroupTab[] => {
	const tabs: FormFieldGroupTab[] = [];
	const seenGroupIds = new Set<string>();
	let hasUngroupedAnswer = false;

	(answers || []).forEach(answer => {
		const group = getAnswerFieldGroup(answer);
		if (!group) {
			hasUngroupedAnswer = true;
			return;
		}

		const groupId = String(group.id);
		if (seenGroupIds.has(groupId)) return;
		seenGroupIds.add(groupId);

		const translatedName = group.translations?.length > 0 ? getFromCategoryTranslation(group.translations as any, language) : '';
		tabs.push({
			id: groupId,
			label: translatedName || group.alias || '',
			iconExpo: group.icon_expo,
		});
	});

	if (tabs.length === 0) {
		return [];
	}

	if (hasUngroupedAnswer) {
		tabs.push({ id: OTHER_FIELDS_GROUP_ID, label: otherFieldsLabel, iconExpo: null });
	}

	return tabs;
};

/**
 * Human readable "last edited at" timestamp for the protocol footer, using the
 * same `dd.MM.yyyy HH:mm` pattern the rest of the app uses. Empty when the
 * submission has no (parsable) `date_updated`.
 */
const formatLastEditedAt = (dateUpdated: string | null | undefined): string => {
	if (!dateUpdated) return '';
	const parsed = new Date(dateUpdated);
	if (!isValid(parsed)) return '';
	return format(parsed, 'dd.MM.yyyy HH:mm');
};

/**
 * Apply the "form submission is locked by another user" handling: show a
 * warning (web modal / mobile sheet) if locked by someone else, otherwise
 * (online mode only) lock the submission to the current user.
 */
async function applyFormSubmissionLockState(
	result: DatabaseTypes.FormSubmissions,
	user: any,
	offlineMode: boolean,
	formSubmissionId: string,
	formsSubmissionsHelper: FormsSubmissionsHelper,
	setIsWarning: (value: boolean) => void,
	openWarningSheet: () => void
): Promise<void> {
	if (result?.user_locked_by && result?.user_locked_by !== user?.id) {
		if (isWeb) {
			setIsWarning(true);
		} else {
			openWarningSheet();
		}
	} else if (!offlineMode) {
		try {
			await formsSubmissionsHelper.updateFormSubmissionById(formSubmissionId, {
				user_locked_by: String(user?.id),
				date_started: new Date().toISOString(),
			});
		} catch {
			// update fails silently on network error
		}
	}
}

// Maps the tri-state boolean default (false/true/unset) to the stored 0/1/null value.
function resolveBooleanFieldValue(defaultValue: any): number | null {
	if (defaultValue === false) {
		return 0;
	}
	if (defaultValue === true) {
		return 1;
	}
	return null;
}

/**
 * Resolve the initial edit-form value for a form answer, based on its
 * custom field type (mirrors the per-type conversions used when submitting).
 */
async function resolveInitialFieldValue(
	fieldType: string,
	customType: string,
	defaultValue: any,
	parseDateForEditFn: (fieldType: string, value: string) => string,
	getDirectusFilesDataFn: (data: any) => Promise<any[]>
): Promise<any> {
	if (customType === 'value_custom') {
		return defaultValue || null;
	}
	if (FormHelperCommon.isFieldTypeNumber(fieldType)) {
		return defaultValue ? String(defaultValue)?.replace('.', ',') : null;
	}
	if (customType === 'value_boolean') {
		return resolveBooleanFieldValue(defaultValue);
	}
	if (FormHelperCommon.isDateFieldType(fieldType)) {
		return parseDateForEditFn(fieldType, defaultValue);
	}
	if (customType === 'value_files') {
		return defaultValue ? await getDirectusFilesDataFn(defaultValue) : [];
	}
	if (customType === 'value_image') {
		return defaultValue ? getFormValueImageUrl(defaultValue) : null;
	}
	return defaultValue || null;
}

/**
 * Resolve the Directus folder IDs used for image/file uploads during
 * submission, re-fetching them if either wasn't already resolved at mount.
 */
async function resolveUploadFolderIds(
	imageFolderIdState: string | null,
	filesFolderIdState: string | null
): Promise<{ imageFolderId: string | null; filesFolderId: string | null }> {
	let imageFolderId: string | null = imageFolderIdState;
	let filesFolderId: string | null = filesFolderIdState;
	if (imageFolderId === null || filesFolderId === null) {
		try {
			const formAnswerFields: any = await fetchSpecificField('form_answers');
			imageFolderId = imageFolderId ?? formAnswerFields?.value_image?.meta?.options?.folder ?? null;
			filesFolderId = filesFolderId ?? formAnswerFields?.value_files?.meta?.options?.folder ?? null;
		} catch {
			// silently ignore, upload without folder
		}
	}
	return { imageFolderId, filesFolderId };
}

/**
 * Validate that all currently-visible required fields have a value, toasting
 * an error for each missing one. Returns true if any field failed validation.
 */
function validateRequiredFormAnswers(
	formAnswers: DatabaseTypes.FormAnswers[],
	formData: { [key: string]: { value: any; error: string; custom_type?: string } },
	getAnswerValueFn: (answer: DatabaseTypes.FormAnswers) => any,
	language: string,
	toastFn: (message: string, type: string) => void
): boolean {
	let hasError = false;
	for (const answer of formAnswers) {
		const formField = answer?.form_field as DatabaseTypes.FormFields;
		if (!formField?.is_required) continue;
		if (!isAnswerVisible(answer, formAnswers, getAnswerValueFn)) continue;
		const value = formData[String(answer?.id)]?.value;
		if (!value || (typeof value === 'string' && value.trim() === '')) {
			hasError = true;
			const fieldName = formField?.translations?.length > 0 ? getFromCategoryTranslation(formField.translations, language) : formField?.alias;
			toastFn(`Field "${fieldName}" is required`, 'error');
		}
	}
	return hasError;
}

// Maps a tri-state 0/1 UI value to the stored boolean for value_boolean answers.
function buildBooleanFieldUpdate(value: any): Record<string, any> {
	let booleanValue: boolean | null = null;
	if (value === 0) {
		booleanValue = false;
	} else if (value === 1) {
		booleanValue = true;
	}
	return { value_boolean: booleanValue };
}

/**
 * For signature fields (online mode only), delete the previously-stored Directus file
 * before it gets replaced or cleared. No-op for non-signature fields or offline mode.
 */
async function deleteOldSignatureFileIfNeeded(
	custom_id: string | undefined,
	offlineMode: boolean,
	answer: DatabaseTypes.FormAnswers
): Promise<void> {
	if (custom_id !== 'signature' || offlineMode) {
		return;
	}
	const originalFileId = (answer as any)?.value_image;
	if (!originalFileId) {
		return;
	}
	try {
		await deleteDirectusFile(String(originalFileId));
	} catch (e) {
		console.warn('Could not delete old signature file:', e);
	}
}

/**
 * Build the value_image update payload for a form answer submission.
 * Handles new uploads (including signature base64 uris and deleting the
 * previous signature file) and explicit clearing of the image.
 */
async function buildImageFieldUpdate(
	value: any,
	custom_id: string | undefined,
	offlineMode: boolean,
	answer: DatabaseTypes.FormAnswers,
	imageFolderId: string | null,
	uploadFileFn: (value: any, folderId?: string | null) => Promise<any>
): Promise<Record<string, any>> {
	if (value?.name) {
		// New file: for signature fields delete the old Directus file first (online mode only)
		await deleteOldSignatureFileIfNeeded(custom_id, offlineMode, answer);
		if (custom_id === 'signature') {
			// Signatures: send base64 data URI directly — the backend
			// base64-file-upload-hook will create the Directus file automatically.
			const base64DataUri = await toBase64DataUri(value);
			return { value_image: base64DataUri };
		}
		// Regular images: upload the file first, then store the file ID
		const directusFileId = await uploadFileFn(value, imageFolderId);
		return { value_image: directusFileId };
	}

	if (value === null || value === undefined) {
		// Image/signature cleared — explicitly set to null
		await deleteOldSignatureFileIfNeeded(custom_id, offlineMode, answer);
		return { value_image: null };
	}

	// existing URL unchanged — no update needed
	return {};
}

/**
 * Build the value_files update payload for a form answer submission,
 * uploading newly added files and detecting removed file relations.
 */
async function buildFilesFieldUpdate(
	value: any,
	answer: DatabaseTypes.FormAnswers,
	filesFolderId: string | null,
	uploadFileFn: (value: any, folderId?: string | null) => Promise<any>
): Promise<Record<string, any>> {
	if (!(Array.isArray(value) && value.length > 0)) {
		// All files cleared — explicitly set to empty
		return { value_files: [] };
	}

	const newFiles = value.filter((file: any) => !file?.edit);
	const existingFileIds = new Set(value.filter((file: any) => file?.edit).map((file: any) => file.directus_files_id).filter(Boolean));

	// Detect deleted relations by comparing current files with original answer files
	const originalValueFiles: any[] = (answer as any).value_files || [];
	const deletedRelationIds = originalValueFiles
		.filter((orig: any) => orig?.directus_files_id && !existingFileIds.has(orig.directus_files_id))
		.map((orig: any) => orig.id)
		.filter(Boolean);

	if (newFiles.length === 0 && deletedRelationIds.length === 0) {
		// only unchanged existing files, no action needed
		return {};
	}

	const uploadedFileIds = newFiles.length > 0
		? await Promise.all(newFiles.map(async (file: any) => await uploadFileFn(file, filesFolderId)))
		: [];

	const valueFilesUpdate: Record<string, any> = {};
	const validUploadIds = uploadedFileIds.filter(Boolean);
	if (validUploadIds.length > 0) {
		valueFilesUpdate.create = validUploadIds.map(fileId => ({ directus_files_id: fileId }));
	}
	if (deletedRelationIds.length > 0) {
		valueFilesUpdate.delete = deletedRelationIds;
	}
	return { value_files: valueFilesUpdate };
}

/**
 * Build the per-custom-type updated value fields for a single form answer
 * during submission (mirrors the field's storage column: value_string,
 * value_number, value_boolean, value_custom, value_date, value_image or value_files).
 */
async function buildUpdatedValueFieldsForAnswer(options: {
	custom_type: string | undefined;
	custom_id: string | undefined;
	value: any;
	formateDate: string | null | undefined;
	answer: DatabaseTypes.FormAnswers;
	offlineMode: boolean;
	imageFolderId: string | null;
	filesFolderId: string | null;
	uploadFileFn: (value: any, folderId?: string | null) => Promise<any>;
}): Promise<Record<string, any>> {
	const { custom_type, custom_id, value, formateDate, answer, offlineMode, imageFolderId, filesFolderId, uploadFileFn } = options;
	if (custom_type === 'value_string') {
		return { value_string: value };
	}
	if (custom_type === 'value_number') {
		return { value_number: value ? value.replace(',', '.') : null };
	}
	if (custom_type === 'value_boolean') {
		return buildBooleanFieldUpdate(value);
	}
	if (custom_type === 'value_custom') {
		return { value_custom: value };
	}
	if (custom_type === 'value_date') {
		return { value_date: formateDate };
	}
	if (custom_type === 'value_image') {
		return buildImageFieldUpdate(value, custom_id, offlineMode, answer, imageFolderId, uploadFileFn);
	}
	if (custom_type === 'value_files') {
		return buildFilesFieldUpdate(value, answer, filesFolderId, uploadFileFn);
	}
	return {};
}

/**
 * Die PDF-Ansicht eines Vorgangs.
 *
 * Wie ein ausgefülltes Formular gedruckt aussieht, weiß nur das Backend: dort liegt die
 * Vorlage, und dort entsteht auch das PDF, das beim Einreichen an die Mail geht. Die App
 * fragt es unter `POST /form-pdf-preview` für den Vorgang ab und zeigt das Ergebnis; gezeigt
 * wird damit der gespeicherte Stand, nicht was gerade ungespeichert im Formular steht.
 */
const FORM_PDF_PREVIEW_ENDPOINT = '/form-pdf-preview';

/** Wie lange die Adresse des Dokuments im Browser gültig bleibt, bevor sie freigegeben wird. */
const BLOB_URL_LIFETIME_MS = 60_000;

/** Der Dateiname auf dem Gerät – aus der Vorgangskennung. */
function buildFormPdfFileName(alias: string | null | undefined): string {
	return FileNameHelper.buildSafeFileName({ name: alias, extension: 'pdf', fallbackName: 'form' });
}

/** Holt das PDF des Vorgangs vom Backend. Wirft, wenn die Route nichts liefert. */
async function fetchFormPdf(formSubmissionId: string): Promise<ArrayBuffer> {
	const response = await authorizedFetch(FORM_PDF_PREVIEW_ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ form_submission_id: formSubmissionId }),
	});

	if (!response.ok) {
		throw new Error(`Form pdf request failed with status ${response.status}`);
	}

	return await response.arrayBuffer();
}

/**
 * Zeigt das PDF: im Web in einem neuen Tab, auf dem Gerät über das Teilen-Menü, das eine
 * Vorschau anbietet – dasselbe Muster wie beim Herunterladen eines Bildes im Vollbild. Blockt
 * der Browser den Tab, weil die Antwort erst nach dem Tippen kam, wird stattdessen
 * heruntergeladen; ein Download wird nicht geblockt.
 */
async function openFormPdf(pdfBytes: ArrayBuffer, fileName: string): Promise<void> {
	if (isWeb) {
		const blob = new Blob([pdfBytes], { type: 'application/pdf' });
		const blobUrl = URL.createObjectURL(blob);
		const openedWindow = window.open(blobUrl, '_blank');
		if (!openedWindow) {
			const link = document.createElement('a');
			link.href = blobUrl;
			link.download = fileName;
			document.body.appendChild(link);
			link.click();
			link.remove();
		}
		setTimeout(() => URL.revokeObjectURL(blobUrl), BLOB_URL_LIFETIME_MS);
		return;
	}

	const base64 = MyBuffer.from(pdfBytes).toString('base64');
	const fileUri = `${(FileSystem as any).cacheDirectory}${fileName}`;
	await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
	await Share.share({ url: fileUri, message: fileUri });
}

function getAliasExcerptLength(screenWidth: number): number {
	if (screenWidth > 900) {
		return 100;
	}
	if (screenWidth > 700) {
		return 80;
	}
	return 22;
}

function getFormSubmissionHeaderTexts(formSubmission: DatabaseTypes.FormSubmissions | null | undefined, screenWidth: number) {
	if (!formSubmission) {
		return { headerTitle: '', formSubmissionIdText: '' };
	}
	return {
		headerTitle: excerpt(formSubmission?.alias as string, getAliasExcerptLength(screenWidth)),
		formSubmissionIdText: formSubmission?.id,
	};
}

const Index = () => {
	const toast = useToast();
	const scrollViewRef = useRef(null);
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { form_submission_id, queue_entry_id } = useLocalSearchParams();
	const formAnswersHelper = new FormAnswersHelper();
	const formsSubmissionsHelper = new FormsSubmissionsHelper();
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const [loading, setLoading] = useState(false);
	const [isWarning, setIsWarning] = useState(false);
	const [formAnswers, setFormAnswers] = useState<DatabaseTypes.FormAnswers[]>([]);
	const [loadingCollection, setLoadingCollection] = useState(false);
	const [collectionData, setCollectionData] = useState<any>([]);
	const [selectedState, setSelectedState] = useState('submitted');
	const [currentState, setCurrentState] = useState<string | null>(null);
	const { formSubmission, formQueue, cachedFormData } = useAppSelector((state) => state.form);
	const { user } = useAppSelector((state) => state.authReducer);
	const [submissionLoading, setSubmissionLoading] = useState(false);
	const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
	const [formData, setFormData] = useState<{
		[key: string]: { value: any; error: string; custom_type?: string };
	}>({});
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const { language, drawerPosition, primaryColor, offlineMode, selectedTheme } = useAppSelector((state) => state.settings);
	const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
	const [imageFolderIdState, setImageFolderIdState] = useState<string | null>(null);
	const [filesFolderIdState, setFilesFolderIdState] = useState<string | null>(null);
	const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

	// Set Page Title
	useSetPageTitle(formSubmission?.alias || TranslationKeys.form_submission);

	const otherFieldsGroupLabel = translate(TranslationKeys.form_field_group_other_fields);

	const formFieldGroupTabs = useMemo(() => buildFormFieldGroupTabs(formAnswers, language, otherFieldsGroupLabel), [formAnswers, language, otherFieldsGroupLabel]);

	// Derived so the first tab is already active on the very first render after the
	// answers arrive, before the effect below has stored it.
	const activeGroupId = formFieldGroupTabs.some(tab => tab.id === selectedGroupId) ? selectedGroupId : (formFieldGroupTabs[0]?.id ?? null);

	// Keep the selected tab across reloads (e.g. re-focus) as long as it still
	// exists, otherwise fall back to the first group.
	useEffect(() => {
		if (formFieldGroupTabs.length === 0) {
			setSelectedGroupId(null);
			return;
		}

		setSelectedGroupId(previous => (previous && formFieldGroupTabs.some(tab => tab.id === previous) ? previous : formFieldGroupTabs[0].id));
	}, [formFieldGroupTabs]);

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
				return !Number.isNaN(value);
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
		showScrollViewModal({
			children: <EditFormSubmissionSheet id={String(form_submission_id)} closeSheet={closeScrollViewModal} />,
		});
	};

	const openWarningSheet = () => {
		showScrollViewModal({
			children: <SubmissionWarningSheet id={String(form_submission_id)} closeSheet={closeScrollViewModal} />,
		});
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
		let result: DatabaseTypes.FormSubmissions | null = null;

		if (offlineMode) {
			// In offline mode, use cache only
			result = Object.values(cachedFormData || {})
				.flatMap(entry => entry.submissions || [])
				.find(s => String(s.id) === String(form_submission_id)) || null;
		} else {
			// In online mode, always fetch fresh from API; fall back to cache on network error
			try {
				result = (await formsSubmissionsHelper.fetchFormubmissionById(String(form_submission_id), {
					// `user_updated` is needed for the "last edited by" footer.
					fields: ['*', 'user_updated.id', 'user_updated.first_name', 'user_updated.last_name', 'user_updated.email'],
				})) as DatabaseTypes.FormSubmissions;
			} catch {
				result = Object.values(cachedFormData || {})
					.flatMap(entry => entry.submissions || [])
					.find(s => String(s.id) === String(form_submission_id)) || null;
			}
		}

		if (result) {
			dispatch({ type: SET_FORM_SUBMISSION, payload: result });
			await applyFormSubmissionLockState(result, user, offlineMode, String(form_submission_id), formsSubmissionsHelper, setIsWarning, openWarningSheet);
		} else if (offlineMode) {
			toast(translate(TranslationKeys.form_submission_not_found_offline), 'error');
		} else {
			toast(translate(TranslationKeys.form_submission_not_found), 'error');
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

		// In offline mode use cache; in online mode always fetch fresh from API
		let result: DatabaseTypes.FormAnswers[] | null = null;

		if (offlineMode) {
			result = Object.values(cachedFormData || {})
				.map(entry => entry.answers?.[String(form_submission_id)])
				.find(answers => answers && answers.length > 0) || null;
		} else {
			try {
				result = (await formAnswersHelper.fetchFormAnswers({
					filter: { form_submission: { _eq: form_submission_id } },
				})) as DatabaseTypes.FormAnswers[];
			} catch {
				// Fall back to cache on network error
				result = Object.values(cachedFormData || {})
					.map(entry => entry.answers?.[String(form_submission_id)])
					.find(answers => answers && answers.length > 0) || null;
			}
		}

		if (result) {
			result.sort((a, b) => {
				const sortA = (a.form_field as DatabaseTypes.FormFields)?.sort ?? Number.MAX_SAFE_INTEGER;
				const sortB = (b.form_field as DatabaseTypes.FormFields)?.sort ?? Number.MAX_SAFE_INTEGER;
				return sortA - sortB;
			});
			const sortedResult = result;

			setFormAnswers(sortedResult);

			const initialFormData: {
				[key: string]: { value: any; error: string; custom_type: string };
			} = {};

			const fieldPromises = sortedResult.map(async answer => {
				const fieldId = String(answer?.id);
				const fieldType = (answer?.form_field as DatabaseTypes.FormFields)?.field_type || '';
				const [custom_type] = fieldType.split('-');
				const defaultValue = (answer as any)[custom_type];

				const value = await resolveInitialFieldValue(fieldType, custom_type, defaultValue, parseDateForEdit, getDirectusFilesData);

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

			// If opened from queue, override with queued formData
			if (queue_entry_id) {
				const queueEntry = (formQueue || []).find((entry: any) => entry.id === queue_entry_id);
				if (queueEntry) {
					setFormData({ ...initialFormData, ...queueEntry.formData });
					setSelectedState(queueEntry.targetState);
				}
			}
		}

		setLoading(false);
	};

	const fetchCollection = async (collection: string) => {
		if (collection) {
			setLoadingCollection(true);
			try {
				const dynamicCollectionHelper = new DynamicCollectionHelper(collection);
				const data = (await dynamicCollectionHelper.fectAllCollection()) as any;
				if (data) {
					if (collection === 'apartments' && data?.length > 0) {
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

				case FormHelperCommon.FORM_FIELD_TYPE.DATE_HH_MM: {
					// Convert HH:MM → ISO (Assuming today's date)
					const today = format(new Date(), 'yyyy-MM-dd');
					dateObj = parse(`${today} ${value}`, 'yyyy-MM-dd HH:mm', new Date());
					break;
				}

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

	const getDirectusUploadId = async (value: any, folderId?: string | null) => {
		// Only web reads the bytes upfront - on native the local uri is handed to the upload
		// helper as is, `fetch` cannot read `file://`/`data:` uris there.
		if (!isWeb) {
			const nativeFileData = { name: value.name, type: value.type, buffer: value.image, edit: true };
			return uploadToDirectusFromMobile(nativeFileData, folderId);
		}

		const response = await fetch(value.image);
		const arrayBuffer = await response.arrayBuffer();
		const buffer = MyBuffer.from(arrayBuffer);
		const fileData = {
			name: value.name,
			type: value.type,
			buffer,
			edit: true,
		};
		return uploadToDirectus(fileData, folderId);
	};

	const handleAddToQueue = () => {
		const rawFormId = (formSubmission as any)?.form;
		let form_id = '';
		if (rawFormId) {
			form_id = typeof rawFormId === 'object' ? String(rawFormId?.id || '') : String(rawFormId);
		}
		const alias = String(formSubmission?.alias || form_submission_id || '');
		const entryId = queue_entry_id ? String(queue_entry_id) : `${Date.now().toString(36)}-${MathHelper.random().toString(36).slice(2)}`;
		const entry = {
			id: entryId,
			form_submission_id: String(form_submission_id),
			form_id,
			alias,
			targetState: selectedState,
			formData,
			timestamp: new Date().toISOString(),
		};
		dispatch({ type: ADD_FORM_QUEUE_ENTRY, payload: entry });
		toast(translate(TranslationKeys.form_queue_added), 'success');
		setFormData({});
		if (router.canGoBack()) {
			router.back();
		} else {
			router.navigate('/form-categories');
		}
	};

	/**
	 * Zeigt den Vorgang als PDF – dasselbe Dokument, das beim Einreichen an die Mail geht.
	 * Das Backend baut es aus den gespeicherten Antworten; ungespeicherte Eingaben stehen
	 * deshalb erst nach dem Speichern darin.
	 */
	const handleShowFormPdf = async () => {
		setPdfPreviewLoading(true);
		try {
			const pdfBytes = await fetchFormPdf(String(form_submission_id));
			await openFormPdf(pdfBytes, buildFormPdfFileName(formSubmission?.alias));
		} catch (error) {
			console.error('Could not show the form pdf:', error);
			toast(translate(TranslationKeys.form_pdf_preview_failed), 'error');
		} finally {
			setPdfPreviewLoading(false);
		}
	};

	const handleFormSubmission = async () => {
		setSubmissionLoading(true);

		// Use folder IDs already fetched at component mount; re-fetch if either is still null
		const { imageFolderId, filesFolderId } = await resolveUploadFolderIds(imageFolderIdState, filesFolderIdState);

		// Validate required fields that are currently visible in the form
		const hasError = validateRequiredFormAnswers(formAnswers, formData, getAnswerValue, language, toast);

		if (hasError) {
			setSubmissionLoading(false);
			return;
		}

		const filteredFormAnswers = formAnswers.filter(answer => formData.hasOwnProperty(String(answer?.id)));

		const updatedFormAnswers = await Promise.all(
			filteredFormAnswers.map(async answer => {
				const fieldId = answer?.id;
				const formDataEntry = formData[String(fieldId)];
				const value = formDataEntry?.value;
				const fieldType = (answer?.form_field as DatabaseTypes.FormFields)?.field_type || '';
				const custom_id = fieldType?.split('-')[1];

				const { custom_type } = formDataEntry;
				let formateDate;
				if (FormHelperCommon.isDateFieldType(fieldType)) {
					formateDate = formatDateForSubmission(fieldType, value);
				}

				const updatedValueFields = await buildUpdatedValueFieldsForAnswer({
					custom_type,
					custom_id,
					value,
					formateDate,
					answer,
					offlineMode,
					imageFolderId,
					filesFolderId,
					uploadFileFn: getDirectusUploadId,
				});

				return {
					id: fieldId,
					...updatedValueFields,
				};
			})
		);

		const finalAnswers = updatedFormAnswers.filter(Boolean);

		if (finalAnswers.length > 0) {
			// In offline mode, immediately add to queue without attempting upload
			if (offlineMode) {
				setSubmissionLoading(false);
				handleAddToQueue();
				return;
			}
			try {
				await Promise.all(finalAnswers.map((answer: any) => formAnswersHelper.updateFormAnswers(answer.id, answer)));

				await formsSubmissionsHelper.updateFormSubmissionById(String(form_submission_id), { state: selectedState });

				// If submitted from queue, remove the queue entry
				if (queue_entry_id) {
					dispatch({ type: REMOVE_FORM_QUEUE_ENTRY, payload: String(queue_entry_id) });
				}

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
				setSubmissionLoading(false);
				handleAddToQueue();
			}
		} else {
			setSubmissionLoading(false);
		}
	};

	useEffect(() => {
		if (formAnswers) {
			formAnswers.forEach(answer => {
				const fieldType = (answer?.form_field as DatabaseTypes.FormFields)?.field_type || '';
				const parts = fieldType.split('-');
				if (parts) {
					const collection = parts?.length > 2 ? parts.slice(2).join('-') : '';
					if (parts[0] === 'value_custom') {
						void fetchCollection(collection);
					}
				}
			});
		}
	}, [formAnswers]);

	useFocusEffect(
		useCallback(() => {
			if (form_submission_id) {
				void fetchAllFormAnswers();
			}
			return () => {};
		}, [form_submission_id])
	);

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	// Fetch folder IDs once at mount so they can be shown as hints and used during upload
	useEffect(() => {
		const fetchFolderIds = async () => {
			try {
				const formAnswerFields: any = await fetchSpecificField('form_answers');
				setImageFolderIdState(formAnswerFields?.value_image?.meta?.options?.folder ?? null);
				setFilesFolderIdState(formAnswerFields?.value_files?.meta?.options?.folder ?? null);
			} catch {
				// silently ignore
			}
		};
		void fetchFolderIds();
	}, []);

	const { headerTitle, formSubmissionIdText } = getFormSubmissionHeaderTexts(formSubmission, screenWidth);
	// `styles/themes.ts` is missing `drawer.logoBg` / `drawer.divider` from the `Theme`
	// type — a pre-existing repo-wide mismatch that every `myContrastColor` call site
	// hits. The cast keeps this screen type-clean until the theme objects are fixed.
	const activeGroupTabTextColor = myContrastColor(primaryColor, theme as unknown as Theme, selectedTheme === 'dark');
	// Offline/cached submissions may carry `user_updated` as a plain id string — then no name is shown.
	const lastEditedByName = getUserDisplayName(formSubmission?.user_updated);
	const lastEditedAtText = formatLastEditedAt(formSubmission?.date_updated);
	const showLastEditedBlock = Boolean(lastEditedByName || lastEditedAtText);

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
						<TouchableOpacity onPress={() => {
							if (router.canGoBack()) {
								router.back();
							} else {
								router.navigate('/form-categories');
							}
						}} style={{ padding: 10 }}>
							<Ionicons name="arrow-back" size={26} color={theme.header.text} />
						</TouchableOpacity>
						<Text style={{ ...styles.heading, color: theme.header.text }}>{headerTitle}</Text>
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
							<LoadingIndicator size={30} color={theme.screen.text} />
						</View>
					) : (
						<View style={styles.content}>
							<View
								style={{
									...styles.formSubmissionId,
									backgroundColor: theme.screen.iconBg,
								}}
							>
								<Text style={{ ...styles.body, color: theme.screen.text }}>{formSubmissionIdText}</Text>
							</View>
							{formFieldGroupTabs.length > 0 && (
								<ScrollView horizontal showsHorizontalScrollIndicator={false} style={localStyles.groupTabBar} contentContainerStyle={localStyles.groupTabBarContent} keyboardShouldPersistTaps="handled" accessibilityRole="tablist">
									{formFieldGroupTabs.map(tab => {
										const isActiveTab = tab.id === activeGroupId;
										const tabTextColor = isActiveTab ? activeGroupTabTextColor : theme.screen.text;
										const { IconComponent: TabIconComponent, iconName: tabIconName } = resolveFieldIcon(tab.iconExpo);

										return (
											<TouchableOpacity
												key={tab.id}
												onPress={() => setSelectedGroupId(tab.id)}
												style={{
													...localStyles.groupTab,
													backgroundColor: isActiveTab ? primaryColor : theme.screen.iconBg,
												}}
												accessibilityRole="tab"
												accessibilityState={{ selected: isActiveTab }}
												accessibilityLabel={tab.label}
											>
												{TabIconComponent && <TabIconComponent name={tabIconName} size={16} color={tabTextColor} />}
												<Text style={{ ...styles.body, color: tabTextColor }}>{tab.label}</Text>
											</TouchableOpacity>
										);
									})}
								</ScrollView>
							)}
							{formAnswers?.map((answer, index) => {
									const formField = isFormFieldEntity(answer?.form_field) ? answer.form_field : null;
									const fieldType = formField?.field_type || '';
									const prefix = (answer?.form_field as DatabaseTypes.FormFields)?.value_prefix;
									const suffix = (answer?.form_field as DatabaseTypes.FormFields)?.value_suffix;
									const [custom_type, ...idParts] = fieldType.split('-');
									const custom_id = idParts.join('-');
									const fieldId = String(answer?.id);
									const dropdownValues = parseDropdownValues((answer?.form_field as DatabaseTypes.FormFields)?.dropdown_values);
									const description = (answer?.form_field as DatabaseTypes.FormFields)?.translations?.length > 0 ? getFromDescriptionTranslation((answer?.form_field as DatabaseTypes.FormFields)?.translations, language) : '';
									const showInForm = isAnswerVisible(answer, formAnswers, getAnswerValue);
									// Without groups every field is shown; with groups only the selected tab's fields.
									const isInSelectedGroup = formFieldGroupTabs.length === 0 || getAnswerGroupTabId(answer) === activeGroupId;

									if (!showInForm || !isInSelectedGroup) {
										return null;
									}

									const isDisabled = (answer?.form_field as DatabaseTypes.FormFields)?.is_disabled || false;
									const { IconComponent, iconName } = resolveFieldIcon((answer?.form_field as DatabaseTypes.FormFields)?.icon_expo);

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
													{(answer?.form_field as DatabaseTypes.FormFields)?.translations?.length > 0 ? getFromCategoryTranslation((answer?.form_field as DatabaseTypes.FormFields)?.translations, language) : (answer?.form_field as DatabaseTypes.FormFields)?.alias}
												</Text>
												{(answer?.form_field as DatabaseTypes.FormFields)?.is_required && <FontAwesome6 name="star-of-life" size={12} color={'red'} />}
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
											{custom_id === 'bank_account_number' && showInForm && <IBANInput id={fieldId} value={formData[fieldId]?.value || ''} onChange={change => handleChange(change.id, change.value, change.custom_type)} onError={handleError} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} prefix={prefix} suffix={suffix} />}
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
											{custom_id === 'files' && showInForm && <FileUpload id={fieldId} value={formData[fieldId]?.value} onChange={handleChange} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} offlineMode={offlineMode} folderHint={filesFolderIdState} />}
											{custom_id === 'image' && showInForm && <ImageUpload id={fieldId} value={formData[fieldId]?.value} onChange={handleChange} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} offlineMode={offlineMode} folderHint={imageFolderIdState} />}
											{custom_id === 'signature' && showInForm && <SignatureInterface id={fieldId} value={formData[fieldId]?.value} onChange={handleChange} error={formData[fieldId]?.error} isDisabled={isDisabled} custom_type={custom_type} scrollViewRef={scrollViewRef} folderHint={imageFolderIdState} />}
											{custom_type === 'value_custom' && showInForm && <CollectionSelection id={fieldId} value={formData[fieldId]?.value} onChange={handleChange} error={formData[fieldId]?.error} isDisabled={isDisabled} loading={loadingCollection} data={collectionData} custom_type={custom_type} />}
										</View>
									);
								})}
							{showLastEditedBlock && (
								<View
									style={{
										...localStyles.lastEditedContainer,
										borderWidth: 1,
										borderColor: theme.screen.iconBg,
									}}
								>
									{Boolean(lastEditedByName) && <Text style={{ ...styles.body, color: theme.screen.text }}>{`${translate(TranslationKeys.form_last_edited_by)}: ${lastEditedByName}`}</Text>}
									{Boolean(lastEditedAtText) && <Text style={{ ...styles.body, color: theme.screen.text }}>{`${translate(TranslationKeys.form_last_edited_at)}: ${lastEditedAtText}`}</Text>}
								</View>
							)}
							<DebugView
								title={translate(TranslationKeys.form_pdf_preview_title)}
								actions={[
									{
										label: pdfPreviewLoading ? translate(TranslationKeys.form_pdf_preview_loading) : translate(TranslationKeys.form_pdf_preview_show),
										icon: 'file-pdf-box',
										onPress: handleShowFormPdf,
										disabled: pdfPreviewLoading,
									},
								]}
							>
								<Text style={{ ...styles.body, color: theme.screen.text }}>{translate(TranslationKeys.form_pdf_preview_hint)}</Text>
							</DebugView>
							<DebugView title="Form Data">
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
					{submissionLoading ? <LoadingIndicator size={22} color={theme.screen.text} /> : <Text style={{ ...styles.buttonLabel, color: theme.activeText }}>{translate(TranslationKeys.save)}</Text>}
				</TouchableOpacity>
			</View>
			<SubmissionWarningModal isVisible={isWarning} setIsVisible={setIsWarning} id={String(form_submission_id)} />
			<FilterFormSheet isVisible={isFilterModalVisible} closeSheet={closeFilterSheet} isFormSubmission={true} setSelectedOption={setSelectedState} selectedOption={selectedState} options={filterOptions} isEditMode={isEditMode} />
		</View>
	);
};

// Guard rail: a screen that throws is replaced by an error page with "try
// again" and "back" instead of closing the app.
export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ScreenErrorBoundary';

export default Index;
