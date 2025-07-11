import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import { ForecastSheetProps } from './types';
import { BarChart } from 'react-native-chart-kit';
import { format, parseISO } from 'date-fns';
import { UtilizationEntryHelper } from '@/redux/actions/UtilizationEntries/UtilizationEntries';
import { useSelector } from 'react-redux';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { useFocusEffect } from 'expo-router';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { DatabaseTypes } from 'repo-depkit-common';
import { RootState } from '@/redux/reducer';

const ForecastSheet: React.FC<ForecastSheetProps> = ({
  closeSheet,
  forDate,
}) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const utilizationEntryHelper = new UtilizationEntryHelper();
  const [loading, setLoading] = useState(false);
  const selectedCanteen = useSelectedCanteen();
  const scrollViewRef = useRef<ScrollView>(null);
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [{ data: [] }],
  });

  const processData = (data: any) => {
    const utilizationGroup = data[0]?.utilization_group;
    const max =
      utilizationGroup?.threshold_until_max ||
      utilizationGroup?.all_time_high ||
      100;

    const thresholdUntilMedium = utilizationGroup?.threshold_until_medium || 65; // Default medium threshold
    const thresholdUntilHigh = utilizationGroup?.threshold_until_high || 80; // Default high threshold

    const intervals = [];
    for (let i = 0; i < 24; i++) {
      intervals.push(`${i}:00`, `${i}:15`, `${i}:30`, `${i}:45`);
    }

    const chartData = intervals.map((label) => {
      const matchingData = data?.find((entry: any) => {
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

      return percentage;
    });

    const colors = chartData.map((percentage) => {
      if (percentage > thresholdUntilHigh) return (opcaity = 1) => '#F5A13C'; // Orange for high values
      if (percentage > thresholdUntilMedium) return (opacity = 1) => '#FFD500'; // Yellow for medium values
      return (opacity = 1) => '#93c34b'; // Green for low values
    });

    return {
      labels: intervals,
      datasets: [
        {
          data: [...chartData],
          colors: [...colors],
          threshold_until_medium: thresholdUntilMedium,
          threshold_until_high: thresholdUntilHigh,
        },
      ],
    };
  };

  const getUtilization = async (forDate: string) => {
    try {
      setLoading(true);
      const utilizationData =
        (await utilizationEntryHelper.fetchUtilizationEntries(
          {},
          selectedCanteen?.utilization_group,
          forDate
        )) as DatabaseTypes.UtilizationsEntries[];
      if (utilizationData) {
        const processedData = processData(utilizationData);
        setChartData(processedData);
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      console.error('Error fetching utilization data:', error);
    }
  };

  useEffect(() => {
    if (selectedCanteen) {
      getUtilization(forDate);
    }
  }, [selectedCanteen, forDate]);

  const chartConfig = {
    backgroundGradientFrom: theme.sheet.sheetBg,
    backgroundGradientFromOpacity: 1,
    backgroundGradientTo: theme.sheet.sheetBg,
    backgroundGradientToOpacity: 1,
    color: () => theme.sheet.text,
    strokeWidth: 2,
    // barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    formatYLabel: (value: any) => `${value}%`,
  };

  useFocusEffect(
    useCallback(() => {
      if (chartData && chartData?.datasets[0]?.data?.length) {
        const data = chartData.datasets[0].data;
        const now = new Date();
        const currentIndex = now.getHours() * 4 + Math.floor(now.getMinutes() / 15);

        let targetIndex = data.slice(currentIndex).findIndex(
          (value: number) => value > 0
        );

        if (targetIndex !== -1) {
          targetIndex += currentIndex;
        } else {
          // No values after the current time, jump to two steps before the last value
          for (let i = data.length - 1; i >= 0; i--) {
            if (data[i] > 0) {
              targetIndex = Math.max(0, i - 2);
              break;
            }
          }
        }

        if (targetIndex !== -1 && targetIndex !== undefined) {
          const offsetX = Math.max(0, targetIndex * 101 + 100);
          if (Platform.OS === 'web') {
            scrollViewRef.current?.scrollTo({ x: offsetX, animated: true });
          } else {
            setTimeout(() => {
              scrollViewRef.current?.scrollTo({ x: offsetX, animated: true });
            }, 300);
          }
        }
      }
    }, [chartData])
  );

  return (
    <BottomSheetView
      style={{ ...styles.container, backgroundColor: theme.sheet.sheetBg }}
    >
      <View
        style={{
          ...styles.header,
          paddingRight: isWeb ? 10 : 0,
          paddingTop: isWeb ? 10 : 0,
        }}
      >
        <View style={styles.placeholder} />
        <View
          style={[styles.handle, { backgroundColor: theme.sheet.closeBg }]}
        />
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: theme.sheet.closeBg }]}
          onPress={closeSheet}
        >
          <AntDesign name='close' size={24} color={theme.sheet.closeIcon} />
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
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.forecastContainer}
        nestedScrollEnabled
        contentContainerStyle={{
          paddingHorizontal: isWeb ? 20 : 10,
          width: chartData
            ? Math.max(
                chartData.labels.length * 100,
                Dimensions.get('window').width
              )
            : Dimensions.get('window').width,
          alignItems: 'center',
          marginTop: chartData ? 40 : 0,
        }}
      >
        {!loading && chartData ? (
          <BarChart
            style={{ ...styles.graphStyle, backgroundColor: theme.sheet.sheetBg }}
            data={chartData}
            width={Math.max(
              chartData.labels.length * 100,
              Dimensions.get('window').width
            )}
            fromNumber={100}
            height={400}
            showBarTops={false}
            chartConfig={{
              formatTopBarValue: (value) => {
                if (value > 0) {
                  return `${value}%`;
                } else {
                  return '';
                }
              },
              ...chartConfig,
              barPercentage: 1.5,
            }}
            // showValuesOnTopOfBars
            withCustomBarColorFromData
            flatColor
          />
        ) : (
          <View style={{ width: '100%', height: 200, alignItems: 'center' }}>
            <ActivityIndicator size={40} color={theme.screen.icon} />
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetView>
  );
};

export default ForecastSheet;
