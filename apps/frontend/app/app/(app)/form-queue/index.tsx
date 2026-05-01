import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
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
import { Buffer } from 'buffer';
import { fetchSpecificField } from '@/redux/actions/Fields/Fields';

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

                    let updatedValueFields: Record<string, any> = {};
                    if (custom_type === 'value_string') {
                        updatedValueFields = { value_string: value };
                    } else if (custom_type === 'value_number') {
                        updatedValueFields = { value_number: value ? String(value).replace(',', '.') : null };
                    } else if (custom_type === 'value_boolean') {
                        updatedValueFields = { value_boolean: value === 0 ? false : value === 1 ? true : null };
                    } else if (custom_type === 'value_custom') {
                        updatedValueFields = { value_custom: value };
                    } else if (custom_type === 'value_date') {
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
                        updatedValueFields = { value_date: formattedDate };
                    } else if (custom_type === 'value_image') {
                        if (value?.name) {
                            try {
                                const response = await fetch(value.image);
                                const arrayBuffer = await response.arrayBuffer();
                                const buffer = Buffer.from(arrayBuffer);
                                const fileData = { name: value.name, type: value.type, buffer: isWeb ? buffer : value.image, edit: true };
                                const fileId = isWeb ? await uploadToDirectus(fileData, imageFolderId) : await uploadToDirectusFromMobile(fileData, imageFolderId);
                                updatedValueFields = { value_image: fileId };
                            } catch (uploadError) {
                                console.error('Queue sync: image upload failed for field', fieldId, uploadError);
                                updatedValueFields = {};
                            }
                        } else if (value === null || value === undefined) {
                            // Image/signature was cleared — explicitly set to null
                            updatedValueFields = { value_image: null };
                        }
                    } else if (custom_type === 'value_files') {
                        if (Array.isArray(value) && value.length > 0) {
                            try {
                                const newFiles = value.filter((file: any) => !file?.edit);
                                if (newFiles.length > 0) {
                                    const uploadedIds = await Promise.all(
                                        newFiles.map(async (file: any) => {
                                            const response = await fetch(file.image);
                                            const arrayBuffer = await response.arrayBuffer();
                                            const buffer = Buffer.from(arrayBuffer);
                                            const fileData = { name: file.name, type: file.type, buffer: isWeb ? buffer : file.image, edit: true };
                                            return isWeb ? uploadToDirectus(fileData, filesFolderId) : uploadToDirectusFromMobile(fileData, filesFolderId);
                                        })
                                    );
                                    updatedValueFields = {
                                        value_files: {
                                            create: uploadedIds.filter(Boolean).map((fileId: any) => ({ directus_files_id: fileId })),
                                        },
                                    };
                                }
                                // else: only existing files, no new uploads needed
                            } catch (uploadError) {
                                console.error('Queue sync: file upload failed for field', fieldId, uploadError);
                                updatedValueFields = {};
                            }
                        } else {
                            // All files cleared — explicitly set to empty
                            updatedValueFields = { value_files: [] };
                        }
                    }

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
                                                <ActivityIndicator size={20} color={theme.screen.icon} />
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
