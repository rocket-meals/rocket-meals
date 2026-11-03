import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		width: '100%',
	},
	heading: {
		fontWeight: '600',
		marginBottom: 8,
	},
	headingLevel1: {
		fontSize: 24,
	},
	headingLevelOther: {
		fontSize: 20,
	},
	inlineLink: {
		textDecorationLine: 'underline',
		fontWeight: '600',
	},
	section: {
		marginTop: 10,
	},
	imageWrapper: {
		width: '100%',
		alignItems: 'center',
		marginVertical: 10,
	},
	imageErrorBox: {
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 10,
		marginVertical: 10,
	},
	imageErrorText: {
		fontSize: 12,
		textAlign: 'center',
		fontStyle: 'italic',
	},
});
