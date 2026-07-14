import { StyleSheet } from 'react-native';

export const CARTOON_AVATAR_IMAGE_SIZE = 128;

export default StyleSheet.create({
	container: {
		width: '100%',
		alignItems: 'center',
		padding: 16,
		gap: 16,
	},
	description: {
		textAlign: 'center',
		fontSize: 14,
	},
	buttonRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 10,
	},
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 8,
	},
	buttonText: {
		fontWeight: '600',
	},
	imagesRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 24,
		marginTop: 8,
	},
	imageColumn: {
		alignItems: 'center',
		gap: 8,
	},
	image: {
		width: CARTOON_AVATAR_IMAGE_SIZE,
		height: CARTOON_AVATAR_IMAGE_SIZE,
		borderRadius: 12,
	},
	imageLabel: {
		fontSize: 12,
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	statusText: {
		fontSize: 13,
	},
	errorText: {
		fontSize: 13,
		textAlign: 'center',
	},
	licenseNotice: {
		fontSize: 11,
		textAlign: 'center',
		opacity: 0.7,
		marginTop: 4,
	},
});
