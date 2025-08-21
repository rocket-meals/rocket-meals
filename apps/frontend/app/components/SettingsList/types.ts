export interface SettingsListProps {
	leftIcon: React.ReactNode;
	/**
	 * Title text for the row. "label" is kept for backwards
	 * compatibility with the old `SettingList` component.
	 */
	title?: string;
	label?: string;
	value?: string;
	/**
	 * Element rendered on the right side. "rightIcon" is kept for
	 * backwards compatibility with the old `SettingList` component.
	 */
	rightElement?: React.ReactNode;
	rightIcon?: React.ReactNode;
	/**
	 * Press handler. "handleFunction" is kept for backwards
	 * compatibility with the old `SettingList` component.
	 */
	onPress?: () => void;
	handleFunction?: () => void;
	/**
	 * Background color of the left icon wrapper. "iconBgColor" is
	 * kept for backwards compatibility with the old `SettingList`
	 * component.
	 */
	iconBackgroundColor?: string;
	iconBgColor?: string;
	/**
	 * Optional separator below the item.
	 */
	showSeparator?: boolean;
	/**
	 * Visual grouping support. When set to "top" the item receives a
	 * rounded top border and extra padding at the top. "bottom" applies
	 * the same to the bottom side. "single" rounds all corners and
	 * adds padding on both sides. "middle" leaves the default styling.
	 */
	groupPosition?: 'top' | 'middle' | 'bottom' | 'single';
}
