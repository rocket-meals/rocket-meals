import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
import { useFocusEffect } from 'expo-router';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { UtilizationsEntries } from '@/constants/types';
import { RootState } from '@/redux/reducer';

const ForecastSheet: React.FC<ForecastSheetProps> = ({
  closeSheet,
  forDate,
}) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const utilizationEntryHelper = new UtilizationEntryHelper();
  const [loading, setLoading] = useState(false);
  const { selectedCanteen } = useSelector(
    (state: RootState) => state.canteenReducer
  );
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
        } else {
          percentage = 0;
        }
      }

      return parseFloat(percentage.toFixed(1));
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
        )) as UtilizationsEntries[];
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
    backgroundGradientFrom: '#1E2923',
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: '#08130D',
    backgroundGradientToOpacity: 0.5,
    color: (opacity = 1) => theme.screen.text,
    strokeWidth: 2,
    // barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    formatYLabel: (value: any) => `${value}%`,
  };

  useFocusEffect(
    useCallback(() => {
      if (chartData && chartData?.datasets[0]?.data?.length) {
        const firstNonZeroIndex = chartData.datasets[0].data.findIndex(
          (value: number) => value > 0
        );
        if (firstNonZeroIndex !== -1) {
          scrollViewRef.current?.scrollTo({
            x: Math.max(0, firstNonZeroIndex * 101 + 100),
            animated: true,
          });
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
          ...styles.sheetHeader,
          paddingRight: isWeb ? 10 : 0,
          paddingTop: isWeb ? 10 : 0,
        }}
      >
        <View />
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
            style={styles.graphStyle}
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
