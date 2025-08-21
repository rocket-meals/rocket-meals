import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	statisticsContainer: {
		width: '100%',
		height: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
	},
	heading: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 10,
	},
	topContainer: {
		width: '48%',
	},
	worstContainer: {
		width: '48%',
	},
	body: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	sheetBackground: {
		borderTopRightRadius: 30,
		borderTopLeftRadius: 30,
	},
});
