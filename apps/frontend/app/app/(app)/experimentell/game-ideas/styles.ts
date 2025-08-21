import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		padding: 20,
		gap: 10,
	},
	heading: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 10,
	},
	subheading: {
		fontSize: 18,
		fontFamily: 'Poppins_600SemiBold',
		marginVertical: 10,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginBottom: 10,
	},
	button: {
		padding: 10,
		borderRadius: 10,
		minWidth: 120,
		alignItems: 'center',
	},
	result: {
		fontSize: 20,
		textAlign: 'center',
	},
	memoryContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		marginBottom: 10,
	},
	memoryCard: {
		width: '19%',
		aspectRatio: 1,
		margin: '0.5%',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 8,
	},
});
