declare module '*.svg' {
	import React from 'react';
	import { SvgProps } from 'react-native-svg';
	const content: React.FC<SvgProps>;
	export default content;
}

declare module '*.html' {
	const content: number;
	export default content;
}

declare module '*.png' {
	const value: any;
	export default value;
}

// Metro treats these as opaque binary assets (see metro.config.js `assetExts`).
// Used to bundle TFJS model weight shards locally via `bundleResourceIO`.
declare module '*.bin' {
	const value: number;
	export default value;
}
