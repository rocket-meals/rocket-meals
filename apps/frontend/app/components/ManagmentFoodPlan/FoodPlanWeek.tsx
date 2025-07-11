import {
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import styles from './styles';
import { useSelector } from 'react-redux';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { router } from 'expo-router';
import { RootState } from '@/redux/reducer';

const FoodPlanWeek = ({
  data,
  onPressItem,
}: {
  data: any[];
  onPressItem: (item: any) => void;
}) => {
  const { theme } = useTheme();

  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );

  const [toggleStates, setToggleStates] = useState(
    data.map((item) => item.switchState || false)
  );

  useEffect(() => {
    const onChange = ({ window }: { window: any }) => {
      setWindowWidth(window.width);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const handleToggleChange = (index) => {
    const updatedStates = [...toggleStates];
    updatedStates[index] = !updatedStates[index];
    setToggleStates(updatedStates);
  };

  const selectedCanteen = useSelectedCanteen();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.screen.background }]}
    >
      {data.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.mainContainer,
            { backgroundColor: theme.screen.iconBg },
          ]}
          activeOpacity={item.showSwitch ? 1 : 0}
          onPress={() => {
            if (item.showSwitch) {
              handleToggleChange(index);
            } else {
              onPressItem(item); // Otherwise, call onPressItem
            }
          }}
        >
          <View style={styles.iconTextContainer}>
            {item.showFeedIcon && (
              <MaterialCommunityIcons
                name='silverware-variant'
                size={20}
                color={theme.screen.icon}
                style={{ marginRight: 10 }}
              />
            )}
            <Text
              style={{
                color: theme.screen.text,
                fontSize: windowWidth > 600 ? 18 : 14,
              }}
            >
              {item.name}
            </Text>
          </View>
          <View style={styles.iconTextContainer}>
            {item.showSwitch ? (
              <Switch
                value={toggleStates[index]}
                onValueChange={() => handleToggleChange(index)}
                thumbColor={theme.screen.icon}
                trackColor={{
                  false: theme.screen.iconBg,
                  true: theme.screen.iconBg,
                }}
              />
            ) : (
              <>
                {item.name === 'Canteen' && (
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: theme.screen.text,
                        backgroundColor: theme.screen.iconBg,
                        fontSize: windowWidth > 600 ? 18 : 16,
                        width: windowWidth > 600 ? 200 : 120,
                      },
                    ]}
                    editable={false}
                    pointerEvents='none'
                    value={selectedCanteen?.alias}
                  />
                )}

                <MaterialCommunityIcons
                  name='pencil'
                  size={22}
                  color={theme.screen.icon}
                  style={{ marginHorizontal: 5 }}
                />
              </>
            )}
          </View>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.mainContainer, { backgroundColor: theme.screen.iconBg }]}
        onPress={() => router.navigate('/list-week-screen')}
      >
        <Text
          style={{
            color: theme.screen.text,
            fontSize: windowWidth > 600 ? 18 : 14,
          }}
        >
          Wochen Auswahl
        </Text>
        <MaterialCommunityIcons
          name='chevron-right'
          size={20}
          color={theme.screen.icon}
          style={{ marginRight: 10 }}
        />
      </TouchableOpacity>
    </View>
  );
};

export default FoodPlanWeek;
