import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import React, { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { DatabaseTypes, FormHelperCommon } from 'repo-depkit-common';
import { router } from 'expo-router';
import { isWeb } from '@/constants/Constants';
import { FormsSubmissionsHelper } from '@/redux/actions/Forms/FormSubmitions';
import { FormAnswersHelper } from '@/redux/actions/Forms/FormAnswers';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useAppSelector } from '@/redux/hooks';
import { useDispatch } from 'react-redux';
import { REMOVE_FORM_QUEUE_ENTRY } from '@/redux/Types/types';
import { FormQueueEntry } from '@/redux/Types/stateTypes';
import useToast from '@/hooks/useToast';
import { format, isValid, parse } from 'date-fns';
import { uploadToDirectus, uploadToDirectusFromMobile } from '@/constants/HelperFunctions';
import { MyBuffer } from 'repo-depkit-common-ui';
import { fetchSpecificField } from '@/redux/actions/Fields/Fields';

const resolveDateValueField = (value: any, fieldType: string): Record<string, any> => {
    let formattedDate: string | null = null;
    try {
        if (value) {
            let dateObj;
            if (fieldType === FormHelperCommon.FORM_FIELD_TYPE.DATE_DATE_AND_HH_MM) {
                dateObj = parse(value, 'dd.MM.yyyy HH:mm', new Date());
            } else if (fieldType === FormHelperCommon.FORM_FIELD_TYPE.DATE) {
                dateObj = parse(value, 'dd.MM.yyyy', new Date());
            } else if (fieldType === FormHelperCommon.FORM_FIELD_TYPE.DATE_HH_MM) {
                const today = format(new Date(), 'yyyy-MM-dd');
                dateObj = parse(`${today} ${value}`, 'yyyy-MM-dd HH:mm', new Date());
            } else if (fieldType === FormHelperCommon.FORM_FIELD_TYPE.DATE_TIMESTAMP) {
                dateObj = parse(value, 'dd.MM.yyyy HH:mm:ss', new Date());
            }
            if (dateObj && isValid(dateObj)) {
                formattedDate = format(dateObj, "yyyy-MM-dd'T'HH:mm:ss.SSSX");
            }
        }
    } catch {
        formattedDate = null;
    }
    return { value_date: formattedDate };
};

// Only web reads the bytes upfront - on native the local uri is handed to the upload helper
// as is, `fetch` cannot read `file://`/`data:` uris there.
const uploadLocalFile = async (value: any, folderId: string | null) => {
    if (!isWeb) {
        return uploadToDirectusFromMobile({ name: value.name, type: value.type, buffer: value.image, edit: true }, folderId);
    }
    const response = await fetch(value.image);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = MyBuffer.from(arrayBuffer);
    return uploadToDirectus({ name: value.name, type: value.type, buffer, edit: true }, folderId);
};

const resolveImageValueField = async (value: any, fieldId: string, imageFolderId: string | null): Promise<Record<string, any>> => {
    if (value?.name) {
        try {
            const fileId = await uploadLocalFile(value, imageFolderId);
            return { value_image: fileId };
        } catch (uploadError) {
            console.error('Queue sync: image upload failed for field', fieldId, uploadError);
            return {};
        }
    } else if (value === null || value === undefined) {
        // Image/signature was cleared — explicitly set to null
        return { value_image: null };
    }
    return {};
};

const resolveFilesValueField = async (value: any, fieldId: string, filesFolderId: string | null): Promise<Record<string, any>> => {
    if (Array.isArray(value) && value.length > 0) {
        try {
            const newFiles = value.filter((file: any) => !file?.edit);
            if (newFiles.length > 0) {
                const uploadedIds = await Promise.all(newFiles.map((file: any) => uploadLocalFile(file, filesFolderId)));
                return {
                    value_files: {
                        create: uploadedIds.filter(Boolean).map((fileId: any) => ({ directus_files_id: fileId })),
                    },
                };
            }
            // else: only existing files, no new uploads needed
            return {};
        } catch (uploadError) {
            console.error('Queue sync: file upload failed for field', fieldId, uploadError);
            return {};
        }
    } else {
        // All files cleared — explicitly set to empty
        return { value_files: [] };
    }
};

const resolveUpdatedValueFields = async (
    customType: string | undefined,
    value: any,
    fieldId: string,
    fieldType: string,
    imageFolderId: string | null,
    filesFolderId: string | null
): Promise<Record<string, any>> => {
    if (customType === 'value_string') {
        return { value_string: value };
    } else if (customType === 'value_number') {
        return { value_number: value ? String(value).replace(',', '.') : null };
    } else if (customType === 'value_boolean') {
        let booleanValue: boolean | null = null;
        if (value === 0) {
            booleanValue = false;
        } else if (value === 1) {
            booleanValue = true;
        }
        return { value_boolean: booleanValue };
    } else if (customType === 'value_custom') {
        return { value_custom: value };
    } else if (customType === 'value_date') {
        return resolveDateValueField(value, fieldType);
    } else if (customType === 'value_image') {
        return resolveImageValueField(value, fieldId, imageFolderId);
    } else if (customType === 'value_files') {
        return resolveFilesValueField(value, fieldId, filesFolderId);
    }
    return {};
};

const Index = () => {
    useSetPageTitle(TranslationKeys.form_queue);
    const { translate } = useLanguage();
    const { theme } = useTheme();
    const dispatch = useDispatch();
    const toast = useToast();
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const formsSubmissionsHelper = new FormsSubmissionsHelper();
    const formAnswersHelper = new FormAnswersHelper();
    const { formQueue } = useAppSelector((state) => state.form);
    const { primaryColor } = useAppSelector((state) => state.settings);

    const queueEntries: FormQueueEntry[] = formQueue || [];

    const syncQueueEntry = async (entry: FormQueueEntry) => {
        setSyncingId(entry.id);
        try {
            // Fetch folder IDs for value_image and value_files fields
            let imageFolderId: string | null = null;
            let filesFolderId: string | null = null;
            try {
                const formAnswerFields: any = await fetchSpecificField('form_answers');
                imageFolderId = formAnswerFields?.value_image?.meta?.options?.folder ?? null;
                filesFolderId = formAnswerFields?.value_files?.meta?.options?.folder ?? null;
            } catch (fieldError) {
                console.warn('Queue sync: could not fetch field folder config:', fieldError);
            }

            const answers = (await formAnswersHelper.fetchFormAnswers({
                filter: { form_submission: { _eq: entry.form_submission_id } },
            })) as DatabaseTypes.FormAnswers[];

            if (!answers || answers.length === 0) {
                console.error('Queue sync failed: no answers found for submission', entry.form_submission_id);
                toast(translate(TranslationKeys.form_queue_sync_failed), 'error');
                setSyncingId(null);
                return;
            }

            const filteredAnswers = answers.filter((answer: DatabaseTypes.FormAnswers) =>
                entry.formData.hasOwnProperty(String(answer?.id))
            );

            const updatedAnswers = await Promise.all(
                filteredAnswers.map(async (answer: DatabaseTypes.FormAnswers) => {
                    const fieldId = String(answer?.id);
                    const formDataEntry = entry.formData[fieldId];
                    if (!formDataEntry) return null;
                    const { value, custom_type } = formDataEntry;
                    const fieldType = (answer?.form_field as DatabaseTypes.FormFields)?.field_type || '';

                    const updatedValueFields = await resolveUpdatedValueFields(
                        custom_type,
                        value,
                        fieldId,
                        fieldType,
                        imageFolderId,
                        filesFolderId
                    );

                    return { id: fieldId, ...updatedValueFields };
                })
            );

            const finalAnswers = updatedAnswers.filter(Boolean);
            await Promise.all(finalAnswers.map((answer: any) => formAnswersHelper.updateFormAnswers(answer.id, answer)));
            await formsSubmissionsHelper.updateFormSubmissionById(entry.form_submission_id, { state: entry.targetState });
            dispatch({ type: REMOVE_FORM_QUEUE_ENTRY, payload: entry.id });
            toast(translate(TranslationKeys.form_queue_synced), 'success');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Queue sync error for entry', entry.id, ':', errorMessage, error);
            toast(translate(TranslationKeys.form_queue_sync_failed), 'error');
        } finally {
            setSyncingId(null);
        }
    };

    const syncAllQueueEntries = async () => {
        setIsSyncingAll(true);
        try {
            await Promise.allSettled(queueEntries.map((entry: FormQueueEntry) => syncQueueEntry(entry)));
        } finally {
            setIsSyncingAll(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.screen.background }}>
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 20 }}>
                <View style={{ width: isWeb ? '70%' : '90%' }}>
                    {/* Sync All button */}
                    {queueEntries.length > 0 && (
                        <TouchableOpacity
                            onPress={syncAllQueueEntries}
                            disabled={isSyncingAll || syncingId !== null}
                            style={{
                                marginBottom: 16,
                                paddingHorizontal: 20,
                                paddingVertical: 10,
                                borderRadius: 20,
                                backgroundColor: primaryColor,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                            }}
                        >
                            <MaterialCommunityIcons name="sync" size={20} color="#fff" />
                            <Text style={{ color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 15 }}>
                                {translate(TranslationKeys.form_queue_sync_all)}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Queue list */}
                    {queueEntries.length === 0 ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <MaterialCommunityIcons name="clock-check-outline" size={48} color={theme.screen.icon} />
                            <Text style={{ color: theme.screen.text, fontSize: 16, fontFamily: 'Poppins_400Regular', marginTop: 12, textAlign: 'center' }}>
                                {translate(TranslationKeys.form_queue_empty)}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={queueEntries}
                            keyExtractor={(item: FormQueueEntry) => item.id}
                            renderItem={({ item }: { item: FormQueueEntry }) => (
                                <TouchableOpacity
                                    style={{
                                        width: '100%',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        borderRadius: 10,
                                        padding: 10,
                                        marginBottom: 10,
                                        backgroundColor: theme.screen.iconBg,
                                    }}
                                    onPress={() => {
                                        router.push({
                                            pathname: '/form-submission',
                                            params: { form_submission_id: item.form_submission_id, queue_entry_id: item.id },
                                        });
                                    }}
                                >
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <MaterialCommunityIcons name="clock-outline" size={18} color={theme.screen.icon} />
                                        <Text style={{ color: theme.screen.text, fontSize: 16, fontFamily: 'Poppins_400Regular', flex: 1 }} numberOfLines={1}>
                                            {item.alias || item.form_submission_id}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <TouchableOpacity
                                            onPress={() => syncQueueEntry(item)}
                                            style={{ padding: 8 }}
                                            disabled={isSyncingAll || syncingId !== null}
                                        >
                                            {syncingId === item.id ? (
                                                <LoadingIndicator size={20} color={theme.screen.icon} />
                                            ) : (
                                                <MaterialCommunityIcons name="sync" size={22} color={theme.screen.icon} />
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => dispatch({ type: REMOVE_FORM_QUEUE_ENTRY, payload: item.id })}
                                            style={{ padding: 8 }}
                                            disabled={isSyncingAll || syncingId !== null}
                                        >
                                            <MaterialCommunityIcons name="trash-can-outline" size={22} color={theme.screen.icon} />
                                        </TouchableOpacity>
                                        <Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />
                                    </View>
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    )}
                </View>
            </View>
        </View>
    );
};

export default Index;
