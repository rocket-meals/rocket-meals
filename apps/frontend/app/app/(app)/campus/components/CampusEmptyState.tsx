import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import { TranslationKeys } from '@/locales/keys';
import { ComponentIds } from '@/constants/ComponentIds';

interface CampusEmptyStateProps {
    loading: boolean;
    theme: any;
    translate: (key: string) => string;
}

const CampusEmptyState: React.FC<CampusEmptyStateProps> = ({ loading, theme, translate }) => {
    if (loading) {
        return (
            <View style={emptyStyles.container}>
                <LoadingIndicator size={30} color={theme.screen.text} />
            </View>
        );
    }

    return (
        <View style={emptyStyles.container}>
            <Text style={{ fontSize: 16, fontFamily: 'Poppins_400Regular', color: theme.screen.text }} nativeID={ComponentIds.CAMPUS_EMPTY}>
                {translate(TranslationKeys.no_campus_found)}
            </Text>
        </View>
    );
};

const emptyStyles = StyleSheet.create({
    container: {
        height: 200,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default memo(CampusEmptyState);
