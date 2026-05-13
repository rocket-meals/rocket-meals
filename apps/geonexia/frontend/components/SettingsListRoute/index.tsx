import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { SettingsList } from 'repo-depkit-common-ui';
import type { SettingsListProps } from 'repo-depkit-common-ui';

import { SavedRoute } from '../../helpers/RouteStorage';
import { computeRouteLengthKm, formatDistanceKm } from '../../helpers/H3Helper';

const PRIMARY_COLOR = '#2563eb';
const ICON_COLOR = '#ffffff';
const CHEVRON_COLOR = '#9ca3af';

type Props = Pick<SettingsListProps, 'groupPosition' | 'showSeparator' | 'onPress'> & {
	route: SavedRoute;
	/** Overrides the activity count derived from route.activityIds when provided. */
	activityCount?: number;
};

const SettingsListRoute: React.FC<Props> = ({ route, activityCount, groupPosition, showSeparator, onPress }) => {
	const count = activityCount ?? route.activityIds?.length ?? 0;
	const distanceKm = computeRouteLengthKm(route.hexTiles);
	const distStr = distanceKm > 0 ? formatDistanceKm(distanceKm) : '0 km';
	const activityStr = `${count} ${count === 1 ? 'Activity' : 'Activities'}`;
	const meta = `${distStr} · ${activityStr}`;
	return (
		<SettingsList
			leftIcon={<MaterialIcons name="route" size={20} color={ICON_COLOR} />}
			iconBackgroundColor={PRIMARY_COLOR}
			title={route.name}
			value={meta}
			rightIcon={<MaterialIcons name="chevron-right" size={20} color={CHEVRON_COLOR} />}
			groupPosition={groupPosition}
			showSeparator={showSeparator}
			onPress={onPress}
		/>
	);
};

export default SettingsListRoute;
