import React, { memo } from 'react';
import { View } from 'react-native';
import AppTextInput from '@/components/AppTextInput';
import { CollectibleAt } from 'repo-depkit-common';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import styles from '../styles';
import { TranslationKeys } from '@/locales/keys';
import { useAppSelector } from '@/redux/hooks';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import useLanguageTextAlign from '@/hooks/useLanguageTextAlign';

interface CampusListHeaderProps {
    widthStyle: { width: number };
    theme: any;
    query: string;
    setQuery: (text: string) => void;
    translate: (key: string) => string;
}

const CampusListHeader: React.FC<CampusListHeaderProps> = ({
    widthStyle,
    theme,
    query,
    setQuery,
    translate,
}) => {
    const language = useAppSelector((state) => state.settings.language);
    const isLtrLanguage = useIsLtrLanguage();
    const languageTextAlign = useLanguageTextAlign();
    return (
        <View style={{ width: '100%', paddingHorizontal: 5, marginBottom: 10, alignItems: 'center' }}>
            <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_campus} />
            <View style={[styles.searchContainer, widthStyle]}>
                <AppTextInput
                    inputStyle={styles.searchInput}
                    style={{ color: theme.screen.text }}
                    cursorColor={theme.screen.text}
                    placeholderTextColor={theme.screen.placeholder}
                    onChangeText={setQuery}
                    value={query}
                    placeholder={translate(TranslationKeys.search_campus_here)}
                />
            </View>
        </View>
    );
};

export default memo(CampusListHeader);
