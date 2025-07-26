export interface SettingsListProps {
  leftIcon: React.ReactNode;
  title: string;
  value?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  iconBackgroundColor?: string;
  showSeparator?: boolean;
}
