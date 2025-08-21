import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		width: '100%',
		height: '100%',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		padding: 10,
		paddingBottom: 0,
		alignItems: 'center',
	},
	sheetHeader: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
	},
	sheetcloseButton: {
		width: 45,
		height: 45,
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	sheetHeading: {
		fontFamily: 'Poppins_700Bold',
	},
	calendarView: {
		justifyContent: 'center',
		borderRadius: 12,
	},
	calendar: {
		width: '100%',
		height: '100%',
		borderRadius: 12,
	},
	customHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 20,
	},
	calendarAction: {
		height: 45,
		width: 45,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	monthTitle: {
		width: '100%',
		fontSize: 18,
		fontWeight: 'bold',
	},
});
