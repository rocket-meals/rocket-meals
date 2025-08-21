import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import {
	Feather,
	FontAwesome5,
	MaterialCommunityIcons,
	MaterialIcons,
} from '@expo/vector-icons';
import { TimeTableListProps } from './types';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

const TimeTableList: React.FC<TimeTableListProps> = ({
	leftIcon,
	label,
	rightIcon,
	value,
	handleFunction,
}) => {
	const { theme } = useTheme();
	const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

	useEffect(() => {
		const onChange = ({ window }: { window: any }) => {
			setWindowWidth(window.width);
		};

		const subscription = Dimensions.addEventListener('change', onChange);
		return () => {
			subscription.remove();
		};
	}, []);

	return (
		<BottomSheetScrollView
			style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
			contentContainerStyle={styles.contentContainer}
		>
			<TouchableOpacity
				style={{
					...styles.list,
					paddingHorizontal: isWeb ? 20 : 10,
				}}
			>
				<View style={{ ...styles.col, gap: isWeb ? 10 : 5 }}>
					<MaterialCommunityIcons
						name="tag-text-outline"
						size={24}
						color={theme.screen.icon}
					/>
					<Text
						style={{
							...styles.label,
							color: theme.screen.text,
							fontSize: windowWidth > 500 ? 16 : 13,
						}}
					>
						Title
					</Text>
				</View>
				<View
					style={{
						...styles.col,
						gap: isWeb ? 10 : 5,
						alignItems: 'center',
						justifyContent: 'flex-end',
					}}
				>
					<Text
						style={{
							...styles.value,
							color: theme.screen.text,
							fontSize: windowWidth > 500 ? 16 : 13,
						}}
					>
						New
					</Text>
					<FontAwesome5 name="pen" size={20} color={theme.screen.icon} />
				</View>
			</TouchableOpacity>
			<TouchableOpacity
				style={{
					...styles.list,
					paddingHorizontal: isWeb ? 20 : 10,
				}}
			>
				<View style={{ ...styles.col, gap: isWeb ? 10 : 5 }}>
					<MaterialCommunityIcons
						name="tag-text-outline"
						size={24}
						color={theme.screen.icon}
					/>
					<Text
						style={{
							...styles.label,
							color: theme.screen.text,
							fontSize: windowWidth > 500 ? 16 : 13,
						}}
					>
						Location
					</Text>
				</View>
				<View
					style={{
						...styles.col,
						gap: isWeb ? 10 : 5,
						alignItems: 'center',
						justifyContent: 'flex-end',
					}}
				>
					<Text
						style={{
							...styles.value,
							color: theme.screen.text,
							fontSize: windowWidth > 500 ? 16 : 13,
						}}
					></Text>
					<FontAwesome5 name="pen" size={20} color={theme.screen.icon} />
				</View>
			</TouchableOpacity>
			<TouchableOpacity
				style={{
					...styles.list,
					paddingHorizontal: isWeb ? 20 : 10,
				}}
			>
				<View style={{ ...styles.col, gap: isWeb ? 10 : 5 }}>
					<MaterialIcons name="color-lens" size={24} color={theme.screen.icon} />
					<Text
						style={{
							...styles.label,
							color: theme.screen.text,
							fontSize: windowWidth > 500 ? 16 : 13,
						}}
					>
						Colors
					</Text>
				</View>
				<View
					style={{
						...styles.col,
						gap: isWeb ? 10 : 5,
						alignItems: 'center',
						justifyContent: 'flex-end',
					}}
				>
					<Text
						style={{
							...styles.value,
							color: theme.screen.text,
							fontSize: windowWidth > 500 ? 16 : 13,
						}}
					>
						#fff
					</Text>
					<FontAwesome5 name="pen" size={20} color={theme.screen.icon} />
				</View>
			</TouchableOpacity>

			<TouchableOpacity
				style={{
					...styles.list,
					paddingHorizontal: isWeb ? 20 : 10,
				}}
			>
				<View style={{ ...styles.col, gap: isWeb ? 10 : 5 }}>
					<MaterialCommunityIcons
						name="clock-start"
						size={24}
						color={theme.screen.icon}
					/>
					<Text
						style={{
							...styles.label,
							color: theme.screen.text,
							fontSize: windowWidth > 500 ? 16 : 13,
						}}
					>
						Start Time
					</Text>
				</View>
				<View
					style={{
						...styles.col,
						gap: isWeb ? 10 : 5,
						alignItems: 'center',
						justifyContent: 'flex-end',
					}}
				>
					<Text
						style={{
							...styles.value,
							color: theme.screen.text,
							fontSize: windowWidth > 500 ? 16 : 13,
						}}
					>
						08:00
					</Text>
					<FontAwesome5 name="pen" size={20} color={theme.screen.icon} />
				</View>
			</TouchableOpacity>

			<TouchableOpacity
				style={{
					...styles.list,
					paddingHorizontal: isWeb ? 20 : 10,
				}}
			>
				<View style={{ ...styles.col, gap: isWeb ? 10 : 5 }}>
					<MaterialCommunityIcons
						name="clock-end"
						size={24}
						color={theme.screen.icon}
					/>
					<Text
						style={{
							...styles.label,
							color: theme.screen.text,
							fontSize: windowWidth > 500 ? 16 : 13,
						}}
					>
						End Time
					</Text>
				</View>
				<View
					style={{
						...styles.col,
						gap: isWeb ? 10 : 5,
						alignItems: 'center',
						justifyContent: 'flex-end',
					}}
				>
					<Text
						style={{
							...styles.value,
							color: theme.screen.text,
							fontSize: windowWidth > 500 ? 16 : 13,
						}}
					>
						10:00
					</Text>
					<FontAwesome5 name="pen" size={20} color={theme.screen.icon} />
				</View>
			</TouchableOpacity>

			<TouchableOpacity
				style={{
					...styles.list,
					paddingHorizontal: isWeb ? 20 : 10,
				}}
			>
				<View style={{ ...styles.col, gap: isWeb ? 10 : 5 }}>
					<Feather name="calendar" size={24} color={theme.screen.icon} />
					<Text
						style={{
							...styles.label,
							color: theme.screen.text,
							fontSize: windowWidth > 500 ? 16 : 13,
						}}
					>
						Week Days
					</Text>
				</View>
				<View
					style={{
						...styles.col,
						gap: isWeb ? 10 : 5,
						alignItems: 'center',
						justifyContent: 'flex-end',
					}}
				>
					<Text
						style={{
							...styles.value,
							color: theme.screen.text,
							fontSize: windowWidth > 500 ? 16 : 13,
						}}
					>
						Monday
					</Text>
					<FontAwesome5 name="pen" size={20} color={theme.screen.icon} />
				</View>
			</TouchableOpacity>

			{/* <TouchableOpacity
        style={{
          ...styles.list,
          //   backgroundColor: theme.screen.iconBg,
          paddingHorizontal: isWeb ? 20 : 10,
        }}
        onPress={handleFunction}
      >
        <View style={{ ...styles.col, gap: isWeb ? 10 : 5 }}>
          {leftIcon}
          <Text
            style={{
              ...styles.label,
              color: theme.screen.text,
              fontSize: windowWidth > 500 ? 16 : 13,
              marginTop: isWeb ? 0 : 2,
            }}
          >
            {label}
          </Text>
        </View>
        <View
          style={{
            ...styles.col,
            gap: isWeb ? 10 : 5,
            alignItems: 'center',
            // backgroundColor: 'red',
            justifyContent: 'flex-end',
          }}
        >
          {value && (
            <Text
              style={{
                ...styles.value,
                color: theme.screen.text,
                fontSize: windowWidth > 500 ? 16 : 13,
                marginTop: isWeb ? 0 : 2,
              }}
            >
              {value}
            </Text>
          )}
          {rightIcon}
        </View>
      </TouchableOpacity> */}
		</BottomSheetScrollView>
	);
};

export default TimeTableList;
