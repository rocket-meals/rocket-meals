// Hinweis: Wenn neue SettingsList-Komponenten entstehen, bitte auch im Experimental-Screen hinzufügen.
import React from 'react';

import SettingsListSelectOptionSingle from '@/components/SettingsListSelectOptionSingle/SettingsListSelectOptionSingle';

type SettingsListSelectOptionItem<T> = {
	id: T;
	label: string;
	icon?: React.ReactNode;
};

type SettingsListSelectOptionProps<T extends string | number> = {
	options: SettingsListSelectOptionItem<T>[];
	selectedOption: T | null;
	onSelect: (option: SettingsListSelectOptionItem<T>) => void;
	iconBgColor?: string;
	selectionColor?: string;
	noIconIndent?: boolean;
};

const SettingsListSelectOption = <T extends string | number>({
	options,
	selectedOption,
	onSelect,
	iconBgColor,
	selectionColor,
	noIconIndent = false,
}: SettingsListSelectOptionProps<T>) => {
	return (
		<>
			{options.map((option, index) => {
				const groupPosition =
					options.length === 1
						? 'single'
						: index === 0
							? 'top'
							: index === options.length - 1
								? 'bottom'
								: 'middle';

				return (
					<SettingsListSelectOptionSingle
						key={String(option.id)}
						label={option.label}
						leftIcon={option.icon}
						iconBgColor={iconBgColor}
						selectionColor={selectionColor}
						isSelected={selectedOption === option.id}
						groupPosition={groupPosition}
						showSeparator={index !== options.length - 1}
						noIconIndent={noIconIndent}
						onPress={() => onSelect(option)}
					/>
				);
			})}
		</>
	);
};

export default SettingsListSelectOption;
