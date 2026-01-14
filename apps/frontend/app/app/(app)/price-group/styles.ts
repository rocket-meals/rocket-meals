import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	gifContainer: {
		width: 220,
		height: 220,
		marginBottom: 40,
	},
	gif: {
		width: '100%',
		height: '100%',
		resizeMode: 'contain',
	},
	priceGroupContainer: {
		paddingHorizontal: 10,
		marginTop: 40,
	},
});
