import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import { ForecastSheetProps } from './types';
import { format, parseISO } from 'date-fns';
import { UtilizationEntryHelper } from '@/redux/actions/UtilizationEntries/UtilizationEntries';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { DatabaseTypes } from 'repo-depkit-common';
import SettingsList from '@/components/SettingsList/SettingsList';

type ForecastEntry = {
        time: string;
        percentage: number;
        color: string;
        value_real?: number;
        value_forecast_current?: number;
};

const showDebugInformation = false;

const ForecastSheet: React.FC<ForecastSheetProps> = ({ closeSheet, forDate }) => {
        const { theme } = useTheme();
        const { translate } = useLanguage();
        const utilizationEntryHelper = new UtilizationEntryHelper();
        const [loading, setLoading] = useState(false);
        const selectedCanteen = useSelectedCanteen();
        const [forecastEntries, setForecastEntries] = useState<ForecastEntry[]>([]);
        const [currentUtilizationGroup, setCurrentUtilizationGroup] = useState<DatabaseTypes.UtilizationsGroups | null>(null);



        const processData = (
                data: DatabaseTypes.UtilizationsEntries[],
                utilizationGroup?: DatabaseTypes.UtilizationsGroups
        ): ForecastEntry[] => {
                const max =
                        utilizationGroup?.threshold_until_max ??
                        utilizationGroup?.all_time_high ??
                        utilizationGroup?.threshold_until_high ??
                        100;

                const thresholdUntilMedium = utilizationGroup?.threshold_until_medium ?? 65; // Default medium threshold
                const thresholdUntilHigh = utilizationGroup?.threshold_until_high ?? 80; // Default high threshold

                const intervals = [];
		for (let i = 0; i < 24; i++) {
			intervals.push(`${i}:00`, `${i}:15`, `${i}:30`, `${i}:45`);
		}

                const entries = intervals.map(label => {
                        const matchingData = data?.find((entry: DatabaseTypes.UtilizationsEntries) => {
                                if (!entry.date_start) {
                                        return false;
                                }

                                const start = format(parseISO(entry.date_start), 'H:mm');
                                return start === label;
                        });

                        let percentage = 0;
                        if (matchingData) {
                                if (matchingData.value_real) {
                                        percentage = (matchingData.value_real / max) * 100;
                                } else if (matchingData.value_forecast_current) {
                                        percentage = (matchingData.value_forecast_current / max) * 100;
                                }
                        }

                        // Round to nearest 10 and enforce a minimum of 10 for any value > 0
                        if (percentage > 0) {
                            percentage = Math.max(10, Math.round(percentage / 10) * 10);
                        } else {
                            percentage = 0;
                        }

                        let color = '#93c34b';
                        if (percentage > thresholdUntilHigh) {
                                color = '#F5A13C';
                        } else if (percentage > thresholdUntilMedium) {
                                color = '#FFD500';
                        }

                        return {
                                time: label,
                                percentage:percentage,
                                color: color,
                                value_real: matchingData?.value_real,
                                value_forecast_current: matchingData?.value_forecast_current,
                        };
                });

                return entries.filter(entry => entry.percentage > 0);
        };

        const getUtilization = async (forDate: string) => {
                try {
                        setLoading(true);

                        const utlizationGroupId = selectedCanteen?.utilization_group as string | undefined;

                        if (!utlizationGroupId) {
                                setForecastEntries([]);
                            setCurrentUtilizationGroup(null);
                                return;
                        }


                        const utilizationData = (await utilizationEntryHelper.fetchUtilizationEntries({}, utlizationGroupId, forDate)) as DatabaseTypes.UtilizationsEntries[];
                        let utilizationGroup: DatabaseTypes.UtilizationsGroups | undefined;

                        if (utilizationData && utilizationData.length > 0) {
                            utilizationGroup = utilizationData[0]?.utilization_group as DatabaseTypes.UtilizationsGroups | undefined;
                            const processedData = processData(utilizationData, utilizationGroup);
                            setForecastEntries(processedData);
                            setCurrentUtilizationGroup(utilizationGroup ?? null);
                        } else {
                                setForecastEntries([]);
                                setCurrentUtilizationGroup(null);
                        }
                } catch (error) {
                        setForecastEntries([]);
                        console.error('Error fetching utilization data:', error);
                } finally {
                        setLoading(false);
                }
        };

        useEffect(() => {
                if (selectedCanteen) {
                        getUtilization(forDate);
                }
        }, [selectedCanteen, forDate]);

        const title = translate(TranslationKeys.forecast);
        let debugInformationInTitle = '';
        if(showDebugInformation) {
            debugInformationInTitle = `all_time_high ${currentUtilizationGroup?.all_time_high ?? 'N/A'}, threshold_until_max ${currentUtilizationGroup?.threshold_until_max ?? 'N/A'}`;
        }

        return (
                <BottomSheetView style={{ ...styles.container, backgroundColor: theme.sheet.sheetBg }}>
			<View
				style={{
					...styles.header,
					paddingRight: isWeb ? 10 : 0,
					paddingTop: isWeb ? 10 : 0,
				}}
			>
				<View style={styles.placeholder} />
				<View style={[styles.handle, { backgroundColor: theme.sheet.closeBg }]} />
				<TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.sheet.closeBg }]} onPress={closeSheet}>
					<AntDesign name="close" size={24} color={theme.sheet.closeIcon} />
				</TouchableOpacity>
			</View>
			<View style={styles.titleContainer}>
                <View>
                    <Text
                        style={{
                            ...styles.sheetHeading,
                            fontSize: isWeb ? 40 : 28,
                            color: theme.sheet.text,
                        }}
                    >
                        {title}
                    </Text>
                </View>
                {showDebugInformation && (
                    <View>
                        <Text
                            style={{
                                color: theme.sheet.text,
                            }}
                        >
                            {debugInformationInTitle}
                        </Text>
                    </View>
                )}
			</View>
                        <BottomSheetScrollView
                                style={styles.forecastContainer}
                                contentContainerStyle={{
                                        paddingHorizontal: 10,
                                        paddingBottom: 40,
                                        paddingTop: 20,
                                }}
                        >
                                {loading ? (
                                        <View style={styles.loadingContainer}>
                                                <ActivityIndicator size={40} color={theme.screen.icon} />
                                        </View>
                                ) : forecastEntries.length > 0 ? (
                                        forecastEntries.map((entry, index) => {
                                                const isSingle = forecastEntries.length === 1;
                                                const isFirst = index === 0;
                                                const isLast = index === forecastEntries.length - 1;

                                                const groupPosition = isSingle
                                                        ? 'single'
                                                        : isFirst
                                                        ? 'top'
                                                        : isLast
                                                        ? 'bottom'
                                                        : 'middle';

                                                let valueToShow = entry.percentage+'%'
                                                if(showDebugInformation) {
                                                    valueToShow += " (" + (entry.value_real ?? entry.value_forecast_current) + ")";
                                                }

                                                return (
                                                        <SettingsList
                                                                key={`${entry.time}-${index}`}
                                                                leftIcon={<View style={[styles.colorIndicator, { backgroundColor: entry.color }]} />}
                                                                title={entry.time}
                                                                value={valueToShow}
                                                                showSeparator={!isLast}
                                                                groupPosition={groupPosition}
                                                                iconBackgroundColor={theme.sheet.sheetBg}
                                                        />
                                                );
                                        })
                                ) : (
                                        <Text style={[styles.noDataText, { color: theme.sheet.text }]}>
                                                {translate(TranslationKeys.no_data_found)}
                                        </Text>
                                )}
                        </BottomSheetScrollView>
                </BottomSheetView>
        );
};

export default ForecastSheet;
