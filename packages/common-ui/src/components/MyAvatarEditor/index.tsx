import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MyAvatar, { AvatarStyle, AvatarSize, STYLE_MAP } from '../MyAvatar';
import { Style } from '@dicebear/core';
import { useMyScrollViewModal } from '../GlobalModal/useMyScrollViewModal';
import SettingsListLeftRight from '../SettingsListLeftRight';
import SettingsListGroupTitle from '../SettingsListGroupTitle';
import SettingsListTextInput from '../SettingsListTextInput';

export type AvatarConfig = {
	seed: string;
	style: AvatarStyle;
	size: AvatarSize;
	/** Style-specific options like eyes, mouth, hair, etc. Each key maps to a single-element array. */
	options?: Record<string, string[]>;
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

/**
 * Returns the available component options (e.g. eyes, mouth, hair) for a given
 * DiceBear avatar style. Each key maps to its allowed enum values.
 */
function getStyleComponentOptions(style: AvatarStyle): Record<string, string[]> {
	const dicebearStyle = STYLE_MAP[style] as Style<object> & { schema?: { properties?: Record<string, any> } };
	const properties = dicebearStyle?.schema?.properties;
	if (!properties) return {};

	const result: Record<string, string[]> = {};
	for (const [key, value] of Object.entries(properties)) {
		if (key.includes('Color') || key.includes('Probability')) continue;
		const items = (value as any)?.items;
		if (items?.enum && Array.isArray(items.enum) && items.enum.length > 1) {
			result[key] = items.enum as string[];
		}
	}
	return result;
}

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

	const componentOptions = useMemo(() => getStyleComponentOptions(config.style), [config.style]);
	const componentKeys = useMemo(() => Object.keys(componentOptions), [componentOptions]);

	const handleStyleChange = (newStyle: AvatarStyle) => {
		// Reset options when style changes since different styles have different options
		handleChange({ ...config, style: newStyle, options: undefined });
	};

	const handleOptionChange = (key: string, value: string) => {
		const newOptions = { ...(config.options ?? {}), [key]: [value] };
		handleChange({ ...config, options: newOptions });
	};

	const getSelectedOptionValue = (key: string): string | null => {
		const selected = config.options?.[key];
		if (selected && selected.length > 0) return selected[0];
		return null;
	};

	return (
		<View style={styles.content}>
			<View style={styles.avatarContainer}>
				<MyAvatar
					seed={config.seed}
					style={config.style}
					size={AvatarSize.XLARGE}
					borderRadius={AvatarSize.XLARGE / 2}
					options={config.options}
				/>
			</View>

			<SettingsListGroupTitle title="Seed" />
			<SettingsListTextInput
				label="Seed"
				placeholder="Seed"
				initialValue={config.seed}
				onSave={(value) => handleChange({ ...config, seed: value })}
				iconBgColor={accentColor}
				groupPosition="single"
			/>

			<SettingsListGroupTitle title={`Style (${config.style})`} />
			<SettingsListLeftRight
				label="Style"
				options={AVATAR_STYLE_OPTIONS}
				selectedOption={config.style}
				onSelect={(option) => handleStyleChange(option.id as AvatarStyle)}
				iconBgColor={accentColor}
				accentColor={accentColor}
				groupPosition="single"
			/>

			<SettingsListGroupTitle title="Size" />
			<SettingsListLeftRight
				label="Size"
				options={AVATAR_SIZE_OPTIONS}
				selectedOption={config.size}
				onSelect={(option) => handleChange({ ...config, size: option.id as AvatarSize })}
				iconBgColor={accentColor}
				accentColor={accentColor}
				groupPosition="single"
			/>

			{componentKeys.length > 0 && (
				<>
					<SettingsListGroupTitle title="Components" />
					{componentKeys.map((key, index) => {
						const values = componentOptions[key];
						const optionItems = values.map((v) => ({ id: v, label: v }));
						const selectedValue = getSelectedOptionValue(key);
						const groupPosition = componentKeys.length === 1
							? 'single' as const
							: index === 0
								? 'top' as const
								: index === componentKeys.length - 1
									? 'bottom' as const
									: 'middle' as const;

						return (
							<SettingsListLeftRight
								key={key}
								label={key}
								options={optionItems}
								selectedOption={selectedValue}
								onSelect={(option) => handleOptionChange(key, option.id as string)}
								accentColor={accentColor}
								groupPosition={groupPosition}
							/>
						);
					})}
				</>
			)}
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
