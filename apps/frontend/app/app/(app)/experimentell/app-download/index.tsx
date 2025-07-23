import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  View,
  Platform,
  Linking,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import styles from './styles';
import { getImageUrl } from '@/constants/HelperFunctions';
import RedirectButton from '@/components/RedirectButton';
import QrCode from '@/components/QrCode';
import CardDimensionHelper from '@/helper/CardDimensionHelper';
import appleLogo fron "@/assets/icons/IMG_5577.png"
import googleLogo fron "@/assets/icons/IMG_5578.png"

const AppDownload = () => {
  useSetPageTitle(TranslationKeys.app_download);
  const { theme } = useTheme();
  const { serverInfo, appSettings } = useSelector((state: RootState) => state.settings);
  const [projectName, setProjectName] = useState('');
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (serverInfo && serverInfo.info) {
      setProjectName(serverInfo.info.project.project_name);
    }
  }, [serverInfo]);


  const openInBrowser = async (url: string) => {
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        }
      }
    } catch (e) {
      console.error('Error opening url', e);
    }
  };

  const projectLogo =
    serverInfo?.info?.project?.project_logo &&
    getImageUrl(serverInfo.info.project.project_logo);

  const iconSource = projectLogo
    ? { uri: projectLogo }
    : require('../../../../assets/images/icon.png');

  const qrSize = CardDimensionHelper.getCardDimension(screenWidth);

  return (
    <ScrollView
      style={{ ...styles.container, backgroundColor: theme.screen.background }}
      contentContainerStyle={{
        ...styles.contentContainer,
        backgroundColor: theme.screen.background,
      }}
    >
      <View style={styles.content}>
        <Image source={iconSource} style={styles.icon} />
        <Text style={{ ...styles.heading, color: theme.screen.text }}>{projectName}</Text>
        <View style={styles.qrRow}>
          {appSettings?.app_stores_url_to_apple ? (
            <View style={styles.qrCol}>
              <Text selectable style={styles.urlText}>
                {appSettings.app_stores_url_to_apple}
              </Text>
              <QrCode
                value={appSettings.app_stores_url_to_apple}
                size={qrSize}
                logoSource={appleLogo}
              />
              <RedirectButton
                label='iOS'
                onClick={() =>
                  appSettings?.app_stores_url_to_apple &&
                  openInBrowser(appSettings.app_stores_url_to_apple)
                }
              />
            </View>
          ) : null}
          {appSettings?.app_stores_url_to_google ? (
            <View style={styles.qrCol}>
              <Text selectable style={styles.urlText}>
                {appSettings.app_stores_url_to_google}
              </Text>
              <QrCode
                value={appSettings.app_stores_url_to_google}
                size={qrSize}
                logoSource={googleLogo}
                />
              <RedirectButton
                label='Android'
                onClick={() =>
                  appSettings?.app_stores_url_to_google &&
                  openInBrowser(appSettings.app_stores_url_to_google)
                }
              />
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
};

export default AppDownload;
