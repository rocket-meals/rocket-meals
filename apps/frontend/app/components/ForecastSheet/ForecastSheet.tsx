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

type ForecastEntry = {
        time: string;
        percentage: number;
        color: string;
};

const ForecastSheet: React.FC<ForecastSheetProps> = ({ closeSheet, forDate }) => {
        const { theme } = useTheme();
        const { translate } = useLanguage();
        const utilizationEntryHelper = new UtilizationEntryHelper();
        const [loading, setLoading] = useState(false);
        const selectedCanteen = useSelectedCanteen();
        const [forecastEntries, setForecastEntries] = useState<ForecastEntry[]>([]);

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
                                percentage,
                                color,
                        };
                });

                return entries.filter(entry => entry.percentage > 0);
        };

        const getUtilization = async (forDate: string) => {
                try {
                        setLoading(true);

                        if (!selectedCanteen || !selectedCanteen.utilization_group) {
                                setForecastEntries([]);
                                return;
                        }

                        const utilizationData = (await utilizationEntryHelper.fetchUtilizationEntries({}, selectedCanteen?.utilization_group, forDate)) as DatabaseTypes.UtilizationsEntries[];
                        if (utilizationData && utilizationData.length > 0) {
                                const processedData = processData(utilizationData, selectedCanteen.utilization_group);
                                setForecastEntries(processedData);
                        } else {
                                setForecastEntries([]);
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
				<Text
					style={{
						...styles.sheetHeading,
						fontSize: isWeb ? 40 : 28,
						color: theme.sheet.text,
					}}
				>
					{translate(TranslationKeys.forecast)}
				</Text>
			</View>
                        <BottomSheetScrollView
                                style={styles.forecastContainer}
                                contentContainerStyle={{
                                        paddingHorizontal: isWeb ? 20 : 10,
                                        paddingBottom: 40,
                                        paddingTop: isWeb ? 20 : 10,
                                }}
                        >
                                {loading ? (
                                        <View style={styles.loadingContainer}>
                                                <ActivityIndicator size={40} color={theme.screen.icon} />
                                        </View>
                                ) : forecastEntries.length > 0 ? (
                                        forecastEntries.map((entry, index) => (
                                                <View key={`${entry.time}-${index}`} style={styles.forecastItem}>
                                                        <View
                                                                style={[
                                                                        styles.colorIndicator,
                                                                        {
                                                                                backgroundColor: entry.color,
                                                                        },
                                                                ]}
                                                        />
                                                        <Text style={[styles.timeText, { color: theme.sheet.text }]}>{entry.time}</Text>
                                                </View>
                                        ))
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
