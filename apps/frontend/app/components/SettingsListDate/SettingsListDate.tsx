// Hinweis: Wenn neue SettingsList-Komponenten entstehen, bitte auch im Experimental-Screen hinzufügen.
import React from 'react';
import { Text, View } from 'react-native';
import { parse, format } from 'date-fns';

import SettingsListEditable from '@/components/SettingsListEditable';
import CalendarSheet from '@/components/CalendarSheet/CalendarSheet';
import { useModal } from '@/components/GlobalModal/useModal';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import { SettingsListDateProps } from './types';

const SettingsListDate: React.FC<SettingsListDateProps> = ({
	id,
	value,
	onChange,
	onError,
	error,
	custom_type,
	isDisabled = false,
	label,
	placeholder = 'DD.MM.YYYY',
	editable = true,
	prefix,
	suffix,
	...settingsListProps
}) => {
	const { theme } = useTheme();
	const { show, close } = useModal();
	const isEditable = editable && !isDisabled;

	const openCalendar = () => {
		if (!isEditable) return;
		let selectedDate = null;
		if (value && /^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
			try {
				const parsed = parse(value, 'dd.MM.yyyy', new Date());
				selectedDate = parsed.toISOString().split('T')[0];
			} catch (e) {
				// ignore
			}
		}

		show(
			<CalendarSheet
				selectedDateProp={selectedDate || undefined}
				onSelect={(dateString: string) => {
					try {
						const parsed = parse(dateString, 'yyyy-MM-dd', new Date());
						const formatted = format(parsed, 'dd.MM.yyyy');
						onChange(id, formatted, custom_type);
						onError(id, '');
					} catch (e) {
						// ignore
					}
					close();
				}}
				closeSheet={() => close()}
			/>
		, { backgroundStyle: { backgroundColor: theme.sheet?.sheetBg } }
		);
	};

	const decoratedValue = value ? `${prefix ?? ''}${value}${suffix ?? ''}` : '';

	return (
		<View style={styles.container}>
			<SettingsListEditable
				{...settingsListProps}
				label={label ?? placeholder}
				value={decoratedValue || undefined}
				editable={isEditable}
				handleFunction={openCalendar}
			/>
			{Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
		</View>
	);
};

export default SettingsListDate;
