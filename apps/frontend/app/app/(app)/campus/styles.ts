import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
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
	col2: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
	},
	heading: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
	},
	compusContainer: {
		flex: 1,
	},
	compusContentContainer: {
		alignItems: 'center',
		paddingBottom: 20,
	},
	searchContainer: {
		marginTop: 30,
		marginBottom: 20,
	},
	searchInput: {
		height: 50,
		borderRadius: 50,
		paddingHorizontal: 20,
		borderWidth: 1,
		borderColor: '#3A3A3A',
		fontFamily: 'Poppins_400Regular',
		fontSize: 16,
	},
	campusContainer: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'stretch',
		justifyContent: 'center',
		flexWrap: 'wrap',
		marginTop: 20,
	},
	sheetBackground: {
		borderTopRightRadius: 30,
		borderTopLeftRadius: 30,
	},
	dummy: {},
});
