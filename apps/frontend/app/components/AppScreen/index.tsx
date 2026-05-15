import React from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export interface AppScreenProps {
	children: React.ReactNode;
	scrollable?: boolean;
	style?: ViewStyle;
	contentContainerStyle?: ViewStyle;
	header?: React.ReactNode;
	fullWidth?: boolean;
	onRefresh?: () => void;
	refreshing?: boolean;
}

const AppScreen: React.FC<AppScreenProps> = ({
	children,
	scrollable = true,
	style,
	contentContainerStyle,
	header,
	fullWidth = false,
	onRefresh,
	refreshing = false,
}) => {
	const { theme } = useTheme();
	const [screenWidth, setScreenWidth] = React.useState(Dimensions.get('window').width);

	React.useEffect(() => {
		const subscription = Dimensions.addEventListener('change', ({ window }) => {
			setScreenWidth(window.width);
		});
		return () => subscription?.remove();
	}, []);

	const isLargeScreen = screenWidth > 768;
	const contentWidth = fullWidth ? '100%' : (isLargeScreen ? '70%' : '90%');

	const body = (
		<View style={[styles.body, { width: contentWidth }]}>
			{children}
		</View>
	);

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }, style]}>
			{header}
			{scrollable ? (
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
					keyboardShouldPersistTaps="handled"
					refreshControl={
						onRefresh ? (
							<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
						) : undefined
					}
				>
					{body}
				</ScrollView>
			) : (
				<View style={styles.nonScrollableBody}>
					{body}
				</View>
			)}
		</View>
	);
};

export default AppScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	contentContainer: {
		alignItems: 'center',
		paddingBottom: 20,
		paddingTop: 10,
	},
	body: {
		flex: 1,
		alignItems: 'center',
	},
	nonScrollableBody: {
		flex: 1,
		alignItems: 'center',
	},
});
