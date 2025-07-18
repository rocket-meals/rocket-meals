import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Modal from 'react-native-modal';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export interface BaseBottomModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
}

const BaseBottomModal: React.FC<BaseBottomModalProps> = ({ visible, onClose, title, children }) => {
  const { theme } = useTheme();

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.current = event.nativeEvent.contentOffset.y;
  };

  const handleScrollTo = (p: number) => {
    scrollViewRef.current?.scrollTo({ y: p, animated: false });
  };

  return (
    <Modal
      isVisible={visible}
      style={styles.modalContainer}
      onBackdropPress={onClose}
      backdropOpacity={0.5}
      swipeDirection="down"
      onSwipeComplete={onClose}
      propagateSwipe
      scrollTo={handleScrollTo}
      scrollOffset={scrollOffset.current}
      scrollOffsetMax={Dimensions.get('window').height}
    >
      <View style={[styles.sheet, { backgroundColor: theme.sheet.sheetBg }]}>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: theme.sheet.closeBg }]}
          onPress={onClose}
        >
          <AntDesign name="close" size={24} color={theme.sheet.closeIcon} />
        </TouchableOpacity>
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: theme.sheet.closeBg }]} />
        </View>
        {title && <Text style={[styles.title, { color: theme.sheet.text }]}>{title}</Text>}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default BaseBottomModal;

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  sheet: {
    height: Dimensions.get('window').height * 0.8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 10,
  },
  handleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    width: 45,
    height: 45,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 10,
    top: 10,
  },
  handle: {
    width: '30%',
    height: 6,
    borderRadius: 3,
    alignSelf: 'center',
  },
  title: {
    marginTop: 60,
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    gap: 20,
    alignItems: 'center',
    padding: 20,
  },
});
