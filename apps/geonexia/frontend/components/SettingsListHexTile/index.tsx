import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SettingsList, useTheme } from 'repo-depkit-common-ui';

import { TERRAIN_ASSETS, TerrainAssetEntry } from '../../assets/terrainAssets';
import { SettingsListSelectablePressableItemProps } from '../SettingsListSharedProps';

type Props = SettingsListSelectablePressableItemProps & {
	/** Tile image key (e.g. "Grass/grass"), or null if nothing selected. */
	tileImageKey: string | null;
};

const THUMB_SIZE = 32;

/** Find a terrain asset entry by key across all categories. */
function findTerrainEntry(key: string): TerrainAssetEntry | null {
	for (const entries of Object.values(TERRAIN_ASSETS)) {
		const found = entries.find((e) => e.key === key);
		if (found) return found;
	}
	return null;
}

const SettingsListHexTile: React.FC<Props> = ({
	tileImageKey,
	title = 'Tile Image',
	onPress,
	groupPosition,
	isSelected,
	selectionColor,
}) => {
	const { theme } = useTheme();
	const [svgUri, setSvgUri] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		if (!tileImageKey) {
			setSvgUri(null);
			return;
		}
		const entry = findTerrainEntry(tileImageKey);
		if (!entry) {
			setSvgUri(null);
			return;
		}
		(async () => {
			try {
				const asset = Asset.fromModule(entry.source as number);
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
					setSvgUri(`data:${entry.mimeType ?? 'image/svg+xml'};base64,${base64}`);
				}
			} catch {
				if (!cancelled) setSvgUri(null);
			}
		})();
		return () => { cancelled = true; };
	}, [tileImageKey]);

	const displayName = tileImageKey ?? '—';

	const thumbnail = svgUri ? (
		<WebView
			source={{ html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0}html,body{width:${THUMB_SIZE}px;height:${THUMB_SIZE}px;overflow:hidden;background:transparent}img{width:100%;height:100%;object-fit:cover}</style></head><body><img src="${svgUri.replaceAll('"', '&quot;')}"/></body></html>` }}
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
			value={displayName}
			handleFunction={onPress}
			groupPosition={groupPosition}
			leftIconComponent={
				<View style={styles.thumbWrapper}>
					{thumbnail}
				</View>
			}
			rightElement={radioButton}
		/>
	);
};

export default SettingsListHexTile;

const styles = StyleSheet.create({
	thumbWrapper: {
		width: 34,
		height: 34,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
		overflow: 'hidden',
	},
	thumb: {
		width: THUMB_SIZE,
		height: THUMB_SIZE,
	},
});
