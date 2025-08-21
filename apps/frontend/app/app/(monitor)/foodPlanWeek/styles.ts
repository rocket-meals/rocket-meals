import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {
		padding: 20,
		paddingTop: 30,
		alignItems: 'center',
	},
	list: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 12,
		padding: 10,
		marginBottom: 20,
	},
	col1: {
		maxWidth: '60%',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	col2: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	label: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	button: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 12,
		padding: 10,
		marginTop: 20,
	},
	sheetBackground: {
		borderTopRightRadius: 30,
		borderTopLeftRadius: 30,
	},

	sheetView: {
		width: '100%',
		height: '100%',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		padding: 10,
		paddingBottom: 0,
	},
	modalHeader: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		padding: 10,
	},
	modalContent: {
		width: '100%',
		paddingHorizontal: 30,
		marginTop: 30,
	},
	modalHeading: {
		fontSize: 36,
		fontFamily: 'Poppins_700Bold',
		alignSelf: 'center',
		textAlign: 'center',
	},
	closeButton: {
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	closeText: {
		fontSize: 20,
		color: '#888',
		fontWeight: 'bold',
	},
	input: {
		width: '100%',
		borderRadius: 20,
		paddingHorizontal: 20,
		borderColor: '#d14510',
		marginTop: 10,
		fontFamily: 'Poppins_400Regular',
		fontSize: 18,
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 20,
		alignSelf: 'flex-end',
	},
	cancelButton: {
		flex: 1,
		padding: 10,
		borderRadius: 5,
		marginRight: 5,
		alignItems: 'center',
		borderWidth: 1,
	},
	saveButton: {
		flex: 1,
		padding: 10,
		borderRadius: 5,
		marginLeft: 5,
		alignItems: 'center',
	},
	buttonText: {
		fontWeight: 'bold',
	},
	dummy: {},
});
