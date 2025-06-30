import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    width: '100%',
    height: '80%',
    borderRadius: 40,
    padding: 20,
    alignItems: 'flex-start',
  },
  modalHeader: {
    width: '100%',
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 50,
    height: 50,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeading: {
    fontSize: 36,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    width: '100%',
  },
});
