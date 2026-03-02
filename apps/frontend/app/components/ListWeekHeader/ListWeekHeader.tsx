import React, { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { isWeb } from '@/constants/Constants';
import { RootState } from '@/redux/reducer';

const FoodPlanHeader = ({ handlePrint }: any) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { weekPlan } = useSelector((state: RootState) => state.management);
	const [headerVisible, setHeaderVisible] = useState(true);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const isMobile = screenWidth < 800;

	const router = useRouter();

	const handleScanHelpClick = () => {
		setHeaderVisible(false);
	};

	const handleSecondaryClick = () => {
		setHeaderVisible(true);
	};

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	return (
		<View>
			{/* FoodPlanHeader */}
			{headerVisible && (
				<View>
					<View style={[styles.container, { backgroundColor: theme.header.background }]}>
						<View style={{ flexDirection: 'row', gap: 20, width: '60%' }}>
							<TouchableOpacity onPress={() => router.navigate('/list-week-screen')}>
								<Ionicons name="arrow-back" size={24} color={theme.screen.icon} />
							</TouchableOpacity>
							<Text style={[styles.title, { color: theme.header.text }]}>Food Plan: Week</Text>
						</View>
						<View style={{ ...styles.icons, gap: isMobile ? 10 : 20 }}>
							<TouchableOpacity onPress={() => router.navigate('/foodPlanWeek')}>
								<Ionicons name="restaurant-sharp" size={24} color={theme.screen.icon} />
							</TouchableOpacity>
							<TouchableOpacity onPress={() => router.navigate('/list-week-screen')}>
								<MaterialIcons name="calendar-month" size={24} color={theme.screen.icon} />
							</TouchableOpacity>
							{isWeb && (
								<TouchableOpacity onPress={handlePrint}>
									<Ionicons name="print-outline" size={24} color={theme.screen.icon} />
								</TouchableOpacity>
							)}
							<TouchableOpacity onPress={handleScanHelpClick}>
								<MaterialCommunityIcons name="scan-helper" size={20} color={theme.screen.icon} />
							</TouchableOpacity>
						</View>
					</View>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		width: '100%',
	},
	title: {
		fontSize: 18,
		fontFamily: 'Poppins_700Bold',
	},
	icons: {
		flexDirection: 'row',
		width: '40%',
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	textIcon: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		padding: 10,
		paddingHorizontal: 10,
	},
});

export default FoodPlanHeader;
