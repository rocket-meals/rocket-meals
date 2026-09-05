import React, { useState } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { PropsWithChildren } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import SettingsList from '../SettingsList';
import type { SettingsListProps } from '../SettingsList/types';
import Boxplot from '../Boxplot';
import type { BoxplotStyleProps } from '../Boxplot';
import { borderRadiusContainer, horizontalScreenPadding } from '../../constants/ui';
import PrintHidden from '../PrintHidden';

const ICON_WIDTH = 34;
const ICON_MARGIN_RIGHT = 10;
const CONTENT_LEFT_OFFSET = horizontalScreenPadding + ICON_WIDTH + ICON_MARGIN_RIGHT;

const DEFAULT_DESCRIPTION_QUARTILE =
	'Die grüne Box zeigt die mittleren 50 % aller Messwerte (vom unteren zum oberen Quartil), der rote Strich in der Box ist der Median. Die Antennen an den Enden reichen bis zum kleinsten (rot) bzw. größten (blau) gemessenen Wert.';

function defaultBandDescription(format: (value: number) => string, medianBandValue: number): string {
	return `Die grüne Box zeigt den Bereich Median ± ${format(medianBandValue)}, der rote Strich ist der Median. Die Antennen an den Enden reichen bis zum kleinsten (rot) bzw. größten (blau) gemessenen Wert.`;
}

type SettingsListBoxplotOwnProps = BoxplotStyleProps & {
	/** Explanation shown below the plot once expanded. Defaults to a generic "how to read a boxplot" text. */
	description?: string;
	/** Whether the explanation is shown initially, without the user tapping the row. Defaults to false. */
	initiallyExpanded?: boolean;
};

export type SettingsListBoxplotProps = PropsWithChildren<
	Omit<SettingsListProps, 'value' | 'rightElement' | 'rightIcon' | 'onPress' | 'handleFunction'> &
		SettingsListBoxplotOwnProps
>;

const SettingsListBoxplot: React.FC<SettingsListBoxplotProps> = ({
	stats,
	description,
	formatValue,
	boxColor,
	medianColor,
	lowColor,
	highColor,
	medianBandValue,
	primaryColor,
	initiallyExpanded = false,
	showSeparator = true,
	groupPosition,
	...settingsListProps
}) => {
	const { theme } = useTheme();
	const [expanded, setExpanded] = useState(initiallyExpanded);
	const format = formatValue ?? ((value: number) => value.toFixed(1));

	let wrapperStyle: ViewStyle = {};
	if (groupPosition === 'top') {
		wrapperStyle = { borderTopLeftRadius: borderRadiusContainer, borderTopRightRadius: borderRadiusContainer };
	} else if (groupPosition === 'bottom') {
		wrapperStyle = { borderBottomLeftRadius: borderRadiusContainer, borderBottomRightRadius: borderRadiusContainer };
	} else if (groupPosition === 'single') {
		wrapperStyle = { borderRadius: borderRadiusContainer };
	}

	const statsEntries: readonly (readonly [string, number])[] =
		medianBandValue !== undefined
			? [
					['Min', stats.min],
					['Grün ab', Math.max(stats.min, stats.median - medianBandValue)],
					['Median', stats.median],
					['Grün bis', Math.min(stats.max, stats.median + medianBandValue)],
					['Max', stats.max],
				]
			: [
					['Min', stats.min],
					['Q1', stats.q1],
					['Median', stats.median],
					['Q3', stats.q3],
					['Max', stats.max],
				];

	const resolvedDescription =
		description ?? (medianBandValue !== undefined ? defaultBandDescription(format, medianBandValue) : DEFAULT_DESCRIPTION_QUARTILE);

	return (
		<>
			<View style={[styles.wrapper, { backgroundColor: theme.screen.iconBg }, wrapperStyle]}>
				<SettingsList
					{...settingsListProps}
					primaryColor={primaryColor}
					showSeparator={false}
					groupPosition={undefined}
					onPress={() => setExpanded((current) => !current)}
					rightIcon={
						<PrintHidden>
							<MaterialCommunityIcons
								name={expanded ? 'chevron-up' : 'chevron-down'}
								size={22}
								color={theme.screen.icon}
							/>
						</PrintHidden>
					}
				/>
				<View style={styles.plotSection}>
					<Boxplot
						stats={stats}
						boxColor={boxColor}
						medianColor={medianColor}
						lowColor={lowColor}
						highColor={highColor}
						medianBandValue={medianBandValue}
						formatValue={formatValue}
					/>
				</View>
				{expanded ? (
					<View style={styles.descriptionSection}>
						<View style={styles.statsList}>
							{statsEntries.map(([label, value]) => (
								<Text key={label} style={[styles.statsLine, { color: theme.screen.text }]}>
									{`•  ${label}: ${format(value)}`}
								</Text>
							))}
						</View>
						<Text style={[styles.description, { color: theme.screen.icon }]}>
							{resolvedDescription}
						</Text>
					</View>
				) : null}
			</View>
			{showSeparator ? (
				<View style={[styles.separator, { backgroundColor: theme.screen.background }]} />
			) : null}
		</>
	);
};

export default SettingsListBoxplot;

const styles = StyleSheet.create({
	wrapper: {
		width: '100%',
	},
	plotSection: {
		paddingLeft: CONTENT_LEFT_OFFSET,
		paddingRight: horizontalScreenPadding,
		paddingBottom: 10,
	},
	descriptionSection: {
		paddingLeft: CONTENT_LEFT_OFFSET,
		paddingRight: horizontalScreenPadding,
		paddingBottom: 12,
		gap: 8,
	},
	statsList: {
		gap: 3,
	},
	statsLine: {
		fontSize: 12,
		fontWeight: '600',
	},
	description: {
		fontSize: 12,
		lineHeight: 17,
	},
	separator: {
		width: '100%',
		height: StyleSheet.hairlineWidth,
	},
});
