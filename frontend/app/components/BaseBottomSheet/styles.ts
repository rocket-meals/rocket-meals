import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
});
