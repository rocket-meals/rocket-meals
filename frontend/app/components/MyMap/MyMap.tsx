import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';

export interface MyMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
}

const MyMap: React.FC<MyMapProps> = ({ latitude, longitude, zoom }) => {
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const html = require('@/assets/leaflet/index.html');

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.tag === 'MapComponentMounted') {
          sendCoordinates();
        }
      } catch {
        // ignore malformed messages
      }
    },
    [sendCoordinates]
  );

  const sendCoordinates = useCallback(() => {
    if (webViewRef.current) {
      const message = {
        mapCenterPosition: { lat: latitude, lng: longitude },
        zoom: zoom ?? 13,
      };
      webViewRef.current.postMessage(JSON.stringify(message));
    }
  }, [latitude, longitude, zoom]);

  useEffect(() => {
    sendCoordinates();
  }, [sendCoordinates]);

  return (
    <View style={[styles.container, { backgroundColor: theme.screen.background }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={html}
        style={styles.webview}
        onMessage={handleMessage}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        domStorageEnabled
        javaScriptEnabled
        containerStyle={{ height: '100%', width: '100%' }}
        onLoadEnd={sendCoordinates}
      />
    </View>
  );
};

export default MyMap;
