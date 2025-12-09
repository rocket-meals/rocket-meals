import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLLECTABLE_AT_FIELDS, CollectibleAt, DatabaseTypes } from 'repo-depkit-common';

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
import useCollectibleDict from '@/hooks/useCollectibleDict';
import PermissionModal from '@/components/PermissionModal/PermissionModal';
import SettingsList from '@/components/SettingsList';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RESET_ALL_COLLECTIBLE_EVENT_DICTS, RESET_COLLECTIBLE_EVENT_DICT } from '@/redux/Types/types';
import CustomMenuHeader from '@/components/CustomMenuHeader/CustomMenuHeader';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import useMyModal from '@/hooks/useMyModal';
import ModalComponent from '@/components/ModalSetting/ModalComponent';

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
        useSetPageTitle(TranslationKeys.collectible_event);

        const dispatch = useDispatch();
        const { theme } = useTheme();
        const toast = useToast();
        const { translate, language } = useLanguage();
        const { profile, loggedIn } = useSelector((state: RootState) => state.authReducer);
        const { primaryColor, debugMode } = useSelector((state: RootState) => state.settings);
        const buttonColor = primaryColor || theme.primary;
        const { activeCollectibleEvent } = useActiveCollectibleEvent();
        const participantsHelper = useMemo(() => new CollectibleEventParticipantsHelper(), []);
        const { collectedCount, collectibleDict } = useCollectibleDict(activeCollectibleEvent?.id);
        const [debugLogs, setDebugLogs] = useState<string[]>([]);
        const previousCollectedCountRef = useRef<number | null>(null);
        const previousEventIdRef = useRef<string | number | null>(null);

        const appendDebugLog = useCallback((message: string, errorObject?: unknown) => {
                const timestamp = new Date().toLocaleTimeString();
                setDebugLogs(prevLogs => {
                        const newLogs = [...prevLogs, `${timestamp} - ${message}`];

                        if (errorObject) {
                                let serializedError = '';

                                try {
                                        serializedError = JSON.stringify(errorObject, null, 2);
                                } catch (err) {
                                        serializedError = `Error serializing object: ${String(err)}`;
                                }

                                newLogs.push(`${timestamp} - ${serializedError}`);
                        }

                        return newLogs;
                });
        }, []);

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

        const [points, setPoints] = useState('');
        const [email, setEmail] = useState('');
        const [phoneNumber, setPhoneNumber] = useState('');
        const [isLoading, setIsLoading] = useState(false);
        const [isSaving, setIsSaving] = useState(false);
        const [isPermissionModalVisible, setIsPermissionModalVisible] = useState(false);
        const [participation, setParticipation] = useState<DatabaseTypes.CollectibleEventParticipants | null>(null);
        const [visibleHints, setVisibleHints] = useState<Record<string, boolean>>({});
        const [pointsDraft, setPointsDraft] = useState('');

        const {
                isVisible: isPointsModalVisible,
                openModal: openPointsModal,
                closeModal: closePointsModal,
        } = useMyModal();

        const toggleCollectibleHint = useCallback((key: string) => {
                setVisibleHints(prev => ({ ...prev, [key]: !prev[key] }));
        }, []);

        useEffect(() => {
                if (activeCollectibleEvent?.id === previousEventIdRef.current) {
                        return;
                }

                previousEventIdRef.current = activeCollectibleEvent?.id ?? null;
                previousCollectedCountRef.current = collectedCount ?? 0;
                setDebugLogs([]);
        }, [activeCollectibleEvent?.id, collectedCount]);

        useEffect(() => {
                const currentCount = collectedCount ?? 0;
                const previousValue = previousCollectedCountRef.current ?? 0;

                if (debugMode && currentCount > previousValue) {
                        appendDebugLog(`Points increased from ${previousValue} to ${currentCount}`);
                }

                previousCollectedCountRef.current = currentCount;
        }, [appendDebugLog, collectedCount, debugMode]);

        const loadParticipation = useCallback(async () => {
                if (!activeCollectibleEvent?.id || !profile?.id) {
                        setParticipation(null);
                        setPoints('');
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
                                setPoints(existing.points ? String(existing.points) : '');
                                setEmail(existing.email ?? '');
                                setPhoneNumber(existing.phone_number ?? '');
                        } else {
                                setParticipation(null);
                                setPoints('');
                                setEmail('');
                                setPhoneNumber('');
                        }
                } catch (error) {
                        console.error('Error fetching collectible event participation:', error);
                        appendDebugLog('Failed to fetch participation', error);
                        toast(translate(TranslationKeys.collectible_event_load_error), 'error');
                } finally {
                        setIsLoading(false);
                }
        }, [activeCollectibleEvent?.id, appendDebugLog, participantsHelper, profile?.id, toast, translate]);

        useEffect(() => {
                loadParticipation();
        }, [loadParticipation]);

        useEffect(() => {
                setVisibleHints({});
        }, [activeCollectibleEvent?.id]);

        useEffect(() => {
                if (debugMode) return;
                const newValue = String(collectedCount);
                if (newValue !== points) {
                        setPoints(newValue);
                }
        }, [collectedCount, debugMode, points]);

        const handleSave = async () => {
                if (!activeCollectibleEvent?.id) {
                        toast(translate(TranslationKeys.collectible_event_no_active), 'error');
                        return;
                }

                if (!loggedIn || !profile?.id) {
                        setIsPermissionModalVisible(true);
                        return;
                }

                const pointsToSave = debugMode ? points?.toString() ?? '' : String(collectedCount);

                setIsSaving(true);
                try {
                        const payload: Partial<DatabaseTypes.CollectibleEventParticipants> = {
                                points: pointsToSave,
                                email: email?.trim() || null,
                                phone_number: phoneNumber?.trim() || null,
                                profile: profile.id,
                                collectible_event: activeCollectibleEvent.id,
                                status: 'published',
                        };

                        const updated = participation?.id
                                ? await participantsHelper.updateItem(participation.id, payload)
                                : await participantsHelper.createItem(payload);

                        setParticipation(updated as DatabaseTypes.CollectibleEventParticipants);
                        setPoints((updated as DatabaseTypes.CollectibleEventParticipants)?.points || pointsToSave);
                        setEmail((updated as DatabaseTypes.CollectibleEventParticipants)?.email || email);
                        setPhoneNumber((updated as DatabaseTypes.CollectibleEventParticipants)?.phone_number || phoneNumber);
                        toast(translate(TranslationKeys.collectible_event_save_success), 'success');
                } catch (error) {
                        console.error('Error saving collectible event participation:', error);
                        appendDebugLog('Failed to save participation', error);
                        toast(translate(TranslationKeys.collectible_event_save_error), 'error');
                } finally {
                        setIsSaving(false);
                }
        };

        const resetCurrentCollectibles = useCallback(async () => {
                if (!activeCollectibleEvent?.id) {
                        return;
                }

                dispatch({ type: RESET_COLLECTIBLE_EVENT_DICT, payload: { eventId: activeCollectibleEvent.id } });
                setPoints(debugMode ? '0' : String(collectedCount));
                toast(translate(TranslationKeys.reset), 'success');

                if (loggedIn && profile?.id) {
                        try {
                                const existing = await participantsHelper.fetchParticipationByProfileAndEvent(
                                        profile.id,
                                        activeCollectibleEvent.id,
                                        { fields: ['id'] }
                                );

                                if (existing?.id) {
                                        await participantsHelper.updateItem(existing.id, { points: '0' });
                                        setParticipation(prev => (prev ? { ...prev, points: '0' } : prev));
                                        toast(translate(TranslationKeys.reset), 'success');
                                }
                        } catch (error) {
                                console.error('Error resetting collectible event participation:', error);
                                appendDebugLog('Failed to reset participation', error);
                                toast(translate(TranslationKeys.collectible_event_save_error), 'error');
                        }
                }
        }, [activeCollectibleEvent?.id, appendDebugLog, collectedCount, debugMode, dispatch, loggedIn, participantsHelper, profile?.id, toast, translate]);

        const resetAllParticipations = useCallback(async () => {
                dispatch({ type: RESET_ALL_COLLECTIBLE_EVENT_DICTS });
                setParticipation(null);
                setPoints('');
                setEmail('');
                setPhoneNumber('');

                if (loggedIn && profile?.id) {
                        try {
                                await participantsHelper.deleteItems({ filter: { profile: { _eq: profile.id } } });
                                toast(translate(TranslationKeys.reset), 'success');
                        } catch (error) {
                                console.error('Error clearing collectible event participations:', error);
                                appendDebugLog('Failed to clear participations', error);
                                toast(translate(TranslationKeys.collectible_event_save_error), 'error');
                        }
                }
        }, [appendDebugLog, dispatch, loggedIn, participantsHelper, profile?.id, toast, translate]);

        const openPointsEditModal = useCallback(() => {
                setPointsDraft(points || String(collectedCount ?? 0));
                openPointsModal();
        }, [collectedCount, openPointsModal, points]);

        const handleSavePoints = useCallback(() => {
                setPoints(pointsDraft);
                closePointsModal();
        }, [closePointsModal, pointsDraft]);

        const renderContent = () => {
                if (!activeCollectibleEvent) {
                        return <Text style={{ ...styles.info, color: theme.screen.text }}>{translate(TranslationKeys.collectible_event_no_active)}</Text>;
                }

                const title =
                        getTitleFromTranslation(activeCollectibleEvent.translations as any, language) || activeCollectibleEvent.alias || '';
                const description = getDescriptionFromTranslation(activeCollectibleEvent.translations as any, language);

                return (
                        <View style={styles.section}>
                                <Text style={{ ...styles.title, color: theme.screen.text }}>{title}</Text>
                                {description ? (
                                        <Text style={{ ...styles.description, color: theme.inactiveText }}>{description}</Text>
                                ) : null}

                                {sampleCollectibleKey ? (
                                        <View style={{ alignItems: 'center', marginTop: 16 }}>
                                                <CollectibleSpot collectibleKey={sampleCollectibleKey} isPreview />
                                                <Text style={{ color: theme.inactiveText, marginTop: 8, textAlign: 'center' }}>
                                                        {translate(TranslationKeys.collectible_event_collectible_preview_label)}
                                                </Text>
                                        </View>
                                ) : null}

                                {debugMode ? (
                                        <View style={{ marginTop: 16, gap: 12 }}>
                                                <SettingsList
                                                        leftIcon={<MaterialCommunityIcons name="counter" size={22} color={theme.screen.icon} />}
                                                        label={translate(TranslationKeys.collectible_event_points)}
                                                        value={String(collectedCount ?? 0)}
                                                        groupPosition="single"
                                                        showSeparator={false}
                                                />
                                        </View>
                                ) : null}

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

                                        <Text style={{ ...styles.info, color: theme.inactiveText, marginTop: 8 }}>
                                                {collectedCount}/{maxCollectibleKeys || '∞'} {translate(TranslationKeys.collectible_event_collected)}
                                        </Text>

                                        <Text style={{ ...styles.notice, color: theme.inactiveText }}>
                                                {translate(TranslationKeys.collectible_event_data_notice)}
                                        </Text>
                                </View>

                                {debugMode ? (
                                        <View style={{ marginTop: 16 }}>
                                                <SettingsList
                                                        leftIcon={<MaterialCommunityIcons name="pencil" size={22} color={theme.screen.icon} />}
                                                        label={translate(TranslationKeys.collectible_event_points)}
                                                        value={points || translate(TranslationKeys.enter_number)}
                                                        groupPosition="single"
                                                        onPress={openPointsEditModal}
                                                />
                                        </View>
                                ) : null}

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
                                                                        ? key
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

                                        {debugMode ? (
                                                <DebugSection
                                                        activeCollectibleEvent={activeCollectibleEvent}
                                                        buttonColor={buttonColor}
                                                        resetAllParticipations={resetAllParticipations}
                                                        resetCurrentCollectibles={resetCurrentCollectibles}
                                                        theme={theme}
                                                        nextCollectibleKey={nextCollectibleKey}
                                                        debugSpotLabel={translate(TranslationKeys.collectible_event_debug_spot)}
                                                />
                                        ) : null}

                                        {debugMode && debugLogs.length ? (
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
                                        ) : null}

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
                        <CustomMenuHeader label={translate(TranslationKeys.collectible_event)} />
                        <View style={styles.container}>
                                <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                                        {renderContent()}
                                </ScrollView>
                        </View>
                        <PermissionModal
                                isVisible={isPermissionModalVisible}
                                setIsVisible={setIsPermissionModalVisible}
                        />

                        <ModalComponent
                                isVisible={isPointsModalVisible}
                                onClose={closePointsModal}
                                onSave={handleSavePoints}
                                title={TranslationKeys.collectible_event_points}
                                disableSave={!pointsDraft?.length}
                        >
                                <View style={{ gap: 12 }}>
                                        <Text style={{ ...styles.label, color: theme.screen.text }}>
                                                {translate(TranslationKeys.collectible_event_points)}
                                        </Text>
                                        <TextInput
                                                style={{
                                                        ...styles.settingsInput,
                                                        color: theme.screen.text,
                                                        backgroundColor: theme.drawerBg,
                                                        borderColor: theme.screen.icon,
                                                }}
                                                value={pointsDraft}
                                                onChangeText={setPointsDraft}
                                                placeholder={translate(TranslationKeys.enter_number)}
                                                placeholderTextColor={theme.screen.placeholder}
                                                keyboardType="numeric"
                                                inputMode="numeric"
                                        />
                                </View>
                        </ModalComponent>
                </SafeAreaView>
        );
};

export default CollectibleEventScreen;
