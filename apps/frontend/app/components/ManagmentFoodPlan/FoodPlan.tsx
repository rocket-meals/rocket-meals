import {
  Dimensions,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import styles from './styles';
import { useSelector } from 'react-redux';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { RootState } from '@/redux/reducer';

const FoodPlan = ({
  data,
  onPressItem,
  selectedValue,
  selectedValuNext,
  nextFoodInterval,
  foodOffer,
  intervalNext,
  refreshData,
}: {
  data: any[];
  onPressItem: (item: any) => void;
  selectedValue: string;
  selectedValuNext: string;
  nextFoodInterval: string;
  foodOffer: string;
  intervalNext: string;
  refreshData: string;
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
              onPressItem(item);
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
                  false: theme.screen.icon,
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
                        backgroundColor: theme.screen.icon,
                        fontSize: windowWidth > 600 ? 18 : 16,
                        width: windowWidth > 600 ? 200 : 120,
                      },
                    ]}
                    editable={false}
                    pointerEvents='none'
                    value={selectedCanteen?.alias}
                  />
                )}
                {item.name === 'Speiseangebot Kategorie (optional)' && (
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
                    value={selectedValue}
                  />
                )}
                {item.name === 'Speise Kategorie (optional)' && (
                  <TextInput
                    style={{
                      backgroundColor: theme.screen.iconBg,
                      marginRight: 10,
                      textAlign: 'right',
                      color: theme.screen.text,
                      fontSize: windowWidth > 600 ? 18 : 16,
                      width: windowWidth > 600 ? 200 : 120,
                    }}
                    editable={false}
                    pointerEvents='none'
                    value={selectedValuNext}
                  />
                )}
                {item.name === 'Next Food Interval' && (
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
                    value={nextFoodInterval}
                  />
                )}
                {item.name === 'Refresh Food Offers Interval' && (
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
                    value={foodOffer}
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
        // onPress={() => router.navigate('/list-day-screen')}
      >
        <Text
          style={{
            color: theme.screen.text,
            fontSize: windowWidth > 600 ? 18 : 14,
          }}
        >
          DayScreen
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

export default FoodPlan;
