import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { useSelector } from 'react-redux';
import { excerpt } from '@/constants/HelperFunctions';
import { RootState } from '@/redux/reducer';

type FeedbackItemProps = {
	icon?: string;
	title: string;
	value?: string;
	extraIcons?: string[];
	theme: any;
	windowWidth: number;
	onPress?: () => void;
	inputValues?: any;
	setInputValues?: any;
};

const FeedbackItem: React.FC<FeedbackItemProps> = ({ icon, title, value, extraIcons = [], theme, windowWidth, onPress, inputValues, setInputValues }) => {
	const { translate } = useLanguage();
	const { primaryColor } = useSelector((state: RootState) => state.settings);

	const IconSelector: React.FC<{
		name: string;
		size: number;
		color: string;
		style?: object;
	}> = ({ name, size, color, style }) => {
		if (name === 'feed') {
			return <MaterialIcons name={name} size={size} color={color} style={style} />;
		} else if (name === 'like1' || name === 'dislike1') {
			return <AntDesign name={name} size={size} color={color} style={style} />;
		} else {
			return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
		}
	};

	return (
		<TouchableOpacity style={[styles.container, { backgroundColor: theme.screen.iconBg }]} disabled={title === 'like_status'} onPress={title !== 'like_status' ? onPress : null}>
			<View style={styles.iconTextContainer}>
				{icon && <IconSelector name={icon} size={20} color={theme.screen.icon} style={{ marginRight: 10 }} />}
				<Text
					style={{
						color: theme.screen.text,
						fontSize: windowWidth > 600 ? 18 : 14,
					}}
				>
					{translate(title)}
				</Text>
			</View>
			<View style={styles.iconTextContainer}>
				<Text
					style={{
						color: theme.screen.text,
						fontSize: windowWidth > 600 ? 18 : 16,
						marginRight: 10,
					}}
				>
					{excerpt(String(value), windowWidth > 850 ? 50 : 20)}
				</Text>
				{extraIcons.map((iconName, idx) => (
					<TouchableOpacity
						style={{
							...styles.likeButton,
							borderColor: theme.activeText,
							borderTopLeftRadius: iconName === 'thumb-up-outline' ? 5 : 0,
							borderBottomLeftRadius: iconName === 'thumb-up-outline' ? 5 : 0,
							borderBottomRightRadius: iconName === 'thumb-down-outline' ? 5 : 0,
							borderTopRightRadius: iconName === 'thumb-down-outline' ? 5 : 0,
							backgroundColor: iconName === 'thumb-up-outline' && inputValues?.positive === true ? primaryColor : iconName === 'thumb-down-outline' && inputValues?.positive === false ? primaryColor : 'transparent',
						}}
						onPress={() => {
							if (iconName === 'thumb-up-outline') {
								setInputValues((prevState: any) => ({
									...prevState,
									positive: true,
								}));
							} else {
								setInputValues((prevState: any) => ({
									...prevState,
									positive: false,
								}));
							}
						}}
						key={idx}
					>
						<MaterialCommunityIcons key={idx} name={iconName} size={22} color={theme.screen.icon} style={{ marginHorizontal: 5 }} />
					</TouchableOpacity>
				))}
				{title !== 'like_status' && <MaterialCommunityIcons name="pencil" size={20} color={theme.screen.icon} style={{ marginHorizontal: 5 }} />}
			</View>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginVertical: 10,
		padding: 15,
		borderRadius: 10,
	},
	iconTextContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	likeButton: {
		padding: 12,
		borderWidth: 1,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
});

export default FeedbackItem;
