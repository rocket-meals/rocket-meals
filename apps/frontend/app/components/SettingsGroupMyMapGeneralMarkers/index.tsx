import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { SET_OSM_VECTOR_MAP_POI_SUB_SETTINGS, SET_OSM_VECTOR_MAP_SHOW_SETTINGS } from '@/redux/Types/types';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import SettingsListBoolean from '@/components/SettingsListBoolean';
import { POI_SUBTYPES } from '@/components/MyMap/poiSubtypes';

const DEFAULT_SHOW_SETTINGS = { poi: true, transit: true, roadNames: true, leisure: true, barriers: false, parking: true };

const EmojiIcon: React.FC<{ emoji: string }> = ({ emoji }) => (
    <Text style={styles.emojiIcon}>{emoji}</Text>
);

const SettingsGroupMyMapGeneralMarkers: React.FC = () => {
    const dispatch = useDispatch();
    const showSettings = useAppSelector(
        (state) => ((state.settings as any).osmVectorMapShowSettings ?? DEFAULT_SHOW_SETTINGS) as Record<string, boolean>,
    );
    const poiSubSettings = useAppSelector(
        (state) => ((state.settings as any).osmVectorMapPoiSubSettings ?? {}) as Record<string, boolean>,
    );

    const poiEnabled = showSettings.poi ?? true;

    const toggle = (key: string) =>
        dispatch({ type: SET_OSM_VECTOR_MAP_SHOW_SETTINGS, payload: { [key]: !(showSettings[key] ?? true) } });

    const togglePoiSub = (key: string) =>
        dispatch({ type: SET_OSM_VECTOR_MAP_POI_SUB_SETTINGS, payload: { [key]: !(poiSubSettings[key] ?? true) } });

    return (
        <>
            <SettingsGroupTitle>Karten-Ebenen</SettingsGroupTitle>
            <SettingsListBoolean
                title="Shops/POI"
                leftIcon={<EmojiIcon emoji="🏪" />}
                isEnabled={poiEnabled}
                onToggle={() => toggle('poi')}
                groupPosition="top"
            />
            <View style={!poiEnabled ? styles.subItemsDisabled : undefined}>
                {POI_SUBTYPES.map((subtype) => (
                    <SettingsListBoolean
                        key={subtype.key}
                        title={subtype.label}
                        leftIcon={<EmojiIcon emoji={subtype.emoji} />}
                        isEnabled={poiSubSettings[subtype.key] ?? true}
                        onToggle={() => togglePoiSub(subtype.key)}
                        disabled={!poiEnabled}
                        groupPosition="middle"
                    />
                ))}
            </View>
            <SettingsListBoolean
                title="Bus/Transit"
                leftIcon={<EmojiIcon emoji="🚌" />}
                isEnabled={showSettings.transit ?? true}
                onToggle={() => toggle('transit')}
                groupPosition="middle"
            />
            <SettingsListBoolean
                title="Sport & Freizeit"
                leftIcon={<EmojiIcon emoji="🏊" />}
                isEnabled={showSettings.leisure ?? true}
                onToggle={() => toggle('leisure')}
                groupPosition="middle"
            />
            <SettingsListBoolean
                title="Barrieren & Sperren"
                leftIcon={<EmojiIcon emoji="🚧" />}
                isEnabled={showSettings.barriers ?? false}
                onToggle={() => toggle('barriers')}
                groupPosition="middle"
            />
            <SettingsListBoolean
                title="Parkplätze"
                leftIcon={<EmojiIcon emoji="🅿️" />}
                isEnabled={showSettings.parking ?? true}
                onToggle={() => toggle('parking')}
                groupPosition="middle"
            />
            <SettingsListBoolean
                title="Straßennamen"
                leftIcon={<EmojiIcon emoji="🛣️" />}
                isEnabled={showSettings.roadNames ?? true}
                onToggle={() => toggle('roadNames')}
                groupPosition="bottom"
            />
        </>
    );
};

export default SettingsGroupMyMapGeneralMarkers;

const styles = StyleSheet.create({
    emojiIcon: {
        fontSize: 20,
    },
    subItemsDisabled: {
        opacity: 0.4,
    },
});
