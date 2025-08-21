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
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	col2: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	col3: {
		backgroundColor: 'red',
	},
	icon: {
		width: 30,
		height: 30,
		resizeMode: 'contain',
	},
	label: {
		fontFamily: 'Poppins_400Regular',
		flexShrink: 1,
		flexWrap: 'wrap',
		flex: 1,
		textAlignVertical: 'center',
	},
	labelContainer: {
		flexShrink: 1,
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
	shortCode: {
		height: 30,
		paddingHorizontal: 4,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#2E2E2E',
		justifyContent: 'center',
		alignItems: 'center',
	},
});
