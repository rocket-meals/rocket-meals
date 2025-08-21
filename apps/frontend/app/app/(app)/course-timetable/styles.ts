import { Dimensions, StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 50,
	},
	createButton: {
		maxWidth: 300,
		height: 50,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 5,
		marginLeft: 10,
		gap: 10,
	},
	createButtonText: {
		fontSize: 16,
		fontFamily: 'Poppins_700Bold',
	},

	mainContent: {
		flexDirection: 'row',
	},
	timeColumnContainer: {
		backgroundColor: '#f5f5f5',
	},
	timeColumn: {
		width: 60,
		height: 60,
		justifyContent: 'center',
		alignItems: 'center',
		borderRightWidth: 1,
		borderColor: '#ddd',
	},
	headerRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderColor: '#ddd',
	},
	dayHeaderText: {
		fontWeight: 'bold',
		textAlign: 'center',
	},
	row: {
		flexDirection: 'row',
	},
	timeText: {
		fontSize: 14,
	},
	eventCell: {
		backgroundColor: 'red',
		justifyContent: 'center',
		alignItems: 'center',
	},
	eventText: {
		color: '#fff',
		fontWeight: 'bold',
	},
	currentTimeIndicator: {
		position: 'absolute',
		left: 60,
		height: 2,
		width: Dimensions.get('window').width - 60,
		backgroundColor: 'red',
		zIndex: 2,
	},
	currentTimeText: {
		position: 'absolute',
		left: -50,
		top: -10,
		backgroundColor: 'red',
		color: 'white',
		paddingHorizontal: 5,
		borderRadius: 5,
		fontSize: 12,
	},

	input: {
		width: '100%',
		height: 60,
		borderRadius: 20,
		paddingHorizontal: 20,
		borderColor: '#d14510',
		marginTop: 10,
		fontFamily: 'Poppins_400Regular',
		fontSize: 18,
		color: 'black',
		backgroundColor: '#fff',
		borderWidth: 1,
	},
	languageContainer: {
		marginTop: 10,
		paddingHorizontal: 10,
	},
	sheetBackground: {
		borderTopRightRadius: 30,
		borderTopLeftRadius: 30,
	},
	sheetHeader: {
		width: '60%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		alignSelf: 'flex-end',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
	},
	sheetcloseButton: {
		width: 45,
		height: 45,
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	sheetHeading: {
		fontFamily: 'Poppins_700Bold',
	},
	list: {
		width: '100%',
		height: 50,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 12,
		marginTop: 10,
	},
	col: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '48%',
	},
	label: {
		fontFamily: 'Poppins_700Bold',
	},
	value: {
		fontFamily: 'Poppins_400Regular',
	},
	noEventsContainer: {
		width: '100%',
		marginVertical: 20,
		paddingHorizontal: 10,
	},
	body: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
		marginBottom: 20,
	},
});
