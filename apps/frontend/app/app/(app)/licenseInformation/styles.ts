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
	linkRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 8,
	},
	linkRowRtl: {
		flexDirection: 'row-reverse',
	},
	linkIconLabel: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	linkIconLabelRtl: {
		flexDirection: 'row-reverse',
	},
	linkIconWrap: {
		marginRight: 8,
	},
	linkIconWrapRtl: {
		marginRight: 0,
		marginLeft: 8,
	},
	linkLabel: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		flex: 1,
	},
	linkValueWrap: {
		flexShrink: 1,
		marginLeft: 8,
	},
	linkValue: {
		fontSize: 14,
		fontFamily: 'Poppins_700Bold',
		textAlign: 'right',
	},
});
