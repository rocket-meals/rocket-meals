import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useMemo } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useSelector } from 'react-redux';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { RootState } from '@/redux/reducer';

const index = () => {
  useSetPageTitle(TranslationKeys.experimentell);
  const { translate } = useLanguage();
  const { theme } = useTheme();
  const { buildings } = useSelector(
    (state: RootState) => state.canteenReducer
  );
  const selectedCanteen = useSelectedCanteen();

  const buildingPosition = useMemo(() => {
    if (selectedCanteen?.building) {
      const building = buildings.find((b) => b.id === selectedCanteen.building);
      const coords = (building as any)?.coordinates?.coordinates;
      if (coords && coords.length === 2) {
        return { lat: Number(coords[1]), lng: Number(coords[0]) };
      }
    }
    return null;
  }, [selectedCanteen, buildings]);

  return (
    <ScrollView
      style={{ ...styles.container, backgroundColor: theme.screen.background }}
      contentContainerStyle={{
        ...styles.contentContainer,
        backgroundColor: theme.screen.background,
      }}
    >
      <View style={{ ...styles.content }}>
        <Text style={{ ...styles.heading, color: theme.screen.text }}>
          {translate(TranslationKeys.experimentell)}
        </Text>
        {buildingPosition && (
          <Text style={{ ...styles.body, color: theme.screen.text }}>
            {translate(TranslationKeys.coordinates)}: {buildingPosition.lat},{' '}
            {buildingPosition.lng}
          </Text>
        )}
        <TouchableOpacity
          style={{ ...styles.listItem, backgroundColor: theme.screen.iconBg }}
          onPress={() =>
            router.push({
              pathname: '/leaflet-map',
              params: {
                lat: String(buildingPosition?.lat ?? '52.275'),
                lng: String(buildingPosition?.lng ?? '7.4584'),
                zoom: '16',
              },
            })
          }
        >
          <View style={styles.col}>
            <MaterialCommunityIcons name='map' color={theme.screen.icon} size={24} />
            <Text style={{ ...styles.body, color: theme.screen.text }}>
              {translate(TranslationKeys.leaflet_map)}
            </Text>
          </View>
          <Entypo name='chevron-small-right' color={theme.screen.icon} size={24} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ ...styles.listItem, backgroundColor: theme.screen.iconBg }}
          onPress={() => router.push('/vertical-image-scroll')}
        >
          <View style={styles.col}>
            <MaterialCommunityIcons name='image-multiple' color={theme.screen.icon} size={24} />
            <Text style={{ ...styles.body, color: theme.screen.text }}>
              {translate(TranslationKeys.vertical_image_scroll)}
            </Text>
          </View>
          <Entypo name='chevron-small-right' color={theme.screen.icon} size={24} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default index;
