import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	heading: {
		fontSize: 22,
		fontFamily: 'Poppins_700Bold',
		marginBottom: 20,
	},
	washingMachines: {
		marginTop: 10,
		gap: 20,
	},
	card: {
		width: '100%',
		// height: 120,
		borderRadius: 10,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	image: {
		width: 120,
		height: 120,
		resizeMode: 'cover',
		borderRadius: 10,
		borderTopRightRadius: 0,
		borderBottomRightRadius: 0,
	},
	details: {
		gap: 10,
		paddingVertical: 10,
	},
	title: {
		fontSize: 18,
		fontFamily: 'Poppins_700Bold',
	},
	description: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
	},
	dummy: {},
});
