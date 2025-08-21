import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {
		alignItems: 'center',
	},
	section: {
		marginTop: 20,
		marginBottom: 40,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
		justifyContent: 'space-between',
		padding: 10,
		borderRadius: 10,
	},
	leftView: {
		maxWidth: '60%',
		flexDirection: 'row',
		alignItems: 'center',
	},

	linkText: {
		marginLeft: 10,
	},
	iconText: {
		marginRight: 10,
	},

	textIcon: {
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
	},
	groupHeading: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		marginTop: 20,
		marginBottom: 10,
	},
});
