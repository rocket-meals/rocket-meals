import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';
import { MaterialCommunityIcons, Octicons } from '@expo/vector-icons';
import { useAppSelector } from '@/redux/hooks';
import { COLLECTABLE_AT_FIELDS, DateHelper } from 'repo-depkit-common';
import type { DatabaseTypes } from 'repo-depkit-common';
import { useRouter } from 'expo-router';

import SettingsList from '@/components/SettingsList';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { getTitleFromTranslation } from '@/helper/resourceHelper';
import { RootState } from '@/redux/reducer';
import useDebugMode from '@/hooks/useDebugMode';
import styles from './styles';

const getGroupPosition = (index: number, length: number) => {
        if (length === 1) return 'single';
        if (index === 0) return 'top';
        if (index === length - 1) return 'bottom';
        return 'middle';
};

const formatDate = (dateString?: string | null) => {
        if (!dateString || !DateHelper.isValidDateString(dateString)) {
                return undefined;
        }

        try {
                return DateHelper.formatOfferDateToReadable(new Date(dateString), true);
        } catch (error) {
                console.error('Error formatting date:', error);
                return undefined;
        }
};

const formatDateRange = (event: DatabaseTypes.CollectibleEvents) => {
        const startDate = formatDate(event?.date_start);
        const endDate = formatDate(event?.date_end);

        if (startDate && endDate) {
                return `${startDate} - ${endDate}`;
        }

        return startDate || endDate || undefined;
};

const formatEventValue = (collected: number, total: number, dateRange?: string) => {
        const progress = `${collected}/${total}`;

        if (dateRange) {
                return `${progress}\n${dateRange}`;
        }

        return progress;
};

const CollectibleEventsScreen = () => {
        useSetPageTitle(TranslationKeys.collectible_events);
        const { theme } = useTheme();
        const { translate, language } = useLanguage();
        const { primaryColor } = useAppSelector((state) => state.settings);
        const { collectibleEvents, collectibleEventsDict = {} } = useAppSelector(
                (state) => state.collectibleEvents
        );
        const debugMode = useDebugMode();
        const router = useRouter();

        const events = useMemo<DatabaseTypes.CollectibleEvents[]>(
                () => collectibleEvents || [],
                [collectibleEvents]
        );
        const eventsWithProgress = useMemo(
                () =>
                        events.map(event => {
                                const totalCollectibles = COLLECTABLE_AT_FIELDS.filter(
                                        key => (event as any)?.[key]
                                ).length;
                                const collectedCount = Object.values(
                                        collectibleEventsDict?.[event?.id] || {}
                                ).filter(Boolean).length;

                                return {
                                        event,
                                        collectedCount,
                                        totalCollectibles,
                                        dateRange: formatDateRange(event),
                                };
                        }),
                [collectibleEventsDict, events]
        );
        const hasEvents = eventsWithProgress.length > 0;

        return (
                <SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.background }}>
                        <ScrollView contentContainerStyle={styles.container}>
                                {debugMode ? (
                                        <SettingsList
                                                key="debug-collectible-event"
                                                iconBgColor={primaryColor}
                                                leftIcon={
                                                        <MaterialCommunityIcons
                                                                name="bug-outline"
                                                                size={24}
                                                                color={theme.screen.icon}
                                                        />
                                                }
                                                label="Debug Collectible Event"
                                                groupPosition="single"
                                                handleFunction={() => router.navigate('/collectible-event')}
                                                rightIcon={<Octicons name="chevron-right" size={20} color={theme.screen.icon} />}
                                        />
                                ) : null}
                                {hasEvents ? (
                                        eventsWithProgress.map(({ event, collectedCount, totalCollectibles, dateRange }, index) => (
                                                <SettingsList
                                                        key={event.id || index}
                                                        iconBgColor={primaryColor}
                                                        leftIcon={
                                                                <MaterialCommunityIcons
                                                                        name="trophy-outline"
                                                                        size={24}
                                                                        color={theme.screen.icon}
                                                                />
                                                        }
                                                        label={
                                                                event?.translations
                                                                        ? getTitleFromTranslation(event.translations as any, language)
                                                                        : event?.alias || translate(TranslationKeys.collectible_event)
                                                        }
                                                        value={formatEventValue(collectedCount, totalCollectibles, dateRange)}
                                                        groupPosition={getGroupPosition(index, eventsWithProgress.length) as any}
                                                        handleFunction={debugMode ? () => router.navigate('/collectible-event') : undefined}
                                                        rightIcon={debugMode ? <Octicons name="chevron-right" size={20} color={theme.screen.icon} /> : undefined}
                                                />
                                        ))
                                ) : (
                                        <Text style={{ ...styles.emptyText, color: theme.screen.text }}>
                                                {translate(TranslationKeys.nothing_found)}
                                        </Text>
                                )}
                        </ScrollView>
                </SafeAreaView>
        );
};

export default CollectibleEventsScreen;
