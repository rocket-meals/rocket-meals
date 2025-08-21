export interface ManagementModalProps {
	isVisible: boolean;
	setIsVisible: React.Dispatch<React.SetStateAction<boolean>>;
	handleLogin: (
		token: string | undefined,
		email: string,
		password: string
	) => void;
	loading: boolean;
}

export interface FormProps {
	openSheet: () => void;
	openAttentionSheet: () => void;
	onSuccess: (token: string) => void;
	providers: any;
}

export interface SheetProps {
	closeSheet: () => void;
	handleLogin: (
		token: string | undefined,
		email: string,
		password: string
	) => void;
	loading: boolean;
}

export interface AttentionSheetProps {
	closeSheet: () => void;
	handleLogin: () => void;
	isBottomSheetVisible: boolean;
}
