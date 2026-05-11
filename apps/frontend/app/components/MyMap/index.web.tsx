import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MyMapHandle, MyMapProps } from './MyMapHelper';

const DEFAULT_ZOOM = 16;

const MyMap = forwardRef<MyMapHandle, MyMapProps>(({ initialCenter, loadingText, onMessage }, ref) => {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const htmlBase = require('@/assets/maplibre/index.html') as string;

	const iframeSrc = useMemo(
		// Computed only once: the iframe src is set on mount with the initial map position.
		// Subsequent position/marker updates are sent via sendToMap() messages so the iframe
		// doesn't reload. Changes to initialCenter after mount are intentionally ignored here.
		() => {
			let src = `${htmlBase}?lat=${initialCenter.lat}&lng=${initialCenter.lng}&zoom=${DEFAULT_ZOOM}`;
			if (loadingText) {
				src += `&loadingText=${encodeURIComponent(loadingText)}`;
			}
			return src;
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const sendToMap = useCallback((data: object) => {
		if (iframeRef.current?.contentWindow) {
			iframeRef.current.contentWindow.postMessage(data, window.location.origin);
		}
	}, []);

	useImperativeHandle(ref, () => ({ sendToMap }), [sendToMap]);

	useEffect(() => {
		const handler = (event: MessageEvent) => {
			try {
				const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
				onMessage(data);
			} catch {
				// ignore malformed messages
			}
		};
		window.addEventListener('message', handler);
		return () => window.removeEventListener('message', handler);
	}, [onMessage]);

	return (
		<View style={styles.container}>
			<iframe
				ref={iframeRef}
				src={iframeSrc}
				style={{ width: '100%', height: '100%', border: 'none' }}
				title="OSM Vector Map"
			/>
		</View>
	);
});

export default MyMap;
export type { MyMapHandle, MyMapProps };

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
