import type { PropsWithChildren } from 'react';
import type { SettingsListProps } from '@/components/SettingsList';

type SettingsListDatePropsOwn = {
	id: string;
	value: string;
	onChange: (id: string, value: string, custom_type: string) => void;
	onError: (id: string, error: string) => void;
	error: string;
	isDisabled?: boolean;
	custom_type: string;
	label?: string;
	placeholder?: string;
	editable?: boolean;
	prefix?: string | null;
	suffix?: string | null;
};

export type SettingsListDateProps = PropsWithChildren<
	Omit<SettingsListProps, 'label' | 'title' | 'value' | 'handleFunction' | 'onPress' | 'rightIcon' | 'rightElement'> & SettingsListDatePropsOwn
>;
