import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import styles from './styles';
import { AIGeneratedHintSheetProps } from './types';

const AIGeneratedHintSheet: React.FC<AIGeneratedHintSheetProps> = () => {
        const { theme } = useTheme();
        const { translate } = useLanguage();

        return (
                <View style={styles.contentContainer}>
                        <Text style={{ ...styles.sheetDescription, color: theme.sheet.text }}>
                                {translate(TranslationKeys.ai_generated_image_hint)}
                        </Text>
                </View>
        );
};

export default AIGeneratedHintSheet;
