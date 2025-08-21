import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	list: {
		padding: 20,
		gap: 10,
	},
	messageItem: {
		maxWidth: '80%',
		gap: 4,
	},
	bubble: {
		padding: 10,
		borderRadius: 3,
	},
	timestamp: {
		fontSize: 12,
		fontFamily: 'Poppins_400Regular',
		marginTop: 2,
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		padding: 10,
		gap: 10,
	},
	textInput: {
		flex: 1,
		minHeight: 40,
		maxHeight: 120,
		borderWidth: 1,
		borderRadius: 5,
		paddingHorizontal: 10,
		fontFamily: 'Poppins_400Regular',
	},
	sendButton: {
		padding: 10,
		borderRadius: 5,
	},
	oldMessageContainer: {
		paddingHorizontal: 20,
		paddingBottom: 10,
		gap: 10,
	},
	oldMessageText: {
		fontFamily: 'Poppins_400Regular',
	},
});
