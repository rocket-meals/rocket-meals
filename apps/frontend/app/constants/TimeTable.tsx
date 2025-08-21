import React from 'react';
import {
	Feather,
	FontAwesome5,
	MaterialCommunityIcons,
	MaterialIcons,
	Octicons,
} from '@expo/vector-icons';

const TimeTableData = (theme: any) => [
	{
		id: 1,
		leftIcon: (
			<MaterialCommunityIcons
				name="tag-text-outline"
				size={24}
				color={theme.screen.icon}
			/>
		),
		label: 'title',
		value: 'New',
		rightIcon: <FontAwesome5 name="pen" size={16} color={theme.screen.icon} />,
		handleFunction: () => {
			console.log('Title Information clicked');
		},
	},
	{
		id: 2,
		leftIcon: (
			<MaterialCommunityIcons
				name="tag-text-outline"
				size={24}
				color={theme.screen.icon}
			/>
		),
		label: 'location',
		value: 'Details',
		rightIcon: <FontAwesome5 name="pen" size={16} color={theme.screen.icon} />,
		handleFunction: () => {
			console.log('Calendar Details clicked');
		},
	},
	{
		id: 3,
		leftIcon: (
			<MaterialIcons name="color-lens" size={24} color={theme.screen.icon} />
		),
		label: 'color',
		value: '#fe0000',
		rightIcon: <FontAwesome5 name="pen" size={16} color={theme.screen.icon} />,
		handleFunction: () => {
			console.log('Calendar Details clicked');
		},
	},
	{
		id: 4,
		leftIcon: (
			<MaterialCommunityIcons
				name="clock-start"
				size={24}
				color={theme.screen.icon}
			/>
		),
		label: 'startTime',
		value: '08:00',
		rightIcon: <FontAwesome5 name="pen" size={16} color={theme.screen.icon} />,
		handleFunction: () => {
			console.log('Calendar Details clicked');
		},
	},
	{
		id: 5,
		leftIcon: (
			<MaterialCommunityIcons
				name="clock-end"
				size={24}
				color={theme.screen.icon}
			/>
		),
		label: 'endTime',
		value: '10:00',
		rightIcon: <FontAwesome5 name="pen" size={16} color={theme.screen.icon} />,
		handleFunction: () => {
			console.log('Calendar Details clicked');
		},
	},
	{
		id: 6,
		leftIcon: <Feather name="calendar" size={24} color={theme.screen.icon} />,
		label: 'weekday',
		value: { id: 'monday', name: 'Mon' },
		rightIcon: (
			<Octicons name="chevron-right" size={24} color={theme.screen.icon} />
		),
		handleFunction: () => {
			console.log('Calendar Details clicked');
		},
	},
];

export default TimeTableData;
