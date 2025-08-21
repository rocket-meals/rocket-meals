import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		backgroundColor: '#F9F9F9',
		paddingTop: 50,
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
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 15,
		justifyContent: 'space-between',
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
	textIconEnd: {
		display: 'flex',
		flexDirection: 'row',
		gap: 10,
		alignItems: 'center',
	},

	textIcon: {
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
	},
	input: {
		width: '100%',
		borderRadius: 20,
		paddingHorizontal: 20,
		paddingVertical: 15,
		borderColor: '#d14510',
		marginTop: 10,
		fontFamily: 'Poppins_400Regular',
		fontSize: 18,
	},
});
