import { ActivityIndicator, Dimensions, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import { Foundation, MaterialCommunityIcons } from '@expo/vector-icons';
import LocationInformation from '@/components/LocationInformation/LocationInformation';
import BuildingDescription from '@/components/BuildingDescription';
import { useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { myContrastColor } from '@/helper/ColorHelper';
import { DatabaseTypes } from 'repo-depkit-common';
import { getImageUrl } from '@/constants/HelperFunctions';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';
import { Image as ExpoImage } from 'expo-image';
import useLinkCoordinateModal from '@/hooks/useLinkCoordinateModal';

const Details = () => {
  useSetPageTitle(TranslationKeys.building_details);
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const { openLinkCoordinateModal } = useLinkCoordinateModal();
  const { id } = useLocalSearchParams();
  const { serverInfo, appSettings, primaryColor, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
  const { campusesDict } = useSelector((state: RootState) => state.campus);
  const defaultImage = useMemo(() => getImageUrl(serverInfo?.info?.project?.project_logo), [serverInfo]);
  const [activeTab, setActiveTab] = useState<'information' | 'description'>('information');
  const [loading, setLoading] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  const campus_area_color = appSettings?.campus_area_color ? appSettings?.campus_area_color : primaryColor;
  const contrastColor = myContrastColor(campus_area_color, theme, mode === 'dark');

  const campusDetails = useMemo<DatabaseTypes.Buildings | null>(() => {
    if (!id) return null;
    const data = campusesDict[String(id)];
    return data || null;
  }, [campusesDict, id]);

  const fetchCampusById = useCallback(async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 60);
  }, []);

  useEffect(() => {
    if (id) fetchCampusById();
  }, [id, fetchCampusById]);

  useEffect(() => {
    const handleResize = () => setScreenWidth(Dimensions.get('window').width);
    const subscription = Dimensions.addEventListener('change', handleResize);
    return () => subscription?.remove();
  }, []);

  const imageSource = useMemo(() => {
    if (!campusDetails) return { uri: defaultImage };
    if (campusDetails?.image_remote_url || campusDetails?.image) {
      return { uri: (campusDetails?.image_remote_url as string) || getImageUrl(String(campusDetails?.image)) };
    }
    return { uri: defaultImage };
  }, [campusDetails, defaultImage]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (imageSource?.uri) {
          try {
            await ExpoImage.prefetch?.(imageSource.uri);
          } catch {
          }
        }
      } catch (e) {
      }
      return () => {
        mounted = false;
      };
    })();
  }, [imageSource]);

  const handleOpenNavigation = useCallback(() => {
    if (!campusDetails) return;
    const coordinates = campusDetails.coordinates?.coordinates;
    if (!coordinates || coordinates.length !== 2) {
      console.error('Invalid coordinates');
      return;
    }
    const [longitude, latitude] = coordinates;
    openLinkCoordinateModal({
      latlon: { latitude, longitude },
    });
  }, [campusDetails, openLinkCoordinateModal, translate]);

  const renderContent = useMemo(() => {
    if (activeTab === 'information') return <LocationInformation campusDetails={campusDetails} />;
    if (activeTab === 'description') return <BuildingDescription campusDetails={campusDetails} />;
    return null;
  }, [activeTab, campusDetails]);

  const themeStyles = useMemo(
    () => ({
      backgroundColor: campus_area_color,
      borderColor: campus_area_color,
      color: contrastColor,
    }),
    [campus_area_color, contrastColor]
  );

  return (
    <SafeAreaView style={{ ...styles.safeAreaContainer, backgroundColor: theme.screen.background }}>
      <ScrollView
        style={{ ...styles.container, backgroundColor: theme.screen.background }}
        contentContainerStyle={{ ...styles.contentContainer, paddingHorizontal: screenWidth > 900 ? 20 : 10 }}
      >
        {!loading ? (
          <View style={{ ...styles.bulidingContainer, width: screenWidth > 1000 ? '80%' : '100%', flexDirection: 'column' }}>
            <View
              style={{
                ...styles.imageContainer,
                width: screenWidth > 1000 ? 400 : screenWidth > 900 ? 350 : Dimensions.get('window').width - 20,
                height: screenWidth > 1000 ? 400 : screenWidth > 900 ? 350 : Dimensions.get('window').width - 20,
              }}
            >
              <ExpoImage
                source={imageSource as any}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={250}
                style={styles.image}
              />
            </View>

            <View style={{ ...styles.detailsContainer, width: '100%' }}>
              <Text style={{ ...styles.buildingHeading, color: theme.screen.text }}>{campusDetails?.alias}</Text>

              <View
                style={{
                  width: '98%',
                  flexDirection: 'row',
                  justifyContent: screenWidth > 900 ? 'flex-start' : 'flex-end',
                  gap: 10,
                }}
              >
                <Tooltip
                  placement="top"
                  trigger={triggerProps => (
                    <TouchableOpacity
                      {...triggerProps}
                      style={{ ...styles.navigationButton, backgroundColor: theme.screen.iconBg }}
                      onPress={handleOpenNavigation}
                    >
                      <MaterialCommunityIcons name="navigation-variant" size={24} color={theme.screen.icon} />
                    </TouchableOpacity>
                  )}
                >
                  <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                    <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                      {`${translate(TranslationKeys.open_navitation_to_location)}`}
                    </TooltipText>
                  </TooltipContent>
                </Tooltip>
              </View>

              <View style={{ ...styles.tabViewContainer, width: '100%' }}>
                <View style={{ ...styles.tabs, width: '100%', gap: screenWidth > 900 ? 20 : 0 }}>
                  <Tooltip
                    placement="top"
                    trigger={triggerProps => (
                      <TouchableOpacity
                        {...triggerProps}
                        style={[styles.tab, activeTab === 'information' ? themeStyles : { backgroundColor: theme.screen.iconBg }]}
                        onPress={() => setActiveTab('information')}
                      >
                        <Foundation name="info" size={26} color={activeTab === 'information' ? contrastColor : theme.screen.icon} />
                      </TouchableOpacity>
                    )}
                  >
                    <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                      <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                        {`${translate(TranslationKeys.information)}`}
                      </TooltipText>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip
                    placement="top"
                    trigger={triggerProps => (
                      <TouchableOpacity
                        {...triggerProps}
                        style={[styles.tab, activeTab === 'description' ? themeStyles : { backgroundColor: theme.screen.iconBg }]}
                        onPress={() => setActiveTab('description')}
                      >
                        <MaterialCommunityIcons name="sort-variant" size={26} color={activeTab === 'description' ? contrastColor : theme.screen.icon} />
                      </TouchableOpacity>
                    )}
                  >
                    <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                      <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                        {`${translate(TranslationKeys.description)}`}
                      </TooltipText>
                    </TooltipContent>
                  </Tooltip>
                </View>

                <View style={{ ...styles.pagerView, width: screenWidth > 900 ? '95%' : '100%', paddingHorizontal: screenWidth > 900 ? 20 : 0 }}>
                  {renderContent}
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ width: '100%', height: 400, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.screen.text} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Details;
