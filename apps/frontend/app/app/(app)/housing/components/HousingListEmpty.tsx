import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';

interface HousingListEmptyProps {
	loading: boolean;
	theme: any;
}

const HousingListEmpty: React.FC<HousingListEmptyProps> = ({ loading, theme }) => {
	if (loading) {
		return (
			<View style={styles.container}>
				<LoadingIndicator size={30} color={theme.screen.text} />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text
				style={{
					fontSize: 16,
					fontFamily: 'Poppins_400Regular',
					color: theme.screen.text,
				}}
			>
				No Apartment Found
			</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		height: 200,
		width: '100%',
		justifyContent: 'center',
		alignItems: 'center',
	},
});

export default memo(HousingListEmpty);
