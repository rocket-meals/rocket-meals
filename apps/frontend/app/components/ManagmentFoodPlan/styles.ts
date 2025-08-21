import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	mainContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		alignSelf: 'center',
		marginVertical: 10,
		padding: 15,
		borderRadius: 10,
		width: '90%',
	},
	iconTextContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	sheetBackground: {
		borderTopRightRadius: 30,
		borderTopLeftRadius: 30,
	},
	sheetView: {
		width: '100%',
		height: '100%',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		padding: 10,
		paddingBottom: 0,
	},
	contentContainer: {
		alignItems: 'flex-start',
		paddingBottom: 20,
	},
	textInput: {
		marginRight: 10,
		textAlign: 'right',
	},
});
