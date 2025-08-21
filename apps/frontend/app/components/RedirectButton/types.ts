export interface RedirectButtonProps {
	type: 'email' | 'link';
	label: string;
	backgroundColor?: string;
	color?: string;
	onClick?: () => void;
}
