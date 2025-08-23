import React from 'react';
import { View, Dimensions } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface SkeletonLoaderProps {
	width?: number | string;
	height?: number;
	borderRadius?: number;
	style?: any;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
	width = '100%', 
	height = 20, 
	borderRadius = 4,
	style
}) => {
	const { theme } = useTheme();
	
	return (
		<View
			style={[
				{
					width,
					height,
					borderRadius,
					backgroundColor: theme.screen.iconBg,
					opacity: 0.7,
				},
				style
			]}
		/>
	);
};

interface FoodItemSkeletonProps {
	screenWidth?: number;
}

export const FoodItemSkeleton: React.FC<FoodItemSkeletonProps> = ({ screenWidth = Dimensions.get('window').width }) => {
	const { theme } = useTheme();
	const isLargeScreen = screenWidth > 1000;
	const isMediumScreen = screenWidth > 700;
	const isSmallScreen = screenWidth > 460;

	const cardWidth = isLargeScreen ? 300 : isMediumScreen ? 280 : isSmallScreen ? 250 : 220;
	const cardHeight = isLargeScreen ? 200 : isMediumScreen ? 180 : 160;

	return (
		<View
			style={{
				width: cardWidth,
				height: cardHeight + 60, // Extra space for text
				backgroundColor: theme.card.background,
				borderRadius: 12,
				padding: 8,
				marginBottom: 16,
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 4,
				elevation: 3,
			}}
		>
			{/* Image skeleton */}
			<SkeletonLoader
				width="100%"
				height={cardHeight}
				borderRadius={8}
				style={{ marginBottom: 8 }}
			/>
			
			{/* Title skeleton */}
			<SkeletonLoader
				width="80%"
				height={16}
				style={{ marginBottom: 4 }}
			/>
			
			{/* Subtitle skeleton */}
			<SkeletonLoader
				width="60%"
				height={12}
			/>
		</View>
	);
};

interface FoodDetailSkeletonProps {}

export const FoodDetailSkeleton: React.FC<FoodDetailSkeletonProps> = () => {
	const { theme } = useTheme();

	return (
		<View style={{ 
			flex: 1, 
			backgroundColor: theme.screen.background,
			padding: 16
		}}>
			{/* Header skeleton */}
			<View style={{
				flexDirection: 'row',
				justifyContent: 'space-between',
				alignItems: 'center',
				marginBottom: 16
			}}>
				<SkeletonLoader width={40} height={40} borderRadius={20} />
				<SkeletonLoader width={120} height={24} />
				<SkeletonLoader width={40} height={40} borderRadius={20} />
			</View>

			{/* Image skeleton */}
			<SkeletonLoader
				width="100%"
				height={250}
				borderRadius={12}
				style={{ marginBottom: 16 }}
			/>

			{/* Title skeleton */}
			<SkeletonLoader
				width="70%"
				height={24}
				style={{ marginBottom: 8 }}
			/>

			{/* Rating skeleton */}
			<View style={{
				flexDirection: 'row',
				alignItems: 'center',
				marginBottom: 16
			}}>
				<SkeletonLoader width={80} height={20} style={{ marginRight: 8 }} />
				<SkeletonLoader width={60} height={20} />
			</View>

			{/* Tabs skeleton */}
			<View style={{
				flexDirection: 'row',
				marginBottom: 16
			}}>
				<SkeletonLoader width={80} height={32} borderRadius={16} style={{ marginRight: 8 }} />
				<SkeletonLoader width={80} height={32} borderRadius={16} style={{ marginRight: 8 }} />
				<SkeletonLoader width={80} height={32} borderRadius={16} />
			</View>

			{/* Content skeleton */}
			<View style={{ flex: 1 }}>
				<SkeletonLoader width="100%" height={20} style={{ marginBottom: 8 }} />
				<SkeletonLoader width="85%" height={20} style={{ marginBottom: 8 }} />
				<SkeletonLoader width="92%" height={20} style={{ marginBottom: 8 }} />
				<SkeletonLoader width="78%" height={20} style={{ marginBottom: 16 }} />
				
				<SkeletonLoader width="100%" height={20} style={{ marginBottom: 8 }} />
				<SkeletonLoader width="70%" height={20} style={{ marginBottom: 8 }} />
			</View>
		</View>
	);
};

export default SkeletonLoader;