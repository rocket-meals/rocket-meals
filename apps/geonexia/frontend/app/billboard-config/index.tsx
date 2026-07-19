import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsListGroupTitle, SettingsListSelectOption, useMyScrollViewModal, useTheme } from 'repo-depkit-common-ui';
import { Asset } from 'expo-asset';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import { useDispatch, useSelector } from 'react-redux';

import { OBJECT_SPRITES } from '../../assets/objects/objectSprites';
import { setSpriteAnchor, setSpriteScale, resetSpriteAnchor } from '../../store/billboardConfigSlice';
import type { RootState, AppDispatch } from '../../store/store';
import type { HexTileRecord } from '../../helpers/HexTileStorage';
import SettingsListBillboard from '../../components/SettingsListBillboard';
import useGeonexiaAlert from '../../hooks/useGeonexiaAlert';

const PRIMARY_COLOR = '#2563eb';
const ANCHOR_STEP = 0.05;
const ANCHOR_PRECISION = 100; // 2 decimal places
const SCALE_STEP = 0.1;
const SCALE_MIN = 0.1;
const SCALE_MAX = 5.0;
const SCALE_PRECISION = 10; // 1 decimal place
const SCALE_DEFAULT = 1.0;

const PREVIEW_HEIGHT = 160;
const ANCHOR_DOT_SIZE = 12;
const MODAL_THUMB_SIZE = 32;
const NONE_OPTION_ID = -1;

/** Clamp a value between 0 and 1, rounded to 2 decimal places. */
function clampAnchor(value: number): number {
	return Math.max(0, Math.min(1, Math.round(value * ANCHOR_PRECISION) / ANCHOR_PRECISION));
}

/** Compute the actual rendered image bounds inside a contain-mode container. */
function getContainBounds(
	naturalWidth: number,
	naturalHeight: number,
	containerWidth: number,
	containerHeight: number,
): { displayW: number; displayH: number; offsetX: number; offsetY: number } {
	const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
	const displayW = naturalWidth * scale;
	const displayH = naturalHeight * scale;
	const offsetX = (containerWidth - displayW) / 2;
	const offsetY = (containerHeight - displayH) / 2;
	return { displayW, displayH, offsetX, offsetY };
}

/** Count of placed billboards per sprite index (from hex tile records). */
function buildPlacedCountMap(records: Record<string, HexTileRecord>): Map<number, number> {
	const countMap = new Map<number, number>();
	for (const record of Object.values(records)) {
		// Collect all billboard keys from the new billboards map and the legacy field.
		const billboardKeys: string[] = [];
		if (record.billboards) {
			for (const bk of Object.values(record.billboards)) {
				if (bk) billboardKeys.push(bk);
			}
		} else if (record.billboard) {
			billboardKeys.push(record.billboard);
		}
		for (const bk of billboardKeys) {
			const colonIdx = bk.indexOf(':');
			if (colonIdx < 0 || bk.slice(0, colonIdx) !== 'objects') continue;
			const idx = Number.parseInt(bk.slice(colonIdx + 1), 10);
			if (!OBJECT_SPRITES[idx]) continue;
			countMap.set(idx, (countMap.get(idx) ?? 0) + 1);
		}
	}
	return countMap;
}

/** Small SVG thumbnail used as an icon inside the selection modal. */
function SpriteThumbnailIcon({ spriteIndex }: { spriteIndex: number }) {
	const [svgUri, setSvgUri] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		const sprite = OBJECT_SPRITES[spriteIndex];
		if (!sprite) return;
		(async () => {
			try {
				const asset = Asset.fromModule(sprite.source as number);
				await asset.downloadAsync();
				if (cancelled) return;
				let uri: string;
				if (Platform.OS === 'web') {
					uri = asset.uri;
				} else {
					if (!asset.localUri) return;
					const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
						encoding: FileSystem.EncodingType.Base64,
					});
					if (cancelled) return;
					uri = `data:image/svg+xml;base64,${base64}`;
				}
				setSvgUri(uri);
			} catch {
				// ignore load failures
			}
		})();
		return () => { cancelled = true; };
	}, [spriteIndex]);

	if (!svgUri) {
		return <View style={modalStyles.thumbPlaceholder} />;
	}

	return (
		<WebView
			source={{ html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0}html,body{width:${MODAL_THUMB_SIZE}px;height:${MODAL_THUMB_SIZE}px;overflow:hidden;background:transparent}img{width:100%;height:100%;object-fit:contain}</style></head><body><img src="${svgUri.replaceAll('"', '&quot;')}"/></body></html>` }}
			style={modalStyles.thumb}
			originWhitelist={['*']}
			scrollEnabled={false}
			javaScriptEnabled={false}
			pointerEvents="none"
		/>
	);
}

const modalStyles = StyleSheet.create({
	thumb: {
		width: MODAL_THUMB_SIZE,
		height: MODAL_THUMB_SIZE,
		backgroundColor: 'transparent',
	},
	thumbPlaceholder: {
		width: MODAL_THUMB_SIZE,
		height: MODAL_THUMB_SIZE,
	},
});

// ─── Hex + Billboard Canvas Preview ──────────────────────────────────────────

const HEX_PREVIEW_HEIGHT = 220;

// Ratio of billboard width to hex vertex-to-vertex diameter in the real game at zoom 14.
// Derived from: BILLBOARD_UNIT_PX(48/7) / (H3_edge_km[10] × 2000m × px_per_m_zoom14_equator)
//             × BILLBOARD_SCALE_DEFAULT(0.4)
// = (48/7) / (0.065907 × 2000 × (256 × 16384 / 40_075_016)) × 0.4 ≈ 0.199
// Multiply by (scaleFactor × perSpriteScale) to get the per-billboard fraction.
//
// The map renderer intentionally uses the equatorial meters-per-pixel (without cos(lat))
// so that billboard geographic size scales by the same 1/cos(lat) Mercator factor as the
// hex tiles. This keeps the billboard-to-hex visual ratio constant at all latitudes, and
// is why this preview (which also uses the equatorial formula) accurately represents the
// in-game appearance regardless of where the user is located.
const BILLBOARD_PREVIEW_K = 0.199;

/**
 * Preview that renders a hex tile with the billboard SVG on top, sized and
 * positioned according to the configured anchor and scale — approximating how
 * the billboard will look in the real game map.
 *
 * Proportions are derived from the same constants used by the map renderer:
 *   BILLBOARD_UNIT_PX (48/7) × scaleFactor × globalScale(0.4) × perSpriteScale
 * relative to the H3 edge-length-derived hex diameter at zoom 14.
 */
function BillboardHexPreview({
	svgUri,
	spriteIndex,
	scaleFactor,
	perSpriteScale,
	anchorX,
	anchorY,
}: {
	svgUri: string;
	spriteIndex: number;
	scaleFactor: number;
	perSpriteScale: number;
	anchorX: number;
	anchorY: number;
}) {
	const billboardWidthFraction = BILLBOARD_PREVIEW_K * scaleFactor * perSpriteScale;
	const escapedSrc = JSON.stringify(svgUri);

	const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;background:#1e293b;overflow:hidden}
    canvas{display:block}
  </style>
</head>
<body>
<canvas id="c"></canvas>
<script>
var canvas=document.getElementById('c');
var ctx=canvas.getContext('2d');
var W=window.innerWidth;
var H=window.innerHeight;
canvas.width=W;
canvas.height=H;

// Hex params: flat-top orientation matching H3 display
var hexR=Math.min(W,H)*0.26;
var CX=W/2;
var CY=H*0.62;

// Draw a flat-top regular hexagon
function drawHex(cx,cy,r){
  ctx.beginPath();
  for(var i=0;i<6;i++){
    var a=Math.PI/3*i;
    var x=cx+r*Math.cos(a);
    var y=cy+r*Math.sin(a);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();
}

// Background (simulate dark map)
ctx.fillStyle='#1e293b';
ctx.fillRect(0,0,W,H);

// Subtle grid
ctx.strokeStyle='rgba(255,255,255,0.04)';
ctx.lineWidth=1;
for(var gx=0;gx<W;gx+=20){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();}
for(var gy=0;gy<H;gy+=20){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}

// Hex fill and stroke
drawHex(CX,CY,hexR);
ctx.fillStyle='rgba(34,197,94,0.22)';
ctx.fill();
ctx.strokeStyle='rgba(34,197,94,0.85)';
ctx.lineWidth=2;
ctx.stroke();

// Billboard proportions (relative to hex vertex-to-vertex diameter)
var billFraction=${billboardWidthFraction.toFixed(4)};
var billW=hexR*2*billFraction;
var anchorX=${anchorX.toFixed(4)};
var anchorY=${anchorY.toFixed(4)};

// Placement point: center of hex (default billboard placement)
var placementX=CX;
var placementY=CY;

// Load and draw the billboard SVG
// The map renders billboards as squares (SVG stretched to fill a 512×512 canvas,
// then applied to a uniform PlaneGeometry(1,1)), so the preview also uses a square.
var img=new Image();
img.onload=function(){
  var billH=billW;
  var bX=placementX-anchorX*billW;
  var bY=placementY-anchorY*billH;
  ctx.drawImage(img,bX,bY,billW,billH);
  // Anchor point indicator (red dot)
  ctx.beginPath();
  ctx.arc(placementX,placementY,5,0,Math.PI*2);
  ctx.fillStyle='#ef4444';
  ctx.fill();
  ctx.strokeStyle='#ffffff';
  ctx.lineWidth=2;
  ctx.stroke();
};
img.src=${escapedSrc};
</script>
</body>
</html>`;

	return (
		<WebView
			key={`hex-preview-${spriteIndex}-${anchorX.toFixed(2)}-${anchorY.toFixed(2)}-${perSpriteScale.toFixed(2)}`}
			source={{ html }}
			style={previewStyles.canvas}
			originWhitelist={['*']}
			scrollEnabled={false}
			javaScriptEnabled={true}
			pointerEvents="none"
		/>
	);
}

const previewStyles = StyleSheet.create({
	canvas: {
		width: '100%',
		height: HEX_PREVIEW_HEIGHT,
		backgroundColor: '#1e293b',
		borderRadius: 12,
	},
});


export default function BillboardConfigScreen() {
	const { theme } = useTheme();
	const { show: showModal, close: closeModal } = useMyScrollViewModal();
	const { showAlert } = useGeonexiaAlert();
	const dispatch = useDispatch<AppDispatch>();
	const records = useSelector((state: RootState) => state.hexTiles.records);
	const spriteAnchors = useSelector((state: RootState) => state.billboardConfig.spriteAnchors);

	// Count placed billboards per sprite index.
	const placedCountMap = useMemo(() => buildPlacedCountMap(records), [records]);

	// Currently selected sprite index; null = "Keines" (no sprite).
	const [selectedSpriteIndex, setSelectedSpriteIndex] = useState<number | null>(null);

	// SVG data URI cache per sprite index (loaded on demand for selected sprite only).
	const [svgUris, setSvgUris] = useState<Record<number, string>>({});

	// Natural image dimensions per sprite index (for correct anchor overlay positioning).
	const [imageDims, setImageDims] = useState<Record<number, { width: number; height: number }>>({});

	// Load SVG for the currently selected sprite.
	useEffect(() => {
		if (selectedSpriteIndex === null || !OBJECT_SPRITES[selectedSpriteIndex]) return;
		const sprite = OBJECT_SPRITES[selectedSpriteIndex];
		const idx = selectedSpriteIndex;
		let cancelled = false;
		(async () => {
			try {
				const asset = Asset.fromModule(sprite.source as number);
				await asset.downloadAsync();
				if (cancelled) return;
				let uri: string;
				if (Platform.OS === 'web') {
					uri = asset.uri;
				} else {
					if (!asset.localUri) return;
					const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
						encoding: FileSystem.EncodingType.Base64,
					});
					if (cancelled) return;
					uri = `data:image/svg+xml;base64,${base64}`;
				}
				// Only update if not already cached (functional update to read latest state).
				setSvgUris((prev) => (prev[idx] ? prev : { ...prev, [idx]: uri }));
			} catch {
				// Ignore load failures.
			}
		})();
		return () => { cancelled = true; };
	}, [selectedSpriteIndex]);

	const getAnchorX = useCallback((spriteIndex: number) => {
		return spriteAnchors[spriteIndex]?.anchorX ?? OBJECT_SPRITES[spriteIndex].anchorX;
	}, [spriteAnchors]);

	const getAnchorY = useCallback((spriteIndex: number) => {
		return spriteAnchors[spriteIndex]?.anchorY ?? OBJECT_SPRITES[spriteIndex].anchorY;
	}, [spriteAnchors]);

	const getScale = useCallback((spriteIndex: number) => {
		return spriteAnchors[spriteIndex]?.scaleMultiplier ?? SCALE_DEFAULT;
	}, [spriteAnchors]);

	const adjustAnchor = useCallback((spriteIndex: number, deltaX: number, deltaY: number) => {
		const currentX = getAnchorX(spriteIndex);
		const currentY = getAnchorY(spriteIndex);
		dispatch(setSpriteAnchor({
			spriteIndex,
			anchorX: clampAnchor(currentX + deltaX),
			anchorY: clampAnchor(currentY + deltaY),
		}));
	}, [dispatch, getAnchorX, getAnchorY]);

	const adjustScale = useCallback((spriteIndex: number, delta: number) => {
		const current = getScale(spriteIndex);
		const next = Math.max(SCALE_MIN, Math.min(SCALE_MAX,
			Math.round((current + delta) * SCALE_PRECISION) / SCALE_PRECISION,
		));
		dispatch(setSpriteScale({ spriteIndex, scaleMultiplier: next }));
	}, [dispatch, getScale]);

	const handleReset = useCallback((spriteIndex: number) => {
		dispatch(resetSpriteAnchor({ spriteIndex }));
	}, [dispatch]);

	const handleCopyConfig = useCallback(async () => {
		const json = JSON.stringify(spriteAnchors, null, 2);
		await Clipboard.setStringAsync(json);
		showAlert('Copied', 'Billboard config copied to clipboard.');
	}, [spriteAnchors]);

	const selectionOptions = useMemo(() => {
		const none = { id: NONE_OPTION_ID, label: 'Keines' };
		const sprites = OBJECT_SPRITES.map((sprite, idx) => {
			const count = placedCountMap.get(idx) ?? 0;
			const label = count > 0 ? `${sprite.name} (${count})` : sprite.name;
			return {
				id: idx,
				label,
				icon: <SpriteThumbnailIcon spriteIndex={idx} />,
			};
		});
		return [none, ...sprites];
	}, [placedCountMap]);

	const openBillboardSelection = useCallback(() => {
		const currentId = selectedSpriteIndex ?? NONE_OPTION_ID;
		showModal({
			title: '🏗️ Select Billboard',
			onClose: closeModal,
			children: (
				<SettingsListSelectOption
					options={selectionOptions}
					selectedOption={currentId}
					onSelect={(option) => {
						setSelectedSpriteIndex(option.id === NONE_OPTION_ID ? null : option.id);
						closeModal();
					}}
				/>
			),
		});
	}, [showModal, closeModal, selectedSpriteIndex, selectionOptions]);

	return (
		<ScrollView style={[styles.container, { backgroundColor: theme.screen.background }]} contentContainerStyle={styles.content}>
			<SettingsListGroupTitle title="Billboard Anchor Points" />

			<Text style={[styles.description, { color: theme.screen.text + '99' }]}>
				Adjust the anchor point for each billboard type. The red dot shows where the billboard attaches to the map. Changes apply to all billboards of that type.
			</Text>

			{/* Billboard selector row */}
			<SettingsListBillboard
				spriteIndex={selectedSpriteIndex}
				title="Billboard"
				onPress={openBillboardSelection}
				groupPosition="single"
			/>

			{/* Copy config button */}
			<TouchableOpacity
				style={[styles.copyButton, { backgroundColor: PRIMARY_COLOR }]}
				onPress={handleCopyConfig}
			>
				<Ionicons name="copy-outline" size={18} color="#fff" />
				<Text style={styles.copyButtonText}>Copy Config JSON</Text>
			</TouchableOpacity>

			{/* Settings for selected billboard type */}
			{selectedSpriteIndex !== null && (() => {
				const spriteIndex = selectedSpriteIndex;
				const sprite = OBJECT_SPRITES[spriteIndex];
				if (!sprite) return null;
				const anchorX = getAnchorX(spriteIndex);
				const anchorY = getAnchorY(spriteIndex);
				const scale = getScale(spriteIndex);
				const svgUri = svgUris[spriteIndex];
				const isDefault = !spriteAnchors[spriteIndex];
				const dims = imageDims[spriteIndex];
				const count = placedCountMap.get(spriteIndex) ?? 0;
				// Compute actual image bounds within the square preview container for overlay positioning.
				const bounds = dims
					? getContainBounds(dims.width, dims.height, PREVIEW_HEIGHT, PREVIEW_HEIGHT)
					: null;
				const dotLeft = bounds
					? bounds.offsetX + anchorX * bounds.displayW - ANCHOR_DOT_SIZE / 2
					: anchorX * PREVIEW_HEIGHT - ANCHOR_DOT_SIZE / 2;
				const dotTop = bounds
					? bounds.offsetY + anchorY * bounds.displayH - ANCHOR_DOT_SIZE / 2
					: anchorY * PREVIEW_HEIGHT - ANCHOR_DOT_SIZE / 2;
				const crosshairLeft = bounds
					? bounds.offsetX + anchorX * bounds.displayW
					: anchorX * PREVIEW_HEIGHT;
				const crosshairTop = bounds
					? bounds.offsetY + anchorY * bounds.displayH
					: anchorY * PREVIEW_HEIGHT;

				return (
					<>
						<View style={[styles.typeCard, { borderColor: theme.screen.text + '18' }]}>
							{/* Header */}
							<View style={styles.cardHeader}>
								<Text style={[styles.spriteName, { color: theme.screen.text }]}>{sprite.name}</Text>
								{count > 0 && (
									<Text style={[styles.spriteCount, { color: theme.screen.text + '80' }]}>
										{count} placed
									</Text>
								)}
							</View>

							{/* Preview + Controls row */}
							<View style={styles.previewRow}>
								{/* SVG Preview with anchor dot overlay */}
								<View style={[styles.previewContainer, { backgroundColor: theme.screen.text + '08' }]}>
									{svgUri ? (
										<WebView
											source={{ html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0}html,body{width:${PREVIEW_HEIGHT}px;height:${PREVIEW_HEIGHT}px;overflow:hidden;background:transparent}img{width:100%;height:100%;object-fit:contain}</style></head><body><img src="${svgUri.replaceAll('"', '&quot;')}" onload="window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(this.naturalWidth+','+this.naturalHeight)"/></body></html>` }}
											style={[styles.previewImage, { backgroundColor: 'transparent' }]}
											originWhitelist={['*']}
											scrollEnabled={false}
											javaScriptEnabled={true}
											pointerEvents="none"
											onMessage={(event) => {
												const parts = event.nativeEvent.data.split(',');
												const w = Number.parseInt(parts[0], 10);
												const h = Number.parseInt(parts[1], 10);
												if (w > 0 && h > 0) {
													setImageDims((prev) => ({ ...prev, [spriteIndex]: { width: w, height: h } }));
												}
											}}
										/>
									) : (
										<View style={styles.previewPlaceholder}>
											<Ionicons name="image-outline" size={40} color={theme.screen.text + '40'} />
										</View>
									)}
									{/* Crosshair lines */}
									<View style={[styles.crosshairH, { top: crosshairTop - 0.5 }]} />
									<View style={[styles.crosshairV, { left: crosshairLeft - 0.5 }]} />
									{/* Anchor point indicator (red dot) */}
									<View
										style={[
											styles.anchorDot,
											{ left: dotLeft, top: dotTop },
										]}
									/>
								</View>

								{/* Directional buttons */}
								<View style={styles.controlsColumn}>
									{/* Up */}
									<View style={styles.dpadRow}>
										<TouchableOpacity
											style={[styles.dpadButton, { backgroundColor: theme.screen.text + '12' }]}
											onPress={() => adjustAnchor(spriteIndex, 0, -ANCHOR_STEP)}
											disabled={anchorY <= 0}
										>
											<Ionicons name="arrow-up" size={20} color={anchorY <= 0 ? theme.screen.text + '30' : theme.screen.text} />
										</TouchableOpacity>
									</View>
									{/* Left / Reset / Right */}
									<View style={styles.dpadRow}>
										<TouchableOpacity
											style={[styles.dpadButton, { backgroundColor: theme.screen.text + '12' }]}
											onPress={() => adjustAnchor(spriteIndex, -ANCHOR_STEP, 0)}
											disabled={anchorX <= 0}
										>
											<Ionicons name="arrow-back" size={20} color={anchorX <= 0 ? theme.screen.text + '30' : theme.screen.text} />
										</TouchableOpacity>
										<TouchableOpacity
											style={[
												styles.dpadCenter,
												{ backgroundColor: isDefault ? theme.screen.text + '12' : PRIMARY_COLOR + '20' },
											]}
											onPress={() => handleReset(spriteIndex)}
										>
											<Ionicons name="refresh" size={16} color={isDefault ? theme.screen.text + '40' : PRIMARY_COLOR} />
										</TouchableOpacity>
										<TouchableOpacity
											style={[styles.dpadButton, { backgroundColor: theme.screen.text + '12' }]}
											onPress={() => adjustAnchor(spriteIndex, ANCHOR_STEP, 0)}
											disabled={anchorX >= 1}
										>
											<Ionicons name="arrow-forward" size={20} color={anchorX >= 1 ? theme.screen.text + '30' : theme.screen.text} />
										</TouchableOpacity>
									</View>
									{/* Down */}
									<View style={styles.dpadRow}>
										<TouchableOpacity
											style={[styles.dpadButton, { backgroundColor: theme.screen.text + '12' }]}
											onPress={() => adjustAnchor(spriteIndex, 0, ANCHOR_STEP)}
											disabled={anchorY >= 1}
										>
											<Ionicons name="arrow-down" size={20} color={anchorY >= 1 ? theme.screen.text + '30' : theme.screen.text} />
										</TouchableOpacity>
									</View>

									{/* Anchor values */}
									<View style={styles.valuesRow}>
										<Text style={[styles.valueLabel, { color: theme.screen.text + '80' }]}>
											X: {anchorX.toFixed(2)}
										</Text>
										<Text style={[styles.valueLabel, { color: theme.screen.text + '80' }]}>
											Y: {anchorY.toFixed(2)}
										</Text>
									</View>
								</View>
							</View>

							{/* Scale stepper row */}
							<View style={[styles.scaleSeparator, { borderColor: theme.screen.text + '12' }]} />
							<View style={styles.scaleRow}>
								<Text style={[styles.scaleLabel, { color: theme.screen.text + '80' }]}>Scale</Text>
								<View style={styles.scaleControls}>
									<TouchableOpacity
										style={[styles.scaleButton, { backgroundColor: theme.screen.text + '12' }]}
										onPress={() => adjustScale(spriteIndex, -SCALE_STEP)}
										disabled={scale <= SCALE_MIN}
									>
										<Ionicons name="remove" size={18} color={scale <= SCALE_MIN ? theme.screen.text + '30' : theme.screen.text} />
									</TouchableOpacity>
									<Text style={[styles.scaleValue, { color: scale === SCALE_DEFAULT ? theme.screen.text + '80' : PRIMARY_COLOR }]}>
										{scale.toFixed(1)}×
									</Text>
									<TouchableOpacity
										style={[styles.scaleButton, { backgroundColor: theme.screen.text + '12' }]}
										onPress={() => adjustScale(spriteIndex, SCALE_STEP)}
										disabled={scale >= SCALE_MAX}
									>
										<Ionicons name="add" size={18} color={scale >= SCALE_MAX ? theme.screen.text + '30' : theme.screen.text} />
									</TouchableOpacity>
								</View>
							</View>
						</View>

						{/* Hex map preview */}
						{svgUri && (
							<>
								<SettingsListGroupTitle title="Map Preview" />
								<Text style={[styles.description, { color: theme.screen.text + '99' }]}>
									Approximate in-game appearance at map zoom 14 with default global scale (0.4×). The red dot marks the placement point.
								</Text>
								<View style={[styles.hexPreviewWrapper, { borderColor: theme.screen.text + '18' }]}>
									<BillboardHexPreview
										svgUri={svgUri}
										spriteIndex={spriteIndex}
										scaleFactor={sprite.scaleFactor}
										perSpriteScale={scale}
										anchorX={anchorX}
										anchorY={anchorY}
									/>
								</View>
							</>
						)}
					</>
				);
			})()}

			<View style={styles.bottomSpacer} />
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		paddingBottom: 40,
	},
	description: {
		fontSize: 13,
		paddingHorizontal: 16,
		paddingBottom: 12,
		lineHeight: 18,
	},
	typeCard: {
		marginTop: 12,
		marginHorizontal: 12,
		marginBottom: 12,
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	spriteName: {
		fontSize: 16,
		fontWeight: '700',
	},
	spriteCount: {
		fontSize: 12,
	},
	previewRow: {
		flexDirection: 'row',
		gap: 16,
		alignItems: 'center',
	},
	previewContainer: {
		width: PREVIEW_HEIGHT,
		height: PREVIEW_HEIGHT,
		borderRadius: 8,
		overflow: 'hidden',
		position: 'relative',
	},
	previewImage: {
		width: PREVIEW_HEIGHT,
		height: PREVIEW_HEIGHT,
	},
	previewPlaceholder: {
		width: PREVIEW_HEIGHT,
		height: PREVIEW_HEIGHT,
		alignItems: 'center',
		justifyContent: 'center',
	},
	anchorDot: {
		position: 'absolute',
		width: ANCHOR_DOT_SIZE,
		height: ANCHOR_DOT_SIZE,
		borderRadius: ANCHOR_DOT_SIZE / 2,
		backgroundColor: '#ef4444',
		borderWidth: 2,
		borderColor: '#ffffff',
	},
	crosshairH: {
		position: 'absolute',
		left: 0,
		right: 0,
		height: 1,
		backgroundColor: '#ef444480',
	},
	crosshairV: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		width: 1,
		backgroundColor: '#ef444480',
	},
	controlsColumn: {
		flex: 1,
		alignItems: 'center',
		gap: 4,
	},
	dpadRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 4,
	},
	dpadButton: {
		width: 40,
		height: 40,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dpadCenter: {
		width: 36,
		height: 40,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	valuesRow: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 8,
	},
	valueLabel: {
		fontSize: 12,
		fontFamily: 'monospace',
		fontWeight: '500',
	},
	bottomSpacer: {
		height: 40,
	},
	copyButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		marginHorizontal: 12,
		marginTop: 12,
		paddingVertical: 12,
		borderRadius: 10,
	},
	copyButtonText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
	},
	scaleSeparator: {
		borderTopWidth: 1,
		marginTop: 12,
		marginBottom: 10,
	},
	scaleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	scaleLabel: {
		fontSize: 14,
		fontWeight: '600',
	},
	scaleControls: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	scaleButton: {
		width: 36,
		height: 36,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	scaleValue: {
		fontSize: 15,
		fontFamily: 'monospace',
		fontWeight: '700',
		minWidth: 44,
		textAlign: 'center',
	},
	hexPreviewWrapper: {
		marginHorizontal: 12,
		marginBottom: 12,
		borderWidth: 1,
		borderRadius: 12,
		overflow: 'hidden',
	},
});
