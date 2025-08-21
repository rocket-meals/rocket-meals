import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	outerContainer: {
		flex: 1,
		width: '100%',
	},
	container: {},
	table: {
		flex: 1,
	},
	headerRow: {
		flexDirection: 'row',
		padding: 5,
	},
	dataRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
		backgroundColor: '#f5f5f5',
		paddingHorizontal: 5,
		paddingVertical: 2,
	},
	headerCell: {
		color: '#fff',
		fontSize: 14,
		fontFamily: 'Poppins_700Bold',
		textAlign: 'left',
		paddingHorizontal: 7,
	},
	cell: {
		flexDirection: 'row',
		gap: 5,
		textAlign: 'left',
		justifyContent: 'flex-start',
		flexWrap: 'wrap',
		fontSize: 10,
		fontFamily: 'Poppins_400Regular',
		paddingHorizontal: 7,
	},
	label: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 2,
	},
	labelIcon: {
		marginRight: 5,
	},
	gridContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		padding: 5,
	},

	mainContainer: {
		margin: 5,
	},
	iconText: {
		maxWidth: 203,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 5,
	},
	title: {
		marginLeft: 5,
		fontSize: 10,
		maxWidth: '90%',
	},
	logoContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	labelText: {
		marginLeft: 10,
	},
	footer: {},
	icon: {
		width: 20,
		height: 20,
		resizeMode: 'contain',
	},
	row: {
		width: '100%',
		height: 25,
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		padding: 10,
	},
	body: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		color: '#ffffff',
	},
});
