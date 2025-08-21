import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		marginTop: 20,
		fontFamily: 'Arial, sans-serif',
		width: '100%',
		display: 'flex',
		alignItems: 'center',
	},
	section: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 10,
		borderRadius: 5,
	},
	textIcon: {
		display: 'flex',
		alignItems: 'center',
	},
	iconText: { flexDirection: 'row', alignItems: 'center' },

	extandContainer: {
		marginTop: 10,
		color: '#555',
	},
	detailText: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
		marginBottom: 5,
		marginTop: 10,
	},
});
