import { Text, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { TextInput } from 'react-native-gesture-handler';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { isWeb } from '@/constants/Constants';
import { TranslationKeys } from '@/locales/keys';

const SingleLineInput = ({
	id,
	value,
	onChange,
	error,
	isDisabled,
	custom_type,
	prefix,
	suffix,
}: {
	id: string;
	value: string;
	onChange: (id: string, value: string, custom_type: string) => void;
	error: string;
	isDisabled: boolean;
	custom_type: string;
	prefix: string | null | undefined;
	suffix: string | null | undefined;
}) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const flag = !suffix && !prefix;

	return (
		<View style={styles.container}>
			<View
				style={{
					...styles.inputContainer,
				}}
			>
				{prefix && (
					<View
						style={{
							...styles.prefix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>
							{prefix}
						</Text>
					</View>
				)}
				<TextInput
					style={[
						styles.input,
						flag
							? {
									width: '100%',
									borderRadius: 10,
								}
							: {
									width: isWeb ? '90%' : '80%',
								},
						{ color: theme.screen.text },
					]}
					cursorColor={theme.screen.text}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={text => onChange(id, text, custom_type)}
					value={value}
					editable={!isDisabled}
					enterKeyHint="next"
					placeholder={translate(TranslationKeys.type_here)}
				/>
				{suffix && (
					<View style={{ ...styles.suffix, backgroundColor: theme.screen.iconBg }}>
						<Text
							style={{
								...styles.label,
								width: isWeb ? '5%' : '10%',
								color: theme.screen.text,
							}}
						>
							{suffix}
						</Text>
					</View>
				)}
			</View>
		</View>
	);
};

export default SingleLineInput;
