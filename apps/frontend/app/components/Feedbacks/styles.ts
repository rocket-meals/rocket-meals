import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	heading: {
		fontSize: 26,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 20,
	},
	row: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginVertical: 10,
	},
	col: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	label: {
		fontFamily: 'Poppins_400Regular',
		marginTop: 2,
		marginLeft: 10,
	},
	dislikeButton: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: '#2E2E2E',
		justifyContent: 'center',
		alignItems: 'center',
	},
	searchContainer: {
		width: '100%',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 10,
		paddingRight: 10,
		marginVertical: 20,
	},
	input: {
		height: 50,
		borderRadius: 50,
		paddingHorizontal: 20,
		borderWidth: 0,
		borderColor: '#3A3A3A',
		fontFamily: 'Poppins_400Regular',
		fontSize: 18,
		color: 'white',
	},
	commentButton: {
		height: 50,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#FCDE31',
	},
	commentLabel: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	commentsContainer: {
		width: '100%',
	},
	commentsHeader: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	deleteButton: {
		width: 45,
		height: 45,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	comment: {
		width: '100%',
		marginVertical: 10,
	},
	commentText: {
		width: '100%',
		textAlign: 'left',
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	divider: {
		width: '100%',
		height: 1,
		backgroundColor: '#2e2e2e',
	},
	commentDate: {
		width: '100%',
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		fontStyle: 'italic',
		textAlign: 'right',
	},
	dummy: {},
});
