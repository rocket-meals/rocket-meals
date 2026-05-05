import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector } from '@/redux/hooks';

import { FUN_LANGUAGE_MODES, useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import SettingsList from '@/components/SettingsList';
import SettingsListBoolean from '@/components/SettingsListBoolean';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import { languages } from '@/constants/SettingData';
import { TranslationKeys } from '@/locales/keys';

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
        separatorContainer: {
                marginTop: 16,
        },
});

const PirateLanguageToggle: React.FC = () => {
        const { translate, pirateLanguage, togglePirateLanguage } = useLanguage();
        return (
                <View style={styles.separatorContainer}>
                        <SettingsListBoolean
                                leftIcon={
                                        <View style={styles.flagWrapper}>
                                                <Text style={styles.flagText}>🏴‍☠️</Text>
                                        </View>
                                }
                                iconBgColor="transparent"
                                label={translate(TranslationKeys.pirate_language)}
                                isEnabled={pirateLanguage}
                                onToggle={() => togglePirateLanguage(!pirateLanguage)}
                                groupPosition="top"
                                showSeparator={true}
                        />
                </View>
        );
};

const FunLanguageModeToggles: React.FC = () => {
        const { translate, funLanguageMode, toggleFunLanguageMode } = useLanguage();

        const modes: { key: string; emoji: string; labelKey: TranslationKeys }[] = [
                { key: FUN_LANGUAGE_MODES.BACKWARDS, emoji: '🔄', labelKey: TranslationKeys.backwards_language },
                { key: FUN_LANGUAGE_MODES.LEETSPEAK, emoji: '🔢', labelKey: TranslationKeys.leetspeak_language },
                { key: FUN_LANGUAGE_MODES.ALTERNATING, emoji: '🔀', labelKey: TranslationKeys.alternating_language },
                { key: FUN_LANGUAGE_MODES.TYPOGLYCEMIA, emoji: '🔤', labelKey: TranslationKeys.typoglycemia_language },
                { key: FUN_LANGUAGE_MODES.GLITCH, emoji: '👾', labelKey: TranslationKeys.glitch_language },
        ];

        return (
                <View>
                        {modes.map((mode, index) => (
                                <SettingsListBoolean
                                        key={mode.key}
                                        leftIcon={
                                                <View style={styles.flagWrapper}>
                                                        <Text style={styles.flagText}>{mode.emoji}</Text>
                                                </View>
                                        }
                                        iconBgColor="transparent"
                                        label={translate(mode.labelKey)}
                                        isEnabled={funLanguageMode === mode.key}
                                        onToggle={() => toggleFunLanguageMode(funLanguageMode === mode.key ? null : mode.key)}
                                        groupPosition={
                                                index === modes.length - 1
                                                        ? 'bottom'
                                                        : 'middle'
                                        }
                                        showSeparator={index !== modes.length - 1}
                                />
                        ))}
                </View>
        );
};

export const useLanguageModal = () => {
        const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
        const { translate, setLanguageMode, language } = useLanguage();
        const { theme } = useTheme();
        const { primaryColor } = useAppSelector((state) => state.settings);

        const changeLanguage = useCallback(
                (languageOption: (typeof languages)[number]) => {
                        setLanguageMode(languageOption.value as any);
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
                                                <SettingsGroupTitle>{translate(TranslationKeys.group_fun)}</SettingsGroupTitle>
                                                <PirateLanguageToggle />
                                                <FunLanguageModeToggles />
                                        </View>
                                ),
                        },
                        {}
                );
        }, [LanguageOption, showScrollViewModal, translate]);

        return { openLanguageModal };
};
