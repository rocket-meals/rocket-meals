import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import SettingsList from '@/components/SettingsList';
import { languages } from '@/constants/SettingData';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const styles = StyleSheet.create({
        optionsContainer: {
                width: '100%',
                marginTop: 0,
        },
        flagWrapper: {
                minWidth: 34,
                minHeight: 34,
                marginRight: 10,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
        },
        flagText: {
                fontSize: 22,
        },
});

export const useLanguageModal = () => {
        const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
        const { translate, setLanguageMode, language } = useLanguage();
        const { theme } = useTheme();
        const { primaryColor } = useSelector((state: RootState) => state.settings);

        const changeLanguage = useCallback(
                (languageOption: (typeof languages)[number]) => {
                        setLanguageMode(languageOption.value);
                        closeScrollViewModal();
                },
                [closeScrollViewModal, setLanguageMode]
        );

        const LanguageOption = useCallback(
                ({ languageOption, index }: { languageOption: (typeof languages)[number]; index: number }) => {
                        const isSelected = language === languageOption.value;
                        const groupPosition =
                                languages.length === 1
                                        ? 'single'
                                        : index === 0
                                                ? 'top'
                                                : index === languages.length - 1
                                                        ? 'bottom'
                                                        : 'middle';

                        return (
                                <SettingsList
                                        key={`${languageOption.value}-${index}`}
                                        label={languageOption.label}
                                        leftIcon={
                                                <View style={styles.flagWrapper}>
                                                        <Text style={styles.flagText}>{languageOption.emoji}</Text>
                                                </View>
                                        }
                                        iconBgColor="transparent"
                                        showSeparator={index !== languages.length - 1}
                                        groupPosition={groupPosition}
                                        noIconIndent
                                        rightIcon={
                                                <MaterialCommunityIcons
                                                        name={isSelected ? 'circle' : 'circle-outline'}
                                                        size={24}
                                                        color={isSelected ? primaryColor : theme.screen.icon}
                                                />
                                        }
                                        handleFunction={() => changeLanguage(languageOption)}
                                />
                        );
                },
                [changeLanguage, language, primaryColor, theme.screen.icon]
        );

        const openLanguageModal = useCallback(() => {
                showScrollViewModal(
                        {
                                title: translate(TranslationKeys.language),
                                children: (
                                        <View style={styles.optionsContainer}>
                                                {languages.map((languageOption, index) => (
                                                        <LanguageOption
                                                                key={`${languageOption.value}-${index}`}
                                                                languageOption={languageOption}
                                                                index={index}
                                                        />
                                                ))}
                                        </View>
                                ),
                        },
                        {}
                );
        }, [LanguageOption, showScrollViewModal, translate]);

        return { openLanguageModal };
};
