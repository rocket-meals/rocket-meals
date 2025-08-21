import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	header: {
		width: '100%',
		height: 60,
		justifyContent: 'center',
		gap: 20,
	},
	row: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	col1: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 20,
	},
	heading: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
	},
});
