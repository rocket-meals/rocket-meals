import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
	header: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	picker: {
		width: 160,
		borderRadius: 8,
		borderWidth: 0,
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 5,
	},
	loginForm: {
		width: '100%',
	},
	heading: {
		fontSize: 44,
		fontFamily: 'Poppins_700Bold',
	},
	subHeading: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	firstRow: {
		width: '100%',
		gap: 10,
		marginTop: 20,
		alignItems: 'center',
	},
	button: {
		width: '100%',
		height: 58,
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	leftIcon: {
		width: 58,
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 10,
	},
	google: {
		width: '49%',
	},
	apple: {
		width: '49%',
	},
	incognito: {
		width: '100%',
		marginTop: 10,
	},
	buttonLabel: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		marginLeft: 10,
		marginTop: 4,
	},
	managementLogin: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 10,
	},
	fromManagement: {
		fontSize: 12,
		fontFamily: 'Poppins_400Regular',
		marginRight: 4,
	},
	loginText: {
		fontSize: 12,
		fontFamily: 'Poppins_700Bold',
	},
	section: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 20,
	},
	checkbox: {
		marginRight: 15,
		width: 30,
		height: 30,
	},
	checkboxLabel: {
		fontSize: 12,
		fontFamily: 'Poppins_400Regular',
	},
	footer: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		flexWrap: 'wrap',
	},
	link: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
	},
	divider: {
		marginHorizontal: 10,
		marginBottom: 2,
	},
	//---------------Modal-------------------
	modalContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		margin: 20,
	},
	modalView: {
		borderRadius: 40,
		padding: 20,
		alignItems: 'center',
	},
	modalHeader: {
		width: '100%',
		alignItems: 'flex-end',
	},
	closeButton: {
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalHeading: {
		marginTop: 10,
		fontSize: 36,
		fontFamily: 'Poppins_700Bold',
	},
	modalSubHeading: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
		marginTop: 10,
		marginBottom: 10,
	},
	input: {
		width: '80%',
		height: 60,
		borderRadius: 20,
		paddingHorizontal: 20,
		borderWidth: 0,
		borderColor: 'transparent',
		marginTop: 20,
		fontFamily: 'Poppins_400Regular',
		fontSize: 18,
	},
	loginButton: {
		width: '80%',
		height: 60,
		backgroundColor: '#FCDE31',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 50,
		marginTop: 20,
	},
	loginLabel: {
		fontFamily: 'Poppins_700Bold',
		fontSize: 18,
		color: '#2E2E2E',
	},
	// ----------------Sheet------------------
	sheetView: {
		width: '100%',
		height: '100%',
		alignItems: 'center',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		padding: 15,
	},
	sheetHeader: {
		width: '100%',
		alignItems: 'flex-end',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
	},
	attentionSheetHeader: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
	},
	attentionContent: {
		alignItems: 'center',
	},
	attentionBody: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		marginVertical: 20,
		textAlign: 'center',
	},
	attentionActions: {
		marginTop: 10,
	},
	gifContainer: {
		width: 180,
		height: 180,
	},
	gif: {
		width: '100%',
		height: '100%',
		resizeMode: 'contain',
	},
	confirmButton: {
		width: '100%',
		height: 52,
		backgroundColor: '#FCDE31',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 50,
	},
	cancleButton: {
		width: '100%',
		height: 52,
		backgroundColor: '#ffffff',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 50,
		marginTop: 10,
	},
	confirmLabel: {
		fontSize: 16,
		fontFamily: 'Poppins_700Bold',
	},

	sheetcloseButton: {
		width: 45,
		height: 45,
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	sheetHeading: {
		fontSize: 26,
		fontFamily: 'Poppins_700Bold',
		marginTop: 20,
	},
	attentionSheetHeading: {
		fontSize: 32,
		fontFamily: 'Poppins_700Bold',
		marginTop: 20,
	},
	sheetSubHeading: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		marginBottom: 10,
	},
	sheetInput: {
		width: '100%',
		height: 52,
		borderRadius: 20,
		paddingHorizontal: 20,
		marginTop: 20,
		fontFamily: 'Poppins_400Regular',
		fontSize: 16,
		borderWidth: 1,
	},
	sheetLoginButton: {
		width: '100%',
		height: 52,
		backgroundColor: '#FCDE31',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 50,
		marginTop: 20,
	},
	sheetLoginLabel: {
		fontSize: 16,
		fontFamily: 'Poppins_700Bold',
	},
	languageContainer: {
		marginTop: 10,
		paddingHorizontal: 10,
	},
	languageRow: {
		marginTop: 10,
		width: '100%',
		height: 50,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 12,
	},
	flagIcon: {
		width: 35.2,
		height: 22,
		marginRight: 10,
	},

	languageText: {
		flex: 1,
		fontSize: 18,
	},
	selectText: {
		flex: 1,
		fontSize: 14,
	},
	radioButton: {
		marginLeft: 10,
	},
});
