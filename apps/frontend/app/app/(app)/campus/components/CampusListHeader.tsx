import React, { memo } from 'react';
import { View, TextInput } from 'react-native';
import { CollectibleAt } from 'repo-depkit-common';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import styles from '../styles';
import { TranslationKeys } from '@/locales/keys';

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
    return (
        <View style={{ width: '100%', paddingHorizontal: 5, marginBottom: 10, alignItems: 'center' }}>
            <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_campus} />
            <View style={[styles.searchContainer, widthStyle]}>
                <TextInput
                    style={[styles.searchInput, { color: theme.screen.text }]}
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
