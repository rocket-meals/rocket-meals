import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {
		width: '100%',
		paddingVertical: 20,
		alignItems: 'center',
	},
	header: {
		width: '100%',
		height: 60,
		justifyContent: 'center',
		gap: 20,
	},
	stateContainer: {
		width: '100%',
		alignItems: 'center',
		paddingHorizontal: 20,
	},
	selectedState: {
		fontSize: 30,
		fontFamily: 'Poppins_700Bold',
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
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 50,
		gap: 0,
		borderWidth: 1,
		borderColor: '#3A3A3A',
	},
	searchInput: {
		width: '90%',
		height: 50,
		borderTopLeftRadius: 50,
		borderBottomLeftRadius: 50,
		paddingHorizontal: 20,
		fontFamily: 'Poppins_400Regular',
		borderWidth: 1,
		outline: 'none',
		outlineColor: 'transparent',
		borderColor: '#3A3A3A',
		fontSize: 16,
	},
	searchButton: {
		width: '10%',
		height: 50,
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#3A3A3A',
		alignItems: 'center',
		borderTopRightRadius: 50,
		borderBottomRightRadius: 50,
	},
	heading: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
	},
	formCategories: {
		width: '100%',
		gap: 10,
		backgroundColor: 'red',
	},
	formCategory: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 10,
		padding: 10,
		marginBottom: 10,
	},
	col: {
		maxWidth: '70%',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	body: {
		maxWidth: '90%',
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	sheetBackground: {
		borderTopRightRadius: 30,
		borderTopLeftRadius: 30,
	},
	dummy: {},
});
