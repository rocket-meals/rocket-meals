import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    gap: 0,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  input: {
    height: 50,
    paddingHorizontal: 20,
    fontFamily: 'Poppins_400Regular',
    borderWidth: 1,
    outline: 'none',
    outlineColor: 'transparent',
    borderColor: '#3A3A3A',
    fontSize: 16,
  },
  prefix: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  suffix: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  dummy: {},
});
