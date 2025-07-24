import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
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
import { FontAwesome6 } from '@expo/vector-icons';
import { myContrastColor } from '@/helper/colorHelper';
import QrCode from '@/components/QrCode';
import CardDimensionHelper from '@/helper/CardDimensionHelper';
import appleLogo from '@/assets/icons/apple-store.png';
import googleLogo from '@/assets/icons/google-play.png';
import CardWithText from '@/components/CardWithText/CardWithText';
import Color from 'tinycolor2';

const AppDownload = () => {
  useSetPageTitle(TranslationKeys.app_download);
  const { theme } = useTheme();
  const { serverInfo, appSettings, primaryColor, selectedTheme } = useSelector(
    (state: RootState) => state.settings
  );
  const [projectName, setProjectName] = useState('');
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  const projectColor = serverInfo?.info?.project?.project_color || primaryColor;

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

  const contrastColor = myContrastColor(projectColor, theme, selectedTheme === 'dark');

  const gapBetweenCards = 10;
  const paddingHorizontal = 20;
  const availableWidth = screenWidth - paddingHorizontal * 2;
  const maxQrSize = (availableWidth - gapBetweenCards) / 2;
  const qrSize = Math.min(
    CardDimensionHelper.getCardDimension(screenWidth),
    maxQrSize,
  );

  const renderQrCard = (
    url: string | undefined,
    label: string,
    logo: any,
    color: string,
  ) => {
    if (!url) return null;
    return (
      <CardWithText
        onPress={() => openInBrowser(url)}
        containerStyle={[
          styles.qrCol,
          {
            width: qrSize,
            backgroundColor: theme.card.background,
            borderWidth: 2,
            borderColor: color,
          },
        ]}
        imageContainerStyle={[styles.qrImageContainer, { height: qrSize }]}
        contentStyle={{ paddingBottom: 0 }}
        topRadius={0}
        borderColor={color}
        imageChildren={
          <QrCode
            value={url}
            size={qrSize}
            image={logo}
            backgroundColor='white'
            margin={2}
          />
        }
        bottomContent={
          <TouchableOpacity
            style={[styles.qrButton, { backgroundColor: color }]}
          >
            <Text style={[styles.qrButtonText, { color: contrastColor }]}>{label}</Text>
            <FontAwesome6
              name='arrow-up-right-from-square'
              size={20}
              color={contrastColor}
              style={{ marginLeft: 5 }}
            />
          </TouchableOpacity>
        }
      />
    );
  };

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
          {renderQrCard(
            appSettings?.app_stores_url_to_apple,
            'iOS',
            appleLogo,
            '#FF0000'
          )}
          {renderQrCard(
            appSettings?.app_stores_url_to_google,
            'Android',
            googleLogo,
            Color(projectColor).lighten(20).toHexString()
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default AppDownload;
