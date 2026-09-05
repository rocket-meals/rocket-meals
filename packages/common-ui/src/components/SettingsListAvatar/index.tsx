import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SettingsList from '../SettingsList';
import type { SettingsListProps } from '../SettingsList/types';
import type { LabeledAccentProps } from 'repo-depkit-common';
import MyAvatar, { AvatarConfig, AvatarSize } from '../MyAvatar';
import { useAvatarEditorModal, UseAvatarEditorModalOptions } from '../MyAvatarEditor';
import PrintHidden from '../PrintHidden';

export type SettingsListAvatarProps = LabeledAccentProps & {
	/** Current avatar config, or null/undefined when no avatar has been set yet. */
	config?: AvatarConfig | null;
	/**
	 * Called with the new config once the user confirms changes in the avatar editor.
	 * Only relevant when `onPressOverride` is not set (i.e. the row opens the avatar editor).
	 */
	onChange?: (config: AvatarConfig) => void;
	/** Called when the user confirms deletion. Only invoked when `options.allowDelete` is true. */
	onDelete?: () => void;
	/** Optional value text shown on the right (e.g. a score). */
	value?: string;
	/** Preview size of the avatar shown in the row. Defaults to a compact row-sized preview. */
	previewSize?: AvatarSize | number;
	avatarBackgroundColor?: string;
	/** Overrides the row's width (defaults to `'100%'`), e.g. for a multi-column layout. */
	width?: number;
	borderWidth?: number;
	borderStyle?: 'solid' | 'dashed';
	/** Overrides the title text's font size. */
	titleFontSize?: number;
	/** Overrides the value text's font size. */
	valueFontSize?: number;
	/** Overrides the title text's color. */
	titleColor?: string;
	/** Overrides the value text's color. */
	valueColor?: string;
	/** Renders `value` on its own line below the name instead of alongside it. */
	stackedValue?: boolean;
	/** Custom right-side element/icon. Defaults to a pencil icon. */
	rightIcon?: React.ReactNode;
	/**
	 * When provided, pressing the row calls this instead of opening the avatar
	 * editor - lets the same row be reused for navigation/scoring contexts
	 * (e.g. a friends list or a scoreboard) while keeping the identical
	 * avatar+name(+value) layout used by the editable rows.
	 */
	onPressOverride?: () => void;
	nativeID?: string;
	groupPosition?: SettingsListProps['groupPosition'];
	showSeparator?: boolean;
	editorOptions?: UseAvatarEditorModalOptions;
};

const DEFAULT_PREVIEW_SIZE = 40;
const DEFAULT_AVATAR_BACKGROUND = '#ffffff';

/**
 * A `SettingsList` row that previews an avatar, alongside a name and an
 * optional value. By default, pressing the row opens the shared avatar
 * editor (`useAvatarEditorModal`); pass `onPressOverride` to reuse the same
 * avatar+name(+value) layout for a non-editing row (e.g. navigate to a
 * detail screen, or open a score-entry modal) instead.
 */
const SettingsListAvatar: React.FC<SettingsListAvatarProps> = ({
	config,
	onChange,
	onDelete,
	label,
	value,
	previewSize = DEFAULT_PREVIEW_SIZE,
	avatarBackgroundColor = DEFAULT_AVATAR_BACKGROUND,
	width,
	backgroundColor,
	borderColor,
	borderWidth,
	borderStyle,
	titleFontSize,
	valueFontSize,
	titleColor,
	valueColor,
	stackedValue,
	rightIcon,
	onPressOverride,
	nativeID,
	groupPosition,
	showSeparator,
	editorOptions,
}) => {
	const { openAvatarEditor } = useAvatarEditorModal();

	const handlePress =
		onPressOverride ??
		(() => {
			if (!onChange) return;
			openAvatarEditor({
				currentAvatar: config,
				onDone: onChange,
				onDelete,
				options: editorOptions,
			});
		});

	return (
		<SettingsList
			nativeID={nativeID}
			label={label}
			value={value}
			leftIconComponent={
				<View style={styles.avatarWrapper}>
					{/* Decomposed style/options (rather than the `config` prop) so `previewSize`
					    always wins - `config.size` (the size the config was authored at) would
					    otherwise take precedence over `previewSize` inside MyAvatar. */}
					<MyAvatar
						style={config?.style}
						options={config?.options}
						size={previewSize}
						rounded
						backgroundColor={avatarBackgroundColor}
					/>
				</View>
			}
			rightIcon={
				rightIcon ?? (
					<PrintHidden>
						<MaterialCommunityIcons name="pencil" size={20} color="#ffffff" />
					</PrintHidden>
				)
			}
			handleFunction={handlePress}
			width={width}
			backgroundColor={backgroundColor}
			borderColor={borderColor}
			borderWidth={borderWidth}
			borderStyle={borderStyle}
			titleFontSize={titleFontSize}
			valueFontSize={valueFontSize}
			titleColor={titleColor}
			valueColor={valueColor}
			stackedValue={stackedValue}
			groupPosition={groupPosition}
			showSeparator={showSeparator}
		/>
	);
};

export default SettingsListAvatar;

const styles = StyleSheet.create({
	avatarWrapper: {
		marginRight: 12,
	},
});
