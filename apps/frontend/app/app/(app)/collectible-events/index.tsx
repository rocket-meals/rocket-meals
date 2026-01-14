import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { COLLECTABLE_AT_FIELDS, DateHelper } from 'repo-depkit-common';
import type { DatabaseTypes } from 'repo-depkit-common';

import SettingsList from '@/components/SettingsList';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { getTitleFromTranslation } from '@/helper/resourceHelper';
import { RootState } from '@/redux/reducer';
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
        const { primaryColor } = useSelector((state: RootState) => state.settings);
        const { collectibleEvents, collectibleEventsDict = {} } = useSelector(
                (state: RootState) => state.collectibleEvents
        );

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
