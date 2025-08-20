import React from 'react';
import { View, FlatList } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useRouter } from 'expo-router';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import SettingsList from '@/components/SettingsList';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import styles from './styles';

const ChatsScreen = () => {
  useSetPageTitle(TranslationKeys.chats);
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const router = useRouter();

  const chats = useSelector((state: RootState) => state.chats.chats);
  const sortedChats = [...chats].sort((a, b) => {
    const da = a.date_updated || a.date_created || '';
    const db = b.date_updated || b.date_created || '';
    return da < db ? 1 : -1;
  });

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const last = index === sortedChats.length - 1;
    const first = index === 0;
    const groupPosition =
      sortedChats.length === 1
        ? 'single'
        : first
        ? 'top'
        : last
        ? 'bottom'
        : 'middle';
    return (
      <SettingsList
        leftIcon={<MaterialCommunityIcons name='chat' size={24} color={theme.screen.icon} />}
        title={item.alias || item.id}
        rightIcon={
          <MaterialCommunityIcons
            name='chevron-right'
            size={24}
            color={theme.screen.icon}
          />
        }
        onPress={() =>
          router.push({ pathname: '/chats/details', params: { chat_id: item.id } })
        }
        groupPosition={groupPosition as any}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.screen.background }]}>
      <FlatList
        data={sortedChats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

export default ChatsScreen;
