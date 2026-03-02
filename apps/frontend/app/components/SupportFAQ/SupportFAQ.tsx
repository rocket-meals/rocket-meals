import React, { useEffect, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { Entypo, FontAwesome6, Ionicons, MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/hooks/useTheme';
import styles from '../../app/(app)/support-FAQ/styles';

type SupportFAQProps = {
	icon?: string;
	label: string;
	text?: string;
	onPress: () => void;
	isArrowRight?: boolean;
	redirectIcon?: boolean;
};

const SupportFAQ: React.FC<SupportFAQProps> = ({ icon, label, text, onPress, isArrowRight = true, redirectIcon = true }) => {
	const { theme } = useTheme();

	const renderIcon = (icon: string | undefined) => {
		if (icon === 'feedback') {
			return <MaterialIcons name={icon} size={20} color={theme.screen.icon} />;
		} else if (icon === 'email') {
			return <MaterialCommunityIcons name={icon} size={20} color={theme.screen.icon} />;
		} else {
			return <Ionicons name={icon} size={20} color={theme.screen.icon} />;
		}
	};

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
		<TouchableOpacity style={{ ...styles.row, backgroundColor: theme.screen.iconBg }} onPress={onPress}>
			<View style={styles.leftView}>
				{icon && renderIcon(icon)}
				<Text style={[styles.linkText, { color: theme.screen.text, fontSize: windowWidth < 500 ? 14 : 18 }]}>{label}</Text>
			</View>
			<View style={styles.textIcon}>
				{text && (
					<Text
						style={[
							styles.iconText,
							{
								color: theme.screen.text,
								fontSize: windowWidth < 500 ? 14 : 18,
							},
						]}
					>
						{text}
					</Text>
				)}
				{redirectIcon && <FontAwesome6 name="arrow-up-right-from-square" size={windowWidth < 500 ? 17 : 20} color={theme.screen.icon} />}

				{isArrowRight && <Entypo name="chevron-small-right" size={25} color={theme.screen.icon} />}
			</View>
		</TouchableOpacity>
	);
};

export default SupportFAQ;
