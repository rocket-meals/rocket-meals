export interface FeedbackResponse {
	title?: string;
	content?: string;
	contact_email?: string;
	device_brand?: string;
	device_system_version?: string;
	device_platform?: string;
	display_height?: number;
	display_width?: number;
	display_fontscale?: number;
	display_pixelratio?: number;
	display_scale?: number;
	positive?: boolean;
	profile?: string;
	[key: string]: string | number | boolean | undefined;
}
