export interface AppButtonProps {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: any;
  labelStyle?: any;
  backgroundColor?: string;
  textColor?: string;
  disabled?: boolean;
  useProjectColor?: boolean;
}
