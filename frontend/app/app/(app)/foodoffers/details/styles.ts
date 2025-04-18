import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  header: {
    width: '100%',
    height: 60,
    justifyContent: 'center',
    gap: 20,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  col1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  heading: {
    fontSize: 18,
    fontFamily: 'Poppins_400Regular',
  },
  featuredContainer: {
    width: '80%',
    gap: 10,
    padding: 10,
  },
  foodDetail: {
    alignItems: 'flex-start',
  },
  imageContainer: {
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  mobileImageContainer: {
    width: '100%',
    borderRadius: 25,
    position: 'relative',
  },
  overlay: {
    width: '100%',
    height: 350,
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 15,
    borderRadius: 25,
    justifyContent: 'space-between',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 25,
  },
  mobileFeaturedImage: {
    width: '100%',
    height: 350,
    resizeMode: 'cover',
    borderRadius: 25,
  },
  detailsContainer: {
    paddingVertical: 15,
    justifyContent: 'space-between',
  },
  mobileDetailsHeader: {
    width: '100%',
  },
  mobileDetailsFooter: {
    width: '100%',
    alignItems: 'flex-end',
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medium: {
    fontSize: 30,
    fontFamily: 'Poppins_400Regular',
  },
  mediumMobile: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  ratingView: {
    width: 110,
    height: 45,
    borderRadius: 50,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mobileRatingView: {
    width: 80,
    height: 35,
    borderRadius: 50,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  totalRating: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  mobileTotalRating: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  foodHeading: {
    fontFamily: 'Poppins_700Bold',
    marginTop: 10,
  },
  mobileFoodHeading: {
    width: '100%',
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 30,
    fontFamily: 'Poppins_700Bold',
    marginTop: 10,
  },
  ratingContainer: {
    width: '100%',
    backgroundColor: '#2E2E2E',
    paddingVertical: 5,
    paddingHorizontal: 20,
    borderRadius: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateUs: {
    fontSize: 18,
    fontFamily: 'Poppins_400Regular',
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mobileRatingContainer: {
    width: '100%',
    backgroundColor: '#2E2E2E',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  mobileRateUs: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  mobileStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  notificationContainer: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 25,
    marginTop: 20,
  },
  notificationBody: {
    fontFamily: 'Poppins_400Regular',
  },
  bellIconContainer: {
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCDE31',
  },
  bellIconAtiveContainer: {
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCDE31',
  },
  tabViewContainer: {
    gap: 20,
    marginTop: 30,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tab: {
    width: '32%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  activeTab: {
    backgroundColor: '#FCDE31',
    borderColor: '#FCDE31',
  },
  tabLabel: {
    fontFamily: 'Poppins_400Regular',
    color: '#ffffff',
  },
  activeLabel: {
    color: '#2E2E2E',
  },
  pagerView: {
    paddingVertical: 10,
  },
  sheetBackground: {
    borderTopRightRadius: 30,
    borderTopLeftRadius: 30,
  },
});
