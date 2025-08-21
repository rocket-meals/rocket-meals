import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {},
	content: {
		width: '100%',
		height: '100%',
		padding: 20,
	},
	heading: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 10,
	},
	listItem: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10,
		padding: 10,
		marginVertical: 10,
	},
	body: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	debugLogContainer: {
		maxHeight: 120,
		marginTop: 10,
		borderWidth: 1,
		borderColor: 'lightgray',
		padding: 5,
	},
	debugLogText: {
		fontSize: 12,
		color: 'gray',
	},
});
