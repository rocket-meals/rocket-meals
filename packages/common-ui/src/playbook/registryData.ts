/**
 * registryData.ts – serializable part of the component playbook registry.
 *
 * This file intentionally contains NO JSX and NO react imports so that
 * Node-based tooling (e.g. the Maestro test generator in
 * `apps/frontend/maestro-tests`, whose tsconfig has no `jsx` support) can
 * import it directly. The runtime part (components, variants, callback
 * bindings) lives in `registry.tsx` and merges this data by entry name.
 *
 * Every entry describes one common-ui component and its "knobs": the props
 * that can be tweaked live in the playbook screen and passed via URL query
 * parameters, e.g. `/experimentell/playbook/SettingsListBoolean?isEnabled=false`.
 */

export type KnobValue = string | number | boolean;

export type KnobType = 'text' | 'boolean' | 'number' | 'select';

export interface KnobDefinition {
	type: KnobType;
	defaultValue: KnobValue;
	/** Allowed values, required for `type: 'select'`. */
	options?: string[];
	/** Display label in the knob panel. Defaults to the knob name. */
	label?: string;
	/**
	 * When false the raw knob value is NOT spread onto the component as a prop
	 * of the same name – instead `bindProps` in `registry.tsx` maps it (e.g. a
	 * `'unset' | 'yes' | 'no'` select knob mapped to a `boolean | null` prop).
	 * Defaults to true.
	 */
	passAsProp?: boolean;
}

export interface PlaybookEntryData {
	/** Component name – used as URL segment and display name. */
	name: string;
	description?: string;
	knobs: Record<string, KnobDefinition>;
}

const MARKDOWN_DEMO_CONTENT = `# Markdown Playbook Demo

Regular paragraph with **bold**, *italic* and a [plain link](https://example.com).

## Contact

- [Write us](mailto:info@example.com)
- [Call us](tel:+491702215430)
- [Find us](geo:52.283,8.023)

## Table

| Feature | Supported |
| --- | --- |
| Tables | yes |
| Images | yes |
| Buttonized links | yes |

## Image

![Placeholder image](https://picsum.photos/seed/playbook/400/200)

### Nested section

This paragraph is inside a section nested one level deeper.
`;

const GROUP_POSITION_KNOB: KnobDefinition = {
	type: 'select',
	defaultValue: 'single',
	options: ['single', 'top', 'middle', 'bottom'],
	label: 'groupPosition',
};

export const playbookRegistryData: PlaybookEntryData[] = [
	{
		name: 'SettingsList',
		description: 'Basic settings row with title, value and grouping.',
		knobs: {
			title: { type: 'text', defaultValue: 'SettingsList title' },
			value: { type: 'text', defaultValue: 'Example value' },
			groupPosition: GROUP_POSITION_KNOB,
			isAccountRequired: { type: 'boolean', defaultValue: false },
			italic: { type: 'boolean', defaultValue: false },
			stackedValue: { type: 'boolean', defaultValue: false },
		},
	},
	{
		name: 'SettingsListBoolean',
		description: 'Settings row with a toggle switch.',
		knobs: {
			label: { type: 'text', defaultValue: 'Boolean setting' },
			isEnabled: { type: 'boolean', defaultValue: true },
			disabled: { type: 'boolean', defaultValue: false },
		},
	},
	{
		name: 'SettingsListTriState',
		description: 'Settings row cycling through yes / no / unset.',
		knobs: {
			label: { type: 'text', defaultValue: 'Tri-state setting' },
			state: {
				type: 'select',
				defaultValue: 'unset',
				options: ['unset', 'yes', 'no'],
				passAsProp: false,
			},
			disabled: { type: 'boolean', defaultValue: false },
		},
	},
	{
		name: 'SettingsListGroupTitle',
		description: 'Uppercase section title above a settings group.',
		knobs: {
			title: { type: 'text', defaultValue: 'Group title' },
		},
	},
	{
		name: 'SettingsListEditable',
		description: 'Settings row with a pencil icon indicating editability.',
		knobs: {
			label: { type: 'text', defaultValue: 'Editable' },
			value: { type: 'text', defaultValue: 'Tap to edit' },
			editable: { type: 'boolean', defaultValue: true },
			groupPosition: GROUP_POSITION_KNOB,
		},
	},
	{
		name: 'SettingsListTextInput',
		description: 'Settings row opening a text input modal.',
		knobs: {
			label: { type: 'text', defaultValue: 'Input' },
			placeholder: { type: 'text', defaultValue: 'Enter text…' },
			value: { type: 'text', defaultValue: 'Example text', passAsProp: false },
			multiline: { type: 'boolean', defaultValue: false },
			groupPosition: GROUP_POSITION_KNOB,
		},
	},
	{
		name: 'SettingsListNumberInput',
		description: 'Settings row opening a number input modal.',
		knobs: {
			label: { type: 'text', defaultValue: 'Number input' },
			value: { type: 'number', defaultValue: 42, passAsProp: false },
			min: { type: 'number', defaultValue: 0 },
			max: { type: 'number', defaultValue: 100 },
			groupPosition: GROUP_POSITION_KNOB,
		},
	},
	{
		name: 'SettingsListTimeInput',
		description: 'Settings row opening a segmented HH:MM:SS duration input modal.',
		knobs: {
			label: { type: 'text', defaultValue: 'Duration' },
			value: { type: 'number', defaultValue: 5400, passAsProp: false, label: 'value (seconds)' },
			hoursEnabled: { type: 'boolean', defaultValue: true },
			minutesEnabled: { type: 'boolean', defaultValue: true },
			secondsEnabled: { type: 'boolean', defaultValue: true },
			groupPosition: GROUP_POSITION_KNOB,
		},
	},
	{
		name: 'SettingsListDate',
		description: 'Settings row opening a date input modal (DD.MM.YYYY).',
		knobs: {
			label: { type: 'text', defaultValue: 'Date' },
			value: { type: 'text', defaultValue: '01.01.2024' },
			error: { type: 'text', defaultValue: '' },
			groupPosition: GROUP_POSITION_KNOB,
		},
	},
	{
		name: 'SettingsListProgress',
		description: 'Settings row with a progress bar.',
		knobs: {
			title: { type: 'text', defaultValue: 'Progress' },
			description: { type: 'text', defaultValue: 'Optional description' },
			progress: { type: 'number', defaultValue: 0.5 },
			progressText: { type: 'text', defaultValue: '50 %' },
			groupPosition: GROUP_POSITION_KNOB,
		},
	},
	{
		name: 'SettingsListLikeButton',
		description: 'Standalone like button with counter.',
		knobs: {
			liked: { type: 'boolean', defaultValue: false },
			likeCount: { type: 'number', defaultValue: 5 },
			likeLoading: { type: 'boolean', defaultValue: false },
		},
	},
	{
		name: 'SettingsListLikeDislikeFast',
		description: 'Like/dislike button pair with counters.',
		knobs: {
			state: {
				type: 'select',
				defaultValue: 'unset',
				options: ['unset', 'like', 'dislike'],
				passAsProp: false,
			},
			likeCount: { type: 'number', defaultValue: 3 },
			dislikeCount: { type: 'number', defaultValue: 1 },
		},
	},
	{
		name: 'CardWithText',
		description: 'Card with an image area and a text content section.',
		knobs: {
			text: { type: 'text', defaultValue: 'Card text content', passAsProp: false },
			topRadius: { type: 'number', defaultValue: 10 },
		},
	},
	{
		name: 'QrCode',
		description: 'QR code renderer.',
		knobs: {
			value: { type: 'text', defaultValue: 'https://rocket-meals.de' },
			size: { type: 'number', defaultValue: 200 },
			quietZone: { type: 'number', defaultValue: 10 },
		},
	},
	{
		name: 'WeatherPreview',
		description: 'Weather (temperature + condition) for a GPS coordinate from the free, key-less Open-Meteo API. Optional time as unix ms or ISO string; empty = current weather.',
		knobs: {
			latitude: { type: 'number', defaultValue: 52.2799 },
			longitude: { type: 'number', defaultValue: 8.0472 },
			time: { type: 'text', defaultValue: '', label: 'time (unix ms / ISO, empty = now)' },
		},
	},
	{
		name: 'ScreenHeader',
		description: 'Screen header bar with centered title.',
		knobs: {
			label: { type: 'text', defaultValue: 'Screen header' },
			height: { type: 'number', defaultValue: 60 },
		},
	},
	{
		name: 'Boxplot',
		description: 'Boxplot visualisation with fixed sample stats.',
		knobs: {
			showLabels: { type: 'boolean', defaultValue: true },
			medianBandValue: { type: 'number', defaultValue: 1 },
		},
	},
	{
		name: 'SettingsListSelectOptionSingle',
		description: 'Selectable row with a radio button.',
		knobs: {
			label: { type: 'text', defaultValue: 'Option A' },
			isSelected: { type: 'boolean', defaultValue: true },
		},
	},
	{
		name: 'SettingsListSelectOption',
		description: 'Radio group built from a list of options.',
		knobs: {
			selectedOption: {
				type: 'select',
				defaultValue: 'medium',
				options: ['small', 'medium', 'large'],
				passAsProp: false,
			},
		},
	},
	{
		name: 'SettingsListCoordinate',
		description: 'Settings row linking to a map coordinate.',
		knobs: {
			label: { type: 'text', defaultValue: 'Location' },
			latitude: { type: 'number', defaultValue: 52.283, passAsProp: false },
			longitude: { type: 'number', defaultValue: 8.023, passAsProp: false },
			mapsLabel: { type: 'text', defaultValue: 'Open in Maps' },
			groupPosition: GROUP_POSITION_KNOB,
		},
	},
	{
		name: 'MyScrollViewModal',
		description: 'Global scroll-view modal opened via useMyScrollViewModal.',
		knobs: {
			title: { type: 'text', defaultValue: 'Modal title', passAsProp: false },
			body: { type: 'text', defaultValue: 'This modal is opened through the global modal system of common-ui.', passAsProp: false },
		},
	},
	{
		name: 'FeatureWishesScreen',
		description: 'Full feature-wishes screen with in-memory demo data.',
		knobs: {
			isAdmin: { type: 'boolean', defaultValue: false },
		},
	},
	{
		name: 'CustomMarkdown',
		description: 'Markdown renderer: tables, images, buttonized links (email/tel/location/plain) and optional collapsible sections for ##+ headings.',
		knobs: {
			content: { type: 'text', defaultValue: MARKDOWN_DEMO_CONTENT },
			collapsibleSections: { type: 'boolean', defaultValue: true },
			sectionsStartCollapsed: { type: 'boolean', defaultValue: false },
		},
	},
	{
		name: 'MyAvatar',
		description: 'DiceBear avatar renderer.',
		knobs: {
			style: {
				type: 'select',
				defaultValue: 'avataaars',
				options: ['avataaars', 'bottts', 'micah', 'pixelArt', 'funEmoji', 'identicon'],
			},
			size: { type: 'number', defaultValue: 96 },
			rounded: { type: 'boolean', defaultValue: true },
			backgroundColor: { type: 'text', defaultValue: '#e0e0e0' },
		},
	},
];

export function getPlaybookEntryData(name: string): PlaybookEntryData | undefined {
	return playbookRegistryData.find((entry) => entry.name === name);
}

/** Route path of a playbook detail screen inside the frontend app. */
export function getPlaybookPath(name: string): string {
	return `/experimentell/playbook/${name}`;
}

export function getDefaultKnobValues(entry: PlaybookEntryData): Record<string, KnobValue> {
	const values: Record<string, KnobValue> = {};
	for (const [knobName, knob] of Object.entries(entry.knobs)) {
		values[knobName] = knob.defaultValue;
	}
	return values;
}

/**
 * Parse a raw URL parameter into a typed knob value.
 * Falls back to the knob's default for missing or invalid input.
 */
export function parseKnobValue(knob: KnobDefinition, raw: string | undefined): KnobValue {
	if (raw === undefined) {
		return knob.defaultValue;
	}
	switch (knob.type) {
		case 'boolean':
			return raw === 'true' ? true : raw === 'false' ? false : knob.defaultValue;
		case 'number': {
			const parsed = Number.parseFloat(raw);
			return Number.isNaN(parsed) ? knob.defaultValue : parsed;
		}
		case 'select':
			return knob.options?.includes(raw) ? raw : knob.defaultValue;
		case 'text':
			return raw;
	}
}

export function serializeKnobValue(value: KnobValue): string {
	return String(value);
}

/**
 * Resolve the current knob values of an entry from URL query parameters
 * (expo-router `useLocalSearchParams` yields `string | string[]` values).
 */
export function resolveKnobValues(entry: PlaybookEntryData, params: Record<string, string | string[] | undefined>): Record<string, KnobValue> {
	const values: Record<string, KnobValue> = {};
	for (const [knobName, knob] of Object.entries(entry.knobs)) {
		const rawParam = params[knobName];
		const raw = Array.isArray(rawParam) ? rawParam[0] : rawParam;
		values[knobName] = parseKnobValue(knob, raw);
	}
	return values;
}
