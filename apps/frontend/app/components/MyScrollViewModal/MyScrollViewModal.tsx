import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { BottomSheetFlatList, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface MyScrollViewModalProps {
  title?: string;
  closeSheet?: () => void;
  backgroundColor?: string;
  children?: ReactNode;
  // For FlatList mode
  useFlatList?: boolean;
  data?: any[];
  renderItem?: (info: { item: any; index: number }) => ReactNode;
  keyExtractor?: (item: any, index: number) => string;
  ListHeaderComponent?: ReactNode;
  ListFooterComponent?: ReactNode;
  // Optional additional props
  showsVerticalScrollIndicator?: boolean;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  onClose?: () => void;
}

const MyScrollViewModal: React.FC<MyScrollViewModalProps> = ({
  title,
  children,
  useFlatList = false,
  backgroundColor,
  data = [],
  renderItem,
  keyExtractor,
  ListHeaderComponent,
  ListFooterComponent,
  showsVerticalScrollIndicator = true,
  keyboardShouldPersistTaps = 'handled',
  onClose,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const resolvedBackgroundColor = backgroundColor ?? theme.screen.background;

  React.useEffect(() => () => onClose?.(), [onClose]);

  const headerComponent = (
    <>
      {title && (
        <View
          style={{ backgroundColor: resolvedBackgroundColor, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.sheet.text }}>{title}</Text>
        </View>
      )}
      {ListHeaderComponent}
    </>
  );

  const footerComponent = ListFooterComponent || <View style={{ height: Math.max(24, insets.bottom + 16) }} />;

  const contentStyle = { paddingBottom: 24 + insets.bottom, paddingHorizontal: 20 };
  const scrollInsets = { bottom: insets.bottom };

  const containerStyle = { backgroundColor: resolvedBackgroundColor };

  if (useFlatList && renderItem && keyExtractor) {
    return (
      <BottomSheetFlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={headerComponent}
        ListFooterComponent={footerComponent}
        style={containerStyle}
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        scrollIndicatorInsets={scrollInsets}
      />
    );
  }

  return (
    <BottomSheetScrollView
      style={containerStyle}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      scrollIndicatorInsets={scrollInsets}
    >
      {headerComponent}
      {children}
      {footerComponent}
    </BottomSheetScrollView>
  );
};

export default MyScrollViewModal;
