import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
        container: {
                width: '100%',
                borderWidth: 1,
                borderRadius: 12,
                paddingVertical: 12,
                borderColor: "#FF0000",
                marginTop: 16,
        },
        header: {
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
        },
        title: {
                fontSize: 16,
                fontWeight: '600',
                marginLeft: 8,
        },
        actionsContainer: {
                flexDirection: 'row',
                flexWrap: 'wrap',
                marginTop: 4,
                marginBottom: 8,
        },
        actionButton: {
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 10,
                borderWidth: 1,
                marginRight: 8,
                marginTop: 8,
        },
        actionIcon: {
                marginRight: 6,
        },
        actionLabel: {
                fontSize: 14,
                fontWeight: '500',
        },
        logsContainer: {
                marginTop: 8,
        },
        logText: {
                fontSize: 13,
                fontFamily: 'monospace',
                marginBottom: 4,
        },
        themeBackgroundRow: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 12,
        },
        themeBackgroundLabel: {
                fontSize: 13,
        },
        themeBackgroundSwatch: {
                width: 32,
                height: 32,
                borderWidth: 1,
                borderColor: '#FF0000',
        },
});

export default styles;
