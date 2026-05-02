import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MyAvatar, { AvatarStyle, AvatarSize } from '../MyAvatar';
import { useMyScrollViewModal } from '../GlobalModal/useMyScrollViewModal';
import SettingsListSelectLeftRight from '../SettingsListSelectLeftRight';
import SettingsListGroupTitle from '../SettingsListGroupTitle';
import SettingsListTextInput from '../SettingsListTextInput';

export type AvatarConfig = {
	seed: string;
	style: AvatarStyle;
	size: AvatarSize;
};

const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
	seed: 'John Doe',
	style: AvatarStyle.LORELEI,
	size: AvatarSize.LARGE,
};

const AVATAR_STYLE_OPTIONS = Object.values(AvatarStyle).map((style) => ({
	id: style,
	label: style,
}));

const AVATAR_SIZE_OPTIONS = [
	{ id: AvatarSize.SMALL, label: `Small (${AvatarSize.SMALL}px)` },
	{ id: AvatarSize.MEDIUM, label: `Medium (${AvatarSize.MEDIUM}px)` },
	{ id: AvatarSize.LARGE, label: `Large (${AvatarSize.LARGE}px)` },
	{ id: AvatarSize.XLARGE, label: `XLarge (${AvatarSize.XLARGE}px)` },
];

type AvatarEditorModalContentProps = {
	initialConfig: AvatarConfig;
	accentColor?: string;
	configRef: React.MutableRefObject<AvatarConfig>;
};

const AvatarEditorModalContent: React.FC<AvatarEditorModalContentProps> = ({
	initialConfig,
	accentColor,
	configRef,
}) => {
	const [config, setConfig] = useState<AvatarConfig>(initialConfig);

	const handleChange = (newConfig: AvatarConfig) => {
		setConfig(newConfig);
		configRef.current = newConfig;
	};

	return (
		<View style={styles.content}>
			<View style={styles.avatarContainer}>
				<MyAvatar
					seed={config.seed}
					style={config.style}
					size={AvatarSize.XLARGE}
					borderRadius={AvatarSize.XLARGE / 2}
				/>
			</View>

			<SettingsListGroupTitle label="Seed" />
			<SettingsListTextInput
				label="Seed"
				placeholder="Seed"
				initialValue={config.seed}
				onSave={(value) => handleChange({ ...config, seed: value })}
				iconBgColor={accentColor}
				groupPosition="single"
			/>

			<SettingsListGroupTitle label="Style" />
			<SettingsListSelectLeftRight
				options={AVATAR_STYLE_OPTIONS}
				selectedOption={config.style}
				onSelect={(option) => handleChange({ ...config, style: option.id as AvatarStyle })}
				iconBgColor={accentColor}
				title="Style"
				groupPosition="single"
			/>

			<SettingsListGroupTitle label="Size" />
			<SettingsListSelectLeftRight
				options={AVATAR_SIZE_OPTIONS}
				selectedOption={config.size}
				onSelect={(option) => handleChange({ ...config, size: option.id as AvatarSize })}
				iconBgColor={accentColor}
				title="Size"
				groupPosition="single"
			/>
		</View>
	);
};

export type UseAvatarEditorModalOptions = {
	title?: string;
	accentColor?: string;
};

export const useAvatarEditorModal = () => {
	const { show, close } = useMyScrollViewModal();
	const configRef = useRef<AvatarConfig>(DEFAULT_AVATAR_CONFIG);

	const showAvatarEditor = useCallback(
		(initialConfig: AvatarConfig, onClose: (config: AvatarConfig) => void, options?: UseAvatarEditorModalOptions) => {
			configRef.current = { ...initialConfig };

			show({
				title: options?.title ?? 'Avatar Editor',
				onClose: () => {
					onClose(configRef.current);
				},
				children: (
					<AvatarEditorModalContent
						initialConfig={initialConfig}
						accentColor={options?.accentColor}
						configRef={configRef}
					/>
				),
			});
		},
		[show],
	);

	return { showAvatarEditor, close };
};

const styles = StyleSheet.create({
	content: {
		width: '100%',
	},
	avatarContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 24,
	},
});
