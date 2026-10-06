import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
        list: {
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 20,
                gap: 2,
        },
        linkedElementsContainer: {
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 10,
                gap: 8,
        },
        linkedElementsTitle: {
                fontFamily: 'Poppins_600SemiBold',
                fontSize: 16,
        },
        linkedListWrapper: {
                borderRadius: 12,
                overflow: 'hidden',
        },
        linkedFoodImage: {
                width: '100%',
                height: '100%',
                borderRadius: 8,
        },
        messageItem: {
                maxWidth: '80%',
                gap: 4,
        },
        bubble: {
                padding: 10,
                borderRadius: 3,
        },
        initialMessageContainer: {
                borderWidth: 1,
                borderStyle: 'dashed',
                borderRadius: 8,
                padding: 10,
                gap: 4,
                marginBottom: 16,
        },
        initialMessageHeader: {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
        },
        initialMessageLabel: {
                fontSize: 12,
                fontFamily: 'Poppins_400Regular',
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
        scrollToEndButton: {
                position: 'absolute',
                right: 20,
                bottom: 80,
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 4,
        },
        linkedMoreInfoWrapper: {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
        },
        linkedMoreInfoText: {
                fontSize: 12,
                fontFamily: 'Poppins_400Regular',
                flexShrink: 1,
        },
});
