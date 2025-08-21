import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
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
	body: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	sheetBackground: {
		borderTopRightRadius: 30,
		borderTopLeftRadius: 30,
	},
	content: {
		width: '100%',
		gap: 20,
		paddingBottom: 20,
	},
	formSubmissionId: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10,
		padding: 10,
		marginBottom: 10,
		marginTop: 10,
	},
	formFieldContainer: {
		width: '100%',
		padding: 10,
		borderRadius: 10,
		gap: 10,
	},
	formNameContainer: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderRadius: 10,
		padding: 10,
	},
	descriptionContainer: {
		width: '100%',
		borderRadius: 10,
		padding: 10,
	},
	pickerContainer: {
		width: '100%',
		marginVertical: 10,
	},
	stateChangeButton: {
		width: '100%',
		height: 50,
		borderRadius: 8,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 20,
		gap: 10,
	},
	state: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	button: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 10,
		paddingVertical: 10,
	},
	buttonLabel: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	actionContainer: {
		marginBottom: 20,
		marginTop: 10,
	},
	dummy: {},
});
