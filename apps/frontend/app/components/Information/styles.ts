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
	row: {
		width: '100%',
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 15,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
	},
	col: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	col2: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	body: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	value: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
	},
});
