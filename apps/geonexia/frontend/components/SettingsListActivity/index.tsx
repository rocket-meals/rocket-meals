import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { SettingsList } from 'repo-depkit-common-ui';
import type { SettingsListProps } from 'repo-depkit-common-ui';

import { SavedActivity } from '../../helpers/ActivityStorage';
import { TimeHelper } from '../../helpers/TimeHelper';

const PRIMARY_COLOR = '#2563eb';

function formatActivityDate(timestamp: number): string {
	const d = new Date(timestamp);
	return (
		d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) +
		'  ' +
		d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
	);
}

function formatDistance(km: number): string {
	return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;
}

type Props = Pick<SettingsListProps, 'groupPosition' | 'showSeparator' | 'onPress'> & {
	activity: SavedActivity;
};

const SettingsListActivity: React.FC<Props> = ({ activity, groupPosition, showSeparator, onPress }) => {
	const km = activity.stats.distanceKm;
	const value = `${formatDistance(km)} · ${TimeHelper.formatDuration(activity.stats.durationSeconds)}`;

	return (
		<SettingsList
			leftIcon={<MaterialIcons name="directions-run" size={20} color="#ffffff" />}
			iconBackgroundColor={PRIMARY_COLOR}
			title={formatActivityDate(activity.startedAt)}
			value={value}
			rightIcon={<MaterialIcons name="chevron-right" size={20} color="#9ca3af" />}
			groupPosition={groupPosition}
			showSeparator={showSeparator}
			onPress={onPress}
		/>
	);
};

export default SettingsListActivity;
