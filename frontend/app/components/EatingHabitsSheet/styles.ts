import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  sheetView: {
    width: '100%',
    flex: 1,
    borderTopRightRadius: 28,
    borderTopLeftRadius: 28,
    padding: 10,
    paddingBottom: 0,
  },
  contentContainer: {
    alignItems: 'center',
  },
  sheetHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    marginLeft: 30,
  },
  eatingHabitsList: {
    width: '90%',
    paddingHorizontal: 10,
    marginTop: 20,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'grey',
    // paddingLeft: 35,
  },
});
