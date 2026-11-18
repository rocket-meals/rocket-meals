import React from 'react';
import { SafeAreaView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import ApartmentDetailsContent from '@/components/ApartmentDetailsContent/ApartmentDetailsContent';
import styles from './styles';

const Details = () => {
    useSetPageTitle(TranslationKeys.apartment_details);
    const { theme } = useTheme();
    const { id } = useLocalSearchParams();
    const apartmentId = Array.isArray(id) ? id[0] : id;

    return (
        <SafeAreaView style={[styles.safeAreaContainer, { backgroundColor: theme.screen.background }]}>
            <ApartmentDetailsContent id={apartmentId} />
        </SafeAreaView>
    );
};

export default Details;
