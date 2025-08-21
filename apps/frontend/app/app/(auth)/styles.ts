import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	mainContainer: {
		flex: 1,
	},
	contentContainer: {
		width: '100%',
		minHeight: '100%',
		flexDirection: 'row',
	},
	loginContainer: {
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	webContainer: {
		width: '60%',
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 10,
	},
	webTitleContainer: {
		width: '100%',
		alignItems: 'center',
		marginBottom: 20,
	},
	detailedContentContainer: {
		width: '100%',
		alignItems: 'center',
		marginTop: 10,
	},
	title: {
		fontSize: 34,
		fontFamily: 'Poppins_700Bold',
		letterSpacing: 2,
		textAlign: 'center',
	},
	subTitle: {
		width: '80%',
		textAlign: 'center',
		fontFamily: 'Poppins_200ExtraLight',
		letterSpacing: 1,
	},
	webBody: {
		width: '100%',
		fontSize: 14,
		textAlign: 'center',
		fontFamily: 'Poppins_400Regular',
		letterSpacing: 1,
	},
});
