import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLLECTABLE_AT_FIELDS, CollectibleAt, DatabaseTypes, DateHelper } from 'repo-depkit-common';

import useActiveCollectibleEvent from '@/hooks/useActiveCollectibleEvent';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import { useDispatch, useSelector } from 'react-redux';
import { getDescriptionFromTranslation, getTitleFromTranslation } from '@/helper/resourceHelper';
import useToast from '@/hooks/useToast';
import styles from './styles';
import { CollectibleEventParticipantsHelper } from '@/redux/actions/CollectibleEvents/CollectibleEventParticipants';
import CollectibleItem from '@/components/CollectibleItem';
import useCollectibleDict from '@/hooks/useCollectibleDict';
import PermissionModal from '@/components/PermissionModal/PermissionModal';
import SettingsList from '@/components/SettingsList';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
        RESET_ALL_COLLECTIBLE_EVENT_DICTS,
        RESET_COLLECTIBLE_EVENT_DICT,
        SET_COLLECTIBLE_EVENT_DICT_BULK,
} from '@/redux/Types/types';
import CustomMenuHeader from '@/components/CustomMenuHeader/CustomMenuHeader';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import DebugView from "@/components/DebugView";

type DebugSectionProps = {
        activeCollectibleEvent: DatabaseTypes.CollectibleEvents;
        theme: ReturnType<typeof useTheme>['theme'];
        buttonColor: string;
        resetCurrentCollectibles: () => void;
        resetAllParticipations: () => void;
        nextCollectibleKey?: CollectibleAt;
        debugSpotLabel: string;
};

const getGroupPosition = (index: number, length: number) => {
        if (length === 1) return 'single';
        if (index === 0) return 'top';
        if (index === length - 1) return 'bottom';
        return 'middle';
};

const formatCollectibleLabel = (key: string) =>
        key
                .replace(/^collectible_at_/, '')
                .split('_')
                .filter(Boolean)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

const DebugSection: React.FC<DebugSectionProps> = ({
                                                           activeCollectibleEvent,
                                                           theme,
                                                           buttonColor,
                                                           resetCurrentCollectibles,
                                                           resetAllParticipations,
                                                           nextCollectibleKey,
                                                           debugSpotLabel,
                                                   }) => {
        return (
            <View style={{ marginTop: 16 }}>
                    <Text style={{ ...styles.label, color: theme.screen.text, marginBottom: 8 }}>Debug</Text>
                    <View style={{ marginTop: 12, gap: 8 }}>
                            <TouchableOpacity
                                style={{
                                        ...styles.button,
                                        backgroundColor: buttonColor,
                                        opacity: 0.9,
                                }}
                                onPress={resetCurrentCollectibles}
                            >
                                    <Text style={{ ...styles.buttonText, color: theme.dark }}>
                                            Reset current event found collectible
                                    </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                        ...styles.button,
                                        backgroundColor: theme.warning,
                                        opacity: 0.9,
                                }}
                                onPress={resetAllParticipations}
                            >
                                    <Text style={{ ...styles.buttonText, color: theme.dark }}>
                                            Reset all event participations
                                    </Text>
                            </TouchableOpacity>
                    </View>

                    {nextCollectibleKey ? (
                        <View style={{ marginTop: 12, gap: 8 }}>
                                <Text style={{ ...styles.label, color: theme.screen.text }}>{debugSpotLabel}</Text>
                                <CollectibleSpot collectibleKey={nextCollectibleKey} />
                        </View>
                    ) : null}

                    {activeCollectibleEvent ? (
                        <View style={{ marginTop: 12 }}>
                                <Text style={{ ...styles.info, color: theme.screen.text, marginBottom: 4 }}>
                                        Event Details
                                </Text>
                                <SettingsList
                                    key="event-id"
                                    iconBgColor={theme.accent}
                                    leftIcon={
                                            <MaterialCommunityIcons
                                                name="pound-box-outline"
                                                size={22}
                                                color={theme.screen.icon}
                                            />
                                    }
                                    label={`ID: ${activeCollectibleEvent.id}`}
                                    groupPosition={getGroupPosition(0, 2) as any}
                                />
                                <SettingsList
                                    key="event-alias"
                                    iconBgColor={theme.accent}
                                    leftIcon={
                                            <MaterialCommunityIcons
                                                name="label-outline"
                                                size={22}
                                                color={theme.screen.icon}
                                            />
                                    }
                                    label={`Alias: ${activeCollectibleEvent.alias || '-'}`}
                                    groupPosition={getGroupPosition(1, 2) as any}
                                />
                        </View>
                    ) : null}
            </View>
        );
};

const CollectibleEventScreen = () => {
        useSetPageTitle(TranslationKeys.collectible_event_active);

        const dispatch = useDispatch();
        const { theme } = useTheme();
        const toast = useToast();
        const { translate, language } = useLanguage();
        const { profile, loggedIn } = useSelector((state: RootState) => state.authReducer);
        const { primaryColor } = useSelector((state: RootState) => state.settings);
        const buttonColor = primaryColor || theme.primary;
        const { activeCollectibleEvent } = useActiveCollectibleEvent();
        const participantsHelper = useMemo(() => new CollectibleEventParticipantsHelper(), []);
        const { collectedCount, collectibleDict } = useCollectibleDict(activeCollectibleEvent?.id);
        const [debugLogs, setDebugLogs] = useState<string[]>([]);
        const previousCollectedCountRef = useRef<number | null>(null);
        const previousEventIdRef = useRef<string | number | null>(null);

        const appendDebugLog = useCallback((message: string) => {
                const timestamp = new Date().toLocaleTimeString();
                setDebugLogs(prev => [...prev, `${timestamp} - ${message}`]);
        }, []);

        const shouldAskForContactDetails = Boolean((activeCollectibleEvent as any)?.ask_for_contact_details);

        const activeCollectibleKeys = useMemo(
            () =>
                activeCollectibleEvent
                    ? COLLECTABLE_AT_FIELDS.filter(key => (activeCollectibleEvent as any)?.[key])
                    : [],
            [activeCollectibleEvent]
        );

        const sampleCollectibleKey = useMemo(
            () =>
                activeCollectibleEvent
                    ? COLLECTABLE_AT_FIELDS.find(key => (activeCollectibleEvent as any)?.[key])
                    : undefined,
            [activeCollectibleEvent]
        );

        const nextCollectibleKey = useMemo(
            () => activeCollectibleKeys.find(key => !collectibleDict?.[key]),
            [activeCollectibleKeys, collectibleDict]
        );

        const maxCollectibleKeys = useMemo(
            () =>
                activeCollectibleEvent
                    ? COLLECTABLE_AT_FIELDS.filter(key => (activeCollectibleEvent as any)?.[key]).length
                    : 0,
            [activeCollectibleEvent]
        );

        const [email, setEmail] = useState('');
        const [phoneNumber, setPhoneNumber] = useState('');
        const [isLoading, setIsLoading] = useState(false);
        const [isSaving, setIsSaving] = useState(false);
        const [isPermissionModalVisible, setIsPermissionModalVisible] = useState(false);
        const [participation, setParticipation] = useState<DatabaseTypes.CollectibleEventParticipants | null>(null);
        const [visibleHints, setVisibleHints] = useState<Record<string, boolean>>({});

        const serverCollectedCount = useMemo(
            () => Number(participation?.points ?? 0) || 0,
            [participation?.points]
        );

        const displayedCollectedCount = useMemo(
            () => Math.max(collectedCount ?? 0, serverCollectedCount),
            [collectedCount, serverCollectedCount]
        );

        const formatEventDate = useCallback((dateString?: string | null) => {
                if (!dateString || !DateHelper.isValidDateString(dateString)) {
                        return '-';
                }

                try {
                        return DateHelper.formatOfferDateToReadable(new Date(dateString), true, true);
                } catch (error) {
                        console.error('Error formatting date:', error);
                        return '-';
                }
        }, []);

        const toggleCollectibleHint = useCallback((key: string) => {
                setVisibleHints(prev => ({ ...prev, [key]: !prev[key] }));
        }, []);

        const applyServerCollectibleData = useCallback(
                (rawData: unknown) => {
                        if (!activeCollectibleEvent?.id) {
                                return;
                        }

                        let parsedData: Record<string, boolean> = {};

                        if (typeof rawData === 'string') {
                                try {
                                        parsedData = JSON.parse(rawData) || {};
                                } catch (error) {
                                        appendDebugLog(`Failed to parse collectible data: ${String(error)}`);
                                }
                        } else if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
                                parsedData = rawData as Record<string, boolean>;
                        }

                        const existingData = collectibleDict || {};
                        const mergedData: Record<string, boolean> = { ...parsedData };

                        Object.entries(existingData).forEach(([key, value]) => {
                                if (value) {
                                        mergedData[key] = true;
                                }
                        });

                        const hasChanges = (() => {
                                const allKeys = new Set([...Object.keys(existingData), ...Object.keys(mergedData)]);
                                for (const key of allKeys) {
                                        if (Boolean(existingData[key]) !== Boolean(mergedData[key])) {
                                                return true;
                                        }
                                }

                                return false;
                        })();

                        if (hasChanges) {
                                dispatch({
                                        type: SET_COLLECTIBLE_EVENT_DICT_BULK,
                                        payload: { eventId: activeCollectibleEvent.id, data: mergedData },
                                });

                                if (Object.keys(parsedData || {}).length) {
                                        appendDebugLog('Applied collectible data from server');
                                }
                        }
                },
                [activeCollectibleEvent?.id, appendDebugLog, collectibleDict, dispatch]
        );

        useEffect(() => {
                if (activeCollectibleEvent?.id === previousEventIdRef.current) {
                        return;
                }

                previousEventIdRef.current = activeCollectibleEvent?.id ?? null;
                previousCollectedCountRef.current = displayedCollectedCount ?? 0;
                setDebugLogs([]);
        }, [activeCollectibleEvent?.id, displayedCollectedCount]);

        useEffect(() => {
                const currentCount = displayedCollectedCount ?? 0;
                const previousValue = previousCollectedCountRef.current ?? 0;

                if (currentCount > previousValue) {
                        appendDebugLog(`Points increased from ${previousValue} to ${currentCount}`);
                }

                previousCollectedCountRef.current = currentCount;
        }, [appendDebugLog, displayedCollectedCount]);

        const loadParticipation = useCallback(async () => {
                if (!activeCollectibleEvent?.id || !profile?.id) {
                        setParticipation(null);
                        setEmail('');
                        setPhoneNumber('');
                        return;
                }

                setIsLoading(true);
                try {
                        const existing = await participantsHelper.fetchParticipationByProfileAndEvent(
                            profile.id,
                            activeCollectibleEvent.id,
                            { fields: ['*'] }
                        );
                        if (existing) {
                                setParticipation(existing);
                                setEmail(existing.email ?? '');
                                setPhoneNumber(existing.phone_number ?? '');
                                applyServerCollectibleData(existing.data);
                        } else {
                                setParticipation(null);
                                setEmail('');
                                setPhoneNumber('');
                        }
                } catch (error) {
                        console.error('Error fetching collectible event participation:', error);
                        appendDebugLog(`Failed to fetch participation: ${String(error)}`);
                        toast(translate(TranslationKeys.collectible_event_load_error), 'error');
                } finally {
                        setIsLoading(false);
                }
        }, [activeCollectibleEvent?.id, appendDebugLog, applyServerCollectibleData, participantsHelper, profile?.id, toast, translate]);

        useEffect(() => {
                loadParticipation();
        }, [loadParticipation]);

        useEffect(() => {
                setVisibleHints({});
        }, [activeCollectibleEvent?.id]);

        const handleSave = async () => {
                if (!activeCollectibleEvent?.id) {
                        toast(translate(TranslationKeys.collectible_event_no_active), 'error');
                        return;
                }

                if (!loggedIn || !profile?.id) {
                        setIsPermissionModalVisible(true);
                        return;
                }

                const pointsToSave = String(displayedCollectedCount);

                setIsSaving(true);
                try {
                const updatePayload: Partial<DatabaseTypes.CollectibleEventParticipants> = {
                        points: pointsToSave,
                        email: email?.trim() || null,
                        phone_number: phoneNumber?.trim() || null,
                        data: collectibleDict,
                };

                const createPayload: Partial<DatabaseTypes.CollectibleEventParticipants> = {
                        ...updatePayload,
                        profile: profile.id,
                        collectible_event: activeCollectibleEvent.id,
                        status: 'published',
                };

                const updated = participation?.id
                    ? await participantsHelper.updateItem(participation.id, updatePayload)
                    : await participantsHelper.createItem(createPayload);

                        setParticipation(updated as DatabaseTypes.CollectibleEventParticipants);
                        setEmail((updated as DatabaseTypes.CollectibleEventParticipants)?.email || email);
                        setPhoneNumber((updated as DatabaseTypes.CollectibleEventParticipants)?.phone_number || phoneNumber);
                        toast(translate(TranslationKeys.collectible_event_save_success), 'success');
                } catch (error) {
                        console.error('Error saving collectible event participation:', error);
                        appendDebugLog(`Failed to save participation: ${String(error)}`);
                        const errorDetails = (() => {
                                try {
                                        return JSON.stringify(error, null, 2);
                                } catch (jsonError) {
                                        console.error('Failed to stringify error:', jsonError);
                                        return String(error);
                                }
                        })();
                        toast(`${translate(TranslationKeys.collectible_event_save_error)}\n${errorDetails}`, 'error');
                } finally {
                        setIsSaving(false);
                }
        };

        const resetCurrentCollectibles = useCallback(async () => {
                if (!activeCollectibleEvent?.id) {
                        return;
                }

                dispatch({ type: RESET_COLLECTIBLE_EVENT_DICT, payload: { eventId: activeCollectibleEvent.id } });
                toast(translate(TranslationKeys.reset), 'success');

                if (loggedIn && profile?.id) {
                        try {
                                const existing = await participantsHelper.fetchParticipationByProfileAndEvent(
                                    profile.id,
                                    activeCollectibleEvent.id,
                                    { fields: ['id'] }
                                );

                                if (existing?.id) {
                                        await participantsHelper.updateItem(existing.id, { points: '0', data: {} });
                                        setParticipation(prev => (prev ? { ...prev, points: '0', data: {} } : prev));
                                        toast(translate(TranslationKeys.reset), 'success');
                                }
                        } catch (error) {
                                console.error('Error resetting collectible event participation:', error);
                                appendDebugLog(`Failed to reset participation: ${String(error)}`);
                                toast(translate(TranslationKeys.collectible_event_save_error), 'error');
                        }
                }
        }, [activeCollectibleEvent?.id, appendDebugLog, collectedCount, dispatch, loggedIn, participantsHelper, profile?.id, toast, translate]);

        const resetAllParticipations = useCallback(async () => {
                dispatch({ type: RESET_ALL_COLLECTIBLE_EVENT_DICTS });
                setParticipation(null);
                setEmail('');
                setPhoneNumber('');

                if (loggedIn && profile?.id) {
                        try {
                                await participantsHelper.deleteItems({ filter: { profile: { _eq: profile.id } } });
                                toast(translate(TranslationKeys.reset), 'success');
                        } catch (error) {
                                console.error('Error clearing collectible event participations:', error);
                                appendDebugLog(`Failed to clear participations: ${String(error)}`);
                                toast(translate(TranslationKeys.collectible_event_save_error), 'error');
                        }
                }
        }, [appendDebugLog, dispatch, loggedIn, participantsHelper, profile?.id, toast, translate]);

        const renderContent = () => {
                if (!activeCollectibleEvent) {
                        return <Text style={{ ...styles.info, color: theme.screen.text }}>{translate(TranslationKeys.collectible_event_no_active)}</Text>;
                }

                const title =
                    getTitleFromTranslation(activeCollectibleEvent.translations as any, language) || activeCollectibleEvent.alias || '';
                const description = getDescriptionFromTranslation(activeCollectibleEvent.translations as any, language);
                const startDateLabel = formatEventDate(activeCollectibleEvent.date_start);
                const endDateLabel = formatEventDate(activeCollectibleEvent.date_end);

                return (
                    <View style={styles.section}>
                            <Text style={{ ...styles.title, color: theme.screen.text }}>{title}</Text>
                            {description ? (
                                <Text style={{ ...styles.description, color: theme.inactiveText }}>{description}</Text>
                            ) : null}

                            <View style={{ alignItems: 'center', marginTop: 16 }}>
                                    <CollectibleItem collectibleKey={sampleCollectibleKey} hideOnCollect={false} isPreview />
                                    <Text style={{ color: theme.inactiveText, marginTop: 8 }}>
                                            {translate(TranslationKeys.collectible_event_preview_label)}
                                    </Text>
                            </View>

                            <View style={{ marginTop: 16, gap: 0 }}>
                                    <SettingsList
                                        leftIcon={<MaterialCommunityIcons name="counter" size={22} color={theme.screen.icon} />}
                                        label={translate(TranslationKeys.collectible_event_points)}
                                        groupPosition="top"
                                        value={`${displayedCollectedCount}/${maxCollectibleKeys || '∞'}`}
                                    />
                                    <SettingsList
                                        leftIcon={
                                                <MaterialCommunityIcons name="calendar-start" size={22} color={theme.screen.icon} />
                                        }
                                        label={translate(TranslationKeys.collectible_event_start_date)}
                                        value={startDateLabel}
                                        groupPosition="middle"
                                    />
                                    <SettingsList
                                        leftIcon={
                                                <MaterialCommunityIcons name="calendar-end" size={22} color={theme.screen.icon} />
                                        }
                                        label={translate(TranslationKeys.collectible_event_end_date)}
                                        value={endDateLabel}
                                        groupPosition="bottom"
                                    />
                            </View>

                            {shouldAskForContactDetails ? (
                                <View style={{ marginTop: 16 }}>
                                        <Text style={{ ...styles.label, color: theme.screen.text }}>
                                                {translate(TranslationKeys.email)}
                                        </Text>
                                        <TextInput
                                            style={{
                                                    ...styles.input,
                                                    color: theme.screen.text,
                                                    backgroundColor: theme.drawerBg,
                                                    borderColor: theme.screen.icon,
                                            }}
                                            value={email}
                                            onChangeText={setEmail}
                                            placeholder={translate(TranslationKeys.email)}
                                            placeholderTextColor={theme.screen.placeholder}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />

                                        <Text style={{ ...styles.label, color: theme.screen.text, marginTop: 12 }}>
                                                {translate(TranslationKeys.phone_number)}
                                        </Text>
                                        <TextInput
                                            style={{
                                                    ...styles.input,
                                                    color: theme.screen.text,
                                                    backgroundColor: theme.drawerBg,
                                                    borderColor: theme.screen.icon,
                                            }}
                                            value={phoneNumber}
                                            onChangeText={setPhoneNumber}
                                            placeholder={translate(TranslationKeys.phone_number)}
                                            placeholderTextColor={theme.screen.placeholder}
                                            keyboardType="phone-pad"
                                        />

                                        <Text style={{ ...styles.notice, color: theme.inactiveText }}>
                                                {translate(TranslationKeys.collectible_event_data_notice)}
                                        </Text>

                                        <TouchableOpacity
                                            style={{
                                                    ...styles.button,
                                                    backgroundColor: buttonColor,
                                                    opacity: isSaving ? 0.6 : 1,
                                            }}
                                            disabled={isSaving}
                                            onPress={handleSave}
                                        >
                                                <Text style={{ ...styles.buttonText, color: theme.dark }}>
                                                        {isSaving
                                                            ? translate(TranslationKeys.loading)
                                                            : translate(TranslationKeys.save)}
                                                </Text>
                                        </TouchableOpacity>
                                </View>
                            ) : null}

                            {activeCollectibleKeys.length ? (
                                <View style={{ marginTop: 16 }}>
                                        <Text
                                            style={{
                                                    ...styles.label,
                                                    color: theme.screen.text,
                                                    marginBottom: 8,
                                            }}
                                        >
                                                {translate(TranslationKeys.collectible_event_progress_title)}
                                        </Text>

                                        <View style={{ gap: 0 }}>
                                                {activeCollectibleKeys.map((key, index) => {
                                                        const isCollected = Boolean(collectibleDict?.[key]);
                                                        const isHintVisible = isCollected || visibleHints[key];

                                                        const iconBgColor = isCollected ? '#2DBE62' : '#F7D21F';
                                                        const labelText = isHintVisible
                                                            ? formatCollectibleLabel(key)
                                                            : translate(TranslationKeys.collectible_event_show_hint);

                                                        return (
                                                            <SettingsList
                                                                key={`progress-${key}`}
                                                                iconBgColor={iconBgColor}
                                                                leftIcon={
                                                                        <MaterialCommunityIcons
                                                                            name={isCollected ? 'check' : 'lightbulb-on-outline'}
                                                                            size={22}
                                                                            color={theme.screen.icon}
                                                                        />
                                                                }
                                                                label={labelText}
                                                                value={undefined}
                                                                onPress={
                                                                        isCollected
                                                                            ? undefined
                                                                            : () => toggleCollectibleHint(key)
                                                                }
                                                                groupPosition={
                                                                        getGroupPosition(index, activeCollectibleKeys.length) as any
                                                                }
                                                            />
                                                        );
                                                })}
                                        </View>
                                </View>
                            ) : null}

                            <DebugView>
                                    <DebugSection
                                        activeCollectibleEvent={activeCollectibleEvent}
                                        buttonColor={buttonColor}
                                        resetAllParticipations={resetAllParticipations}
                                        resetCurrentCollectibles={resetCurrentCollectibles}
                                        theme={theme}
                                        nextCollectibleKey={nextCollectibleKey}
                                        debugSpotLabel={translate(TranslationKeys.collectible_event_debug_spot)}
                                    />
                                    <View style={{ marginTop: 16 }}>
                                            <Text
                                                style={{
                                                        ...styles.label,
                                                        color: theme.screen.text,
                                                        marginBottom: 8,
                                                }}
                                            >
                                                    Debug Logs
                                            </Text>
                                            <View style={{ gap: 6 }}>
                                                    {debugLogs.map((log, index) => (
                                                        <Text
                                                            // eslint-disable-next-line react/no-array-index-key
                                                            key={`debug-log-${index}`}
                                                            style={{ color: theme.inactiveText }}
                                                        >
                                                                {log}
                                                        </Text>
                                                    ))}
                                            </View>
                                    </View>
                            </DebugView>

                            {isLoading ? (
                                <View style={[styles.inline, { justifyContent: 'flex-start' }]}>
                                        <ActivityIndicator color={buttonColor} />
                                        <Text style={{ color: theme.screen.text, marginLeft: 8 }}>
                                                {translate(TranslationKeys.collectible_event_loading_participation)}
                                        </Text>
                                </View>
                            ) : null}
                    </View>
                );
        };

        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.screen.background }]}>
                    <CustomMenuHeader label={translate(TranslationKeys.collectible_event_active)} />
                    <View style={styles.container}>
                            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                                    {renderContent()}
                            </ScrollView>
                    </View>
                    <PermissionModal
                        isVisible={isPermissionModalVisible}
                        setIsVisible={setIsPermissionModalVisible}
                    />
            </SafeAreaView>
        );
};

export default CollectibleEventScreen;
