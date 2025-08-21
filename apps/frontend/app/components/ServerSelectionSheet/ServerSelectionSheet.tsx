import React from 'react';
import { Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { isWeb } from '@/constants/Constants';
import styles from './styles';
import ServerOption from '@/components/ServerOption/ServerOption';
import {
	CustomerConfig,
	devConfig,
	studiFutterConfig,
	swosyConfig,
} from '@/config';
import { TranslationKeys } from '@/locales/keys';

export interface ServerSelectionSheetProps {
	closeSheet: () => void;
	selectedServer: string;
	onSelect: (config: CustomerConfig) => void;
}

const ServerSelectionSheet: React.FC<ServerSelectionSheetProps> = ({
	closeSheet,
	selectedServer,
	onSelect,
}) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const servers: CustomerConfig[] = [devConfig, swosyConfig, studiFutterConfig];

	return (
		<BottomSheetScrollView
			style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
			contentContainerStyle={styles.contentContainer}
		>
			<View
				style={{
					...styles.sheetHeader,
					paddingRight: isWeb ? 10 : 0,
					paddingTop: isWeb ? 10 : 0,
				}}
			>
				<View />
				<Text
					style={{
						...styles.sheetHeading,
						fontSize: isWeb ? 40 : 28,
						color: theme.sheet.text,
					}}
				>
					{translate(TranslationKeys.backend_server)}
				</Text>
			</View>
			<View style={styles.optionsContainer}>
				{servers.map(srv => (
					<ServerOption
						key={srv.projectSlug}
						server={srv}
						isSelected={selectedServer === srv.server_url}
						onPress={() => {
							onSelect(srv);
							closeSheet();
						}}
					/>
				))}
			</View>
		</BottomSheetScrollView>
	);
};

export default ServerSelectionSheet;
