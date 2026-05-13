import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { SettingsList } from 'repo-depkit-common-ui';
import type { SettingsListProps } from 'repo-depkit-common-ui';

import type { MapFeatureInfo } from '../../helpers/RouteNameSuggestionHelper';
import { translateLayerId, translateClass, translateSubclass } from '../../hooks/useTranslation';

type Props = Pick<SettingsListProps, 'groupPosition' | 'showSeparator' | 'onPress'> & {
	feature: MapFeatureInfo;
	count: number;
	iconBackgroundColor?: string;
};

/**
 * Builds a human-readable, translated label for a map feature by joining
 * the translated layer ID, the feature name (if any), the translated class,
 * and the translated subclass with " | ".
 */
function buildFeatureLabel(f: MapFeatureInfo): string {
	const parts: string[] = [];
	if (f.layerId) parts.push(translateLayerId(f.layerId));
	if (f.name) parts.push(f.name);
	if (f.class) parts.push(translateClass(f.class));
	if (f.subclass) parts.push(translateSubclass(f.subclass));
	return parts.length > 0 ? parts.join(' | ') : '—';
}

/**
 * A SettingsList row that displays a translated label for an aggregated map
 * feature alongside its occurrence count.
 */
const SettingsListMapFeature: React.FC<Props> = ({
	feature,
	count,
	groupPosition,
	showSeparator,
	onPress,
	iconBackgroundColor = '#7c3aed',
}) => {
	return (
		<SettingsList
			leftIcon={<MaterialIcons name="layers" size={20} color="#ffffff" />}
			iconBackgroundColor={iconBackgroundColor}
			title={buildFeatureLabel(feature)}
			value={String(count)}
			showSeparator={showSeparator}
			groupPosition={groupPosition}
			onPress={onPress}
		/>
	);
};

export default SettingsListMapFeature;
