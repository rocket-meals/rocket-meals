import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	row: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginVertical: 10,
	},
	col: {
		width: '60%',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	col2: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	icon: {
		width: 30,
		height: 30,
		resizeMode: 'cover',
		borderRadius: 25,
	},
	label: {
		fontFamily: 'Poppins_400Regular',
	},
	likeButton: {
		padding: 12,
		borderWidth: 1,
		borderTopLeftRadius: 5,
		borderBottomLeftRadius: 5,
		borderColor: '#2E2E2E',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	dislikeButton: {
		padding: 12,
		borderWidth: 1,
		borderTopRightRadius: 5,
		borderBottomRightRadius: 5,
		borderColor: '#2E2E2E',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	count: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		marginLeft: 10,
	},
});
