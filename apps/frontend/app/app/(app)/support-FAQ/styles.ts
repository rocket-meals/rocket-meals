import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
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
	groupHeading: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		marginTop: 20,
		marginBottom: 10,
	},
});
