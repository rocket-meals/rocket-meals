import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SettingsList, useTheme } from 'repo-depkit-common-ui';

import { OBJECT_SPRITES } from '../../assets/objects/objectSprites';
import { SettingsListSelectablePressableItemProps } from '../SettingsListSharedProps';

type Props = SettingsListSelectablePressableItemProps & {
	/** Index into OBJECT_SPRITES, or null if nothing selected. */
	spriteIndex: number | null;
};

const THUMB_SIZE = 32;

const SettingsListBillboard: React.FC<Props> = ({
	spriteIndex,
	title = 'Billboard',
	onPress,
	groupPosition,
	isSelected,
	selectionColor,
}) => {
	const { theme } = useTheme();
	const [svgUri, setSvgUri] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		if (spriteIndex === null || !OBJECT_SPRITES[spriteIndex]) {
			setSvgUri(null);
			return;
		}
		const sprite = OBJECT_SPRITES[spriteIndex];
		(async () => {
			try {
				const asset = Asset.fromModule(sprite.source as number);
				await asset.downloadAsync();
				if (cancelled) return;
				if (Platform.OS === 'web') {
					setSvgUri(asset.uri);
				} else {
					if (!asset.localUri) return;
					const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
						encoding: FileSystem.EncodingType.Base64,
					});
					if (cancelled) return;
					setSvgUri(`data:image/svg+xml;base64,${base64}`);
				}
			} catch {
				if (!cancelled) setSvgUri(null);
			}
		})();
		return () => { cancelled = true; };
	}, [spriteIndex]);

	const sprite = spriteIndex !== null ? OBJECT_SPRITES[spriteIndex] : null;
	const spriteName = sprite?.name ?? '—';

	const thumbnail = svgUri ? (
		<WebView
			source={{ html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0}html,body{width:${THUMB_SIZE}px;height:${THUMB_SIZE}px;overflow:hidden;background:transparent}img{width:100%;height:100%;object-fit:contain}</style></head><body><img src="${svgUri.replaceAll('"', '&quot;')}"/></body></html>` }}
			style={[styles.thumb, { backgroundColor: 'transparent' }]}
			originWhitelist={['*']}
			scrollEnabled={false}
			javaScriptEnabled={false}
			pointerEvents="none"
		/>
	) : (
		<View style={[styles.thumb, { backgroundColor: 'transparent', borderRadius: 6 }]} />
	);

	const radioButton = isSelected !== undefined ? (
		<MaterialCommunityIcons
			name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
			size={24}
			color={isSelected && selectionColor ? selectionColor : theme.screen.icon}
		/>
	) : undefined;

	return (
		<SettingsList
			title={title}
			value={spriteName}
			handleFunction={onPress}
			groupPosition={groupPosition}
			leftIconComponent={
				<View style={[styles.thumbWrapper, { backgroundColor: theme.screen.text + '08' }]}>
					{thumbnail}
				</View>
			}
			rightElement={radioButton}
		/>
	);
};

export default SettingsListBillboard;

const styles = StyleSheet.create({
	thumbWrapper: {
		width: 34,
		height: 34,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	thumb: {
		width: THUMB_SIZE,
		height: THUMB_SIZE,
	},
});
