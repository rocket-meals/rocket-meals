import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		padding: 20,
	},
	body: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		marginBottom: 30,
	},
	label: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	contentText: {
		color: '#ffffff',
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
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
	heading: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
	},
});
