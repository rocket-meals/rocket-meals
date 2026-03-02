import { Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from '../FilterFormSheet/styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { FontAwesome5 } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { FormSubmissionSortOption, FormSubmissionSortSheetProps } from './types';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';

const SORTING_OPTIONS: { id: FormSubmissionSortOption; label: TranslationKeys; icon: React.ReactElement }[] = [
	{
		id: 'alphabetical',
		label: TranslationKeys.sort_option_alphabetical,
		icon: <FontAwesome5 name="sort-alpha-down" size={24} />,
	},
];

const FormSubmissionSortSheet: React.FC<FormSubmissionSortSheetProps> = ({ closeSheet, selectedOption, setSelectedOption }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor } = useSelector((state: RootState) => state.settings);

	const updateSort = (option: FormSubmissionSortOption) => {
		setSelectedOption(option);
		closeSheet();
	};

	return (
		<BottomSheetScrollView style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }} contentContainerStyle={styles.contentContainer}>
			<View
				style={{
					...styles.sheetHeader,
					paddingRight: isWeb ? 10 : 0,
					paddingTop: isWeb ? 10 : 0,
				}}
			>
				<View style={{ width: 50 }} />
				<Text
					style={{
						...styles.sheetHeading,
						fontSize: isWeb ? 40 : 28,
						color: theme.sheet.text,
					}}
				>
					{translate(TranslationKeys.sort)}
				</Text>
			</View>
			<View style={styles.sortingListContainer}>
				{SORTING_OPTIONS.map(option => (
					<TouchableOpacity
						key={option.id}
						style={[
							styles.actionItem,
							selectedOption === option.id
								? {
										backgroundColor: primaryColor,
									}
								: {
										backgroundColor: theme.screen.iconBg,
									},
						]}
						onPress={() => updateSort(option.id)}
					>
						<View style={styles.col}>
							{React.cloneElement(
								option.icon,
								selectedOption === option.id
									? {
											color: theme.activeText,
										}
									: { color: theme.screen.icon }
							)}
							<Text
								style={[
									styles.label,
									selectedOption === option.id
										? {
												color: theme.activeText,
											}
										: { color: theme.screen.text },
								]}
							>
								{translate(option.label)}
							</Text>
						</View>
						<Checkbox style={styles.checkbox} value={selectedOption === option.id} color={selectedOption === option.id ? '#000000' : undefined} />
					</TouchableOpacity>
				))}
			</View>
		</BottomSheetScrollView>
	);
};

export default FormSubmissionSortSheet;
