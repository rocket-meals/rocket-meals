import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
        container: {
                width: 140,
                height: 140,
                borderWidth: 1,
                borderRadius: 16,
                overflow: 'hidden',
                justifyContent: 'center',
                alignItems: 'center',
        },
        image: {
                width: '90%',
                height: '90%',
        },
        collectedOverlay: {
                position: 'absolute',
                inset: 0,
                opacity: 0.18,
        },
        loadingOverlay: {
                position: 'absolute',
                inset: 0,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.25)',
        },
        counter: {
                position: 'absolute',
                bottom: 10,
                right: 10,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
        },
        counterText: {
                fontWeight: '600',
        },
});

export default styles;
