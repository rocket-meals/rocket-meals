import { ScrollView, View } from 'react-native';
import AppLoadingView from '@/components/AppLoadingView';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector } from '@/redux/hooks';
import { isWeb } from '@/constants/Constants';
import AppButton from '@/components/AppButton';

const CollectionSelection = ({ id, value, onChange, error, isDisabled, loading, data, custom_type }: { id: string; value: any; onChange: (id: string, value: any, custom_type: string) => void; error: string; isDisabled: boolean; loading: boolean; data: any; custom_type: string }) => {
	const { theme } = useTheme();
	const { primaryColor } = useAppSelector((state) => state.settings);
	const parseValue = value ? value : null;
	const itemId = parseValue?.id;

	return (
		<View style={{ ...styles.container, borderColor: theme.screen.iconBg }}>
			{loading ? (
				<AppLoadingView height={100} />
			) : (
				<ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" scrollEventThrottle={16} contentContainerStyle={styles.scrollViewContent}>
					{data &&
						data?.length > 0 &&
						data.map((item: any) => {
							const isSelected = itemId === item.id;
							return (
								<AppButton
									key={item?.id}
									variant="ghost"
									usePlainText
									text={item?.alias ? item?.alias : '-'}
									style={[
										{
											...styles.row,
											paddingHorizontal: isWeb ? 20 : 10,
											backgroundColor: isSelected ? primaryColor : theme.screen.iconBg,
											marginVertical: 0,
										},
									]}
									textStyle={[
										{
											...styles.text,
											color: isSelected ? theme.activeText : theme.header.text,
										},
									]}
									iconRight={<MaterialCommunityIcons name={isSelected ? 'checkbox-marked' : 'checkbox-blank'} size={24} color="#ffffff" style={styles.radioButton} />}
									disabled={isDisabled}
									onPress={() => {
										if (!isDisabled) {
											onChange(id, item, custom_type);
										}
									}}
								/>
							);
						})}
				</ScrollView>
			)}
		</View>
	);
};

export default CollectionSelection;
