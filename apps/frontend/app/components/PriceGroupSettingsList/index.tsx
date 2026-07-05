import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { FontAwesome, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAppSelector } from '@/redux/hooks';
import { TranslationKeys } from '@/locales/keys';
import { PriceGroupKey } from '@/app/(app)/settings/types';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { UserHelper } from '@/helper/UserHelper';
import { UPDATE_PROFILE } from '@/redux/Types/types';
import { DatabaseTypes } from 'repo-depkit-common';
import SettingsList from '@/components/SettingsList';

interface PriceGroupSettingsListProps {
	onSelect?: (priceGroup: string) => void;
}

const PriceGroupSettingsList = ({ onSelect }: PriceGroupSettingsListProps) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const { primaryColor } = useAppSelector((state) => state.settings);
	const { user, profile } = useAppSelector((state) => state.authReducer);
	const isRegisteredUser = UserHelper.isRegisteredUser(user);
	const profileHelper = new ProfileHelper();

	const [selectedOption, setSelectedOption] = useState<string | null>(profile?.price_group || PriceGroupKey.student);

	useEffect(() => {
		setSelectedOption(profile?.price_group || PriceGroupKey.student);
	}, [profile]);

	const options = [
		{
			id: PriceGroupKey.student,
			label: translate(TranslationKeys.price_group_student),
			icon: <FontAwesome name="graduation-cap" size={24} color={theme.screen.icon} />,
		},
		{
			id: PriceGroupKey.employee,
			label: translate(TranslationKeys.price_group_employee),
			icon: <Ionicons name="bag" size={24} color={theme.screen.icon} />,
		},
		{
			id: PriceGroupKey.guest,
			label: translate(TranslationKeys.price_group_guest),
			icon: <FontAwesome5 name="users" size={24} color={theme.screen.icon} />,
		},
	];

	const handleSelect = useCallback(async (option: string) => {
		try {
			setSelectedOption(option);
			const payload = { ...profile, price_group: option };
			if (isRegisteredUser) {
				const result = (await profileHelper.updateProfile(payload)) as DatabaseTypes.Profiles;
				if (result) {
					dispatch({ type: UPDATE_PROFILE, payload: result });
				}
			} else {
				dispatch({ type: UPDATE_PROFILE, payload });
			}
			onSelect?.(option);
		} catch (error) {
			console.error('Error updating price group:', error);
			setSelectedOption(profile?.price_group || PriceGroupKey.student);
		}
	}, [profile, isRegisteredUser, profileHelper, dispatch, onSelect]);

	return (
		<View style={{ width: '100%' }}>
			{options.map((option, index) => {
				const isSelected = selectedOption === option.id;
				const groupPosition =
					options.length === 1
						? 'single'
						: index === 0
							? 'top'
							: index === options.length - 1
								? 'bottom'
								: 'middle';

				return (
					<SettingsList
						key={option.id}
						label={option.label}
						leftIcon={option.icon}
						iconBgColor={primaryColor}
						groupPosition={groupPosition}
						showSeparator={index !== options.length - 1}
						rightIcon={
							<MaterialCommunityIcons
								name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
								size={24}
								color={isSelected ? primaryColor : theme.screen.icon}
							/>
						}
						handleFunction={() => handleSelect(option.id)}
					/>
				);
			})}
		</View>
	);
};

export default PriceGroupSettingsList;
