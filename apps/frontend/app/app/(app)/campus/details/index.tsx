import React from 'react';
import { } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import BuildingDetailsContent from '@/components/BuildingDetailsContent/BuildingDetailsContent';
import styles from './styles';

const Details = () => {
    useSetPageTitle(TranslationKeys.building_details);
    const { theme } = useTheme();
    const { id } = useLocalSearchParams();
    const buildingId = Array.isArray(id) ? id[0] : id;

    return (
        <SafeAreaView style={{ ...styles.safeAreaContainer, backgroundColor: theme.screen.background }}>
            <BuildingDetailsContent id={buildingId} />
        </SafeAreaView>
    );
};

export default Details;
