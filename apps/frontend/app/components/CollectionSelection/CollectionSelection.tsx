import {
	ActivityIndicator,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { isWeb } from '@/constants/Constants';
import { RootState } from '@/redux/reducer';

const CollectionSelection = ({
	id,
	value,
	onChange,
	error,
	isDisabled,
	loading,
	data,
	custom_type,
}: {
	id: string;
	value: any;
	onChange: (id: string, value: any, custom_type: string) => void;
	error: string;
	isDisabled: boolean;
	loading: boolean;
	data: any;
	custom_type: string;
}) => {
	const { theme } = useTheme();
	const { primaryColor } = useSelector((state: RootState) => state.settings);
	const parseValue = value ? value : null;
	const itemId = parseValue?.id;

	return (
		<View style={{ ...styles.container, borderColor: theme.screen.iconBg }}>
			{loading ? (
				<View
					style={{
						height: 100,
						width: '100%',
						justifyContent: 'center',
						alignItems: 'center',
					}}
				>
					<ActivityIndicator size={30} color={theme.screen.text} />
				</View>
			) : (
				<ScrollView
					nestedScrollEnabled={true}
					keyboardShouldPersistTaps="handled"
					scrollEventThrottle={16}
					contentContainerStyle={styles.scrollViewContent}
				>
					{data &&
						data?.length > 0 &&
						data.map((item: any) => {
							const isSelected = itemId === item.id;
							return (
								<TouchableOpacity
									key={item?.id}
									style={{
										...styles.row,
										paddingHorizontal: isWeb ? 20 : 10,

										backgroundColor: isSelected ? primaryColor : theme.screen.iconBg,
									}}
									disabled={isDisabled}
									onPress={() => {
										if (!isDisabled) {
											onChange(id, item, custom_type);
										}
									}}
								>
									<Text
										style={{
											...styles.text,
											color: isSelected ? theme.activeText : theme.header.text,
										}}
									>
										{item?.alias ? item?.alias : '-'}
									</Text>

									<MaterialCommunityIcons
										name={isSelected ? 'checkbox-marked' : 'checkbox-blank'}
										size={24}
										color={isSelected ? '#ffffff' : '#ffffff'}
										style={styles.radioButton}
									/>
								</TouchableOpacity>
							);
						})}
				</ScrollView>
			)}
		</View>
	);
};

export default CollectionSelection;
