import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F9F9F9',
		paddingTop: 20,
	},
	section: {
		marginTop: 20,
		marginBottom: 40,
	},
	sectionHeader: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	deleteInfoContainer: {
		marginBottom: 10,
	},
	deleteInfo: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'left',
	},
	list: {
		width: '100%',
		height: 50,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 12,
	},
	col: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	label: {
		fontFamily: 'Poppins_400Regular',
		fontSize: 16,
	},
	value: {
		fontFamily: 'Poppins_400Regular',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 15,
		justifyContent: 'space-between',
		padding: 10,
		borderRadius: 10,
	},
	leftView: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	linkText: {
		marginLeft: 10,
	},
	iconText: {
		marginRight: 10,
	},
	imageContainer: {
		width: 170,
		height: 170,
		marginBottom: 20,
		justifyContent: 'center',
		alignItems: 'center',
	},
	image: {
		width: '100%',
		height: '100%',
		resizeMode: 'contain',
	},
	textIcon: {
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
	},
	deleteAccountContent: {
		width: '100%',
		marginTop: 10,
		alignItems: 'center',
	},
	gifContainer: {
		width: 100,
		height: 100,
	},
	deleteYourAccount: {
		fontSize: 20,
		fontFamily: 'Poppins_400Regular',
		marginTop: 10,
		textAlign: 'center',
	},
	attentionActions: {
		width: '100%',
		marginTop: 10,
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
});
