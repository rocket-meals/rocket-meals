import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	header: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		padding: 10,
	},
	closeButton: {
		width: 45,
		height: 45,
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	handle: {
		width: '30%',
		height: 6,
		borderRadius: 3,
		marginHorizontal: 10,
		alignSelf: 'center',
	},
	placeholder: {
		width: 45,
		height: 45,
	},
});
