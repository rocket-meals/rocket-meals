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
		gap: 20,
		marginTop: 40,
	},
	actionItem: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 10,
		paddingHorizontal: 20,
		borderRadius: 10,
	},
	col: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	label: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 50,
	},
});
