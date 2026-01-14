import type { PropsWithChildren } from 'react';
import type { SettingsListProps } from '@/components/SettingsList';

type SettingsListEditablePropsOwn = {
	editable?: boolean;
};

export type SettingsListEditableProps = PropsWithChildren<SettingsListProps & SettingsListEditablePropsOwn>;
