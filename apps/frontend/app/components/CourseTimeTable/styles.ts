import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 50,
		backgroundColor: '#f5f5f5',
	},
	sheetView: {
		width: '100%',
		height: '100%',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		padding: 10,
		paddingBottom: 0,
	},
	contentContainer: {
		width: '100%',
	},
	mainContent: {},
	timeColumnContainer: {
		width: 60,
		backgroundColor: '#f5f5f5',
		borderRightWidth: 1,
		borderRightColor: '#ddd',
	},
	tableContent: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
	},
	column: {
		flex: 1,
		borderRightWidth: 1,
		borderColor: 'red',
	},
	slot: {
		height: 60,
		borderBottomWidth: 1,
		borderColor: '#ddd',
	},
	slotEvent: {
		position: 'absolute',
		top: 0,
		left: '5%',
		width: '90%',
		borderRadius: 5,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
	},
	emptyHeader: {
		width: 61,
		borderBottomWidth: 1,
		borderRightWidth: 1,
		borderColor: '#ddd',
	},
	mainContentRow: {
		flexDirection: 'row',
	},
	timeColumn: {
		width: 60,
		height: 60,
		justifyContent: 'center',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderColor: '#ddd',
	},
	headerRow: {
		flex: 1,
		flexDirection: 'row',
	},
	dayHeader: {
		height: 60,
		alignItems: 'center',
		justifyContent: 'center',
		borderBottomWidth: 1,
		borderRightWidth: 1,
		borderColor: '#ddd',
		backgroundColor: '#fff',
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
	cell: {
		height: 60,
		borderWidth: 1,
		borderColor: '#ddd',
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
		left: 70,
		height: 2,
		backgroundColor: 'red',
		zIndex: 200,
	},
	currentTimeText: {
		position: 'absolute',
		left: -20,
		top: -5,
		backgroundColor: 'red',
		color: 'white',
		paddingHorizontal: 5,
		borderRadius: 5,
		fontSize: 8,
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
		width: '90%',
		alignSelf: 'center',
	},

	sheetHeader: {
		width: '95%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		marginTop: 20,
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
		width: '95%',
		height: 50,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 12,
		alignSelf: 'center',
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

	closeIcon: {
		fontSize: 20,
		color: '#888',
		fontWeight: 'bold',
	},

	content: {},

	buttonContainer: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginTop: 20,
	},
	cancelButton: {
		width: 120,
		padding: 10,
		borderRadius: 5,
		marginRight: 5,
		alignItems: 'center',
		borderWidth: 1,
	},
	saveButton: {
		width: 120,
		padding: 10,
		borderRadius: 5,
		marginLeft: 5,
		alignItems: 'center',
	},
	buttonText: {
		fontWeight: 'bold',
	},

	weekdayView: {
		width: '100%',
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		marginTop: 20,
	},
	titleBt: {
		width: '90%',
		display: 'flex',
		justifyContent: 'center',
		alignSelf: 'center',
		marginTop: 20,
	},
	box: {
		height: 100,
		margin: 5,
	},
	createButton: {
		width: 150,
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
	iconStyle: {
		width: '20%',
		height: '100%',
		backgroundColor: '#10262d',
		justifyContent: 'center',
		alignItems: 'center',
		display: 'flex',
	},
	saveButtons: {
		width: '100%',
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 20,
		gap: 10,
	},
});
