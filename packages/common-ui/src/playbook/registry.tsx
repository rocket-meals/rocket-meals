/**
 * registry.tsx – runtime part of the component playbook registry.
 *
 * Merges the serializable entry data from `registryData.ts` with everything
 * that needs React at runtime: the component itself, named variants with
 * non-serializable props (icons, elements), fixed base props and `bindProps`,
 * which wires component callbacks back into the knob state so components stay
 * interactive inside the playbook (e.g. a toggle actually toggles).
 *
 * Adding a new component to the playbook:
 * 1. Add a `PlaybookEntryData` entry (name + knobs) in `registryData.ts`.
 * 2. Add the matching runtime entry (component, variants, bindProps) below.
 * The playbook screens, Maestro smoke tests and accessibility audits pick the
 * new entry up automatically.
 */

import React from 'react';
import { Text } from 'react-native';
import type { ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import SettingsList from '../components/SettingsList';
import SettingsListBoolean from '../components/SettingsListBoolean';
import SettingsListTriState from '../components/SettingsListTriState';
import SettingsListGroupTitle from '../components/SettingsListGroupTitle';
import SettingsListEditable from '../components/SettingsListEditable';
import SettingsListTextInput from '../components/SettingsListTextInput';
import SettingsListNumberInput from '../components/SettingsListNumberInput';
import SettingsListDate from '../components/SettingsListDate';
import SettingsListTimeInput from '../components/SettingsListTimeInput';
import SettingsListProgress from '../components/SettingsListProgress';
import SettingsListLikeButton from '../components/SettingsListLikeButton';
import SettingsListLikeDislikeFast from '../components/SettingsListLikeDislikeFast';
import SettingsListSelectOptionSingle from '../components/SettingsListSelectOptionSingle';
import SettingsListSelectOption from '../components/SettingsListSelectOption';
import SettingsListCoordinate from '../components/SettingsListCoordinate';
import FeatureWishesScreen from '../components/FeatureWishesScreen';
import { useMyScrollViewModal } from '../components/GlobalModal/useMyScrollViewModal';
import CardWithText from '../components/CardWithText';
import QrCode from '../components/QrCode';
import WeatherPreview from '../components/WeatherPreview';
import ScreenHeader from '../components/ScreenHeader';
import Boxplot from '../components/Boxplot';
import MyAvatar, { AvatarStyle } from '../components/MyAvatar';
import CustomMarkdown from '../components/CustomMarkdown/CustomMarkdown';
import { CommonUiComponentIds } from '../constants/ComponentIds';
import {
	KnobValue,
	PlaybookEntryData,
	getDefaultKnobValues,
	parseKnobValue,
	playbookRegistryData,
} from './registryData';

export type SetKnobValue = (knobName: string, value: KnobValue) => void;

interface PlaybookEntryRuntime {
	component: React.ComponentType<any>;
	/** Fixed props always passed to the component (e.g. required complex props). */
	baseProps?: Record<string, unknown>;
	/**
	 * Named prop presets, selectable in the playbook screen via
	 * `?variant=<name>`. May contain non-serializable props such as icons.
	 */
	variants?: Record<string, Record<string, unknown>>;
	/**
	 * Wires component callbacks back into the knob state so the component is
	 * interactive inside the playbook. Returned props override knob props.
	 */
	bindProps?: (values: Record<string, KnobValue>, setKnob: SetKnobValue) => Record<string, unknown>;
	/**
	 * Extra style for the view wrapping the component under test, e.g. a fixed
	 * height for full-screen components that would otherwise collapse inside
	 * the playbook's scroll view.
	 */
	targetContainerStyle?: ViewStyle;
}

export type PlaybookEntry = PlaybookEntryData & PlaybookEntryRuntime;

/** Icon that follows the current theme, for use in variant props. */
const ThemedIcon: React.FC<{ name: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }> = ({ name }) => {
	const { theme } = useTheme();
	return <MaterialCommunityIcons name={name} size={24} color={theme.screen.icon} />;
};

/** Text that follows the current theme, for use as text-only children. */
const ThemedText: React.FC<{ children: string }> = ({ children }) => {
	const { theme } = useTheme();
	return <Text style={{ color: theme.screen.text }}>{children}</Text>;
};

const LONG_TEXT_TITLE = 'This is an extremely long title that will not fit into a single line and therefore has to wrap.';
const LONG_TEXT_VALUE = 'This very long value should also wrap nicely so that everything stays readable.';

/** Demo trigger row for the global scroll-view modal (useMyScrollViewModal). */
const ScrollViewModalDemo: React.FC<{ modalTitle: string; modalBody: string }> = ({ modalTitle, modalBody }) => {
	const { theme } = useTheme();
	const { show } = useMyScrollViewModal();
	return (
		<SettingsList
			leftIcon={<ThemedIcon name="window-restore" />}
			title={modalTitle}
			value="Tap to open"
			groupPosition="single"
			handleFunction={() =>
				show(
					{
						title: modalTitle,
						children: <Text style={{ color: theme.screen.text, padding: 20 }}>{modalBody}</Text>,
					},
					{},
				)
			}
		/>
	);
};

const runtimeByName: Record<string, PlaybookEntryRuntime> = {
	SettingsList: {
		component: SettingsList,
		variants: {
			'with-icon': { leftIcon: <ThemedIcon name="format-list-text" /> },
			'long-text': { title: LONG_TEXT_TITLE, value: LONG_TEXT_VALUE },
		},
	},
	SettingsListBoolean: {
		component: SettingsListBoolean,
		variants: {
			'with-icon': { leftIcon: <ThemedIcon name="toggle-switch-outline" /> },
		},
		bindProps: (values, setKnob) => ({
			onToggle: () => setKnob('isEnabled', values.isEnabled !== true),
		}),
	},
	SettingsListTriState: {
		component: SettingsListTriState,
		bindProps: (values, setKnob) => ({
			value: values.state === 'yes' ? true : values.state === 'no' ? false : null,
			onChange: (next: boolean | null) => setKnob('state', next === null ? 'unset' : next ? 'yes' : 'no'),
		}),
	},
	SettingsListGroupTitle: {
		component: SettingsListGroupTitle,
	},
	SettingsListEditable: {
		component: SettingsListEditable,
		variants: {
			'with-icon': { leftIcon: <ThemedIcon name="pencil" /> },
		},
	},
	SettingsListTextInput: {
		component: SettingsListTextInput,
		bindProps: (values, setKnob) => ({
			value: String(values.value ?? ''),
			initialValue: String(values.value ?? ''),
			onSave: (saved: string) => setKnob('value', saved),
		}),
	},
	SettingsListNumberInput: {
		component: SettingsListNumberInput,
		bindProps: (values, setKnob) => ({
			value: String(values.value ?? ''),
			initialValue: Number(values.value ?? 0),
			onSave: (saved: number) => setKnob('value', saved),
		}),
	},
	SettingsListTimeInput: {
		component: SettingsListTimeInput,
		baseProps: { nativeID: CommonUiComponentIds.TIME_INPUT_ROW },
		bindProps: (values, setKnob) => ({
			initialValue: Number(values.value ?? 0),
			onSave: (totalSeconds: number) => setKnob('value', totalSeconds),
		}),
	},
	SettingsListDate: {
		component: SettingsListDate,
		bindProps: (values, setKnob) => ({
			id: 'playbook-date',
			custom_type: 'date',
			onChange: (_id: string, nextValue: string) => setKnob('value', nextValue),
			onError: (_id: string, error: string) => setKnob('error', error),
		}),
	},
	SettingsListProgress: {
		component: SettingsListProgress,
		variants: {
			'with-icon': { leftIcon: <ThemedIcon name="progress-check" /> },
		},
	},
	SettingsListLikeButton: {
		component: SettingsListLikeButton,
		bindProps: (values, setKnob) => ({
			onPressLike: () => setKnob('liked', values.liked !== true),
		}),
	},
	SettingsListLikeDislikeFast: {
		component: SettingsListLikeDislikeFast,
		bindProps: (values, setKnob) => ({
			like: values.state === 'like' ? true : values.state === 'dislike' ? false : null,
			onPressLike: () => setKnob('state', values.state === 'like' ? 'unset' : 'like'),
			onPressDislike: () => setKnob('state', values.state === 'dislike' ? 'unset' : 'dislike'),
		}),
	},
	CardWithText: {
		component: CardWithText,
		// Without an image the aspect-ratio constraint would render a large empty
		// square above the text, so it is disabled by default.
		baseProps: { aspectRatio: false },
		bindProps: (values) => ({
			children: <ThemedText>{String(values.text ?? '')}</ThemedText>,
		}),
	},
	QrCode: {
		component: QrCode,
	},
	WeatherPreview: {
		component: WeatherPreview,
	},
	ScreenHeader: {
		component: ScreenHeader,
	},
	Boxplot: {
		component: Boxplot,
		baseProps: {
			stats: { min: 2, q1: 4, median: 5, q3: 7, max: 9 },
		},
	},
	SettingsListSelectOptionSingle: {
		component: SettingsListSelectOptionSingle,
		bindProps: (values, setKnob) => ({
			onPress: () => setKnob('isSelected', values.isSelected !== true),
		}),
	},
	SettingsListSelectOption: {
		component: SettingsListSelectOption,
		bindProps: (values, setKnob) => ({
			options: [
				{ id: 'small', label: 'Small' },
				{ id: 'medium', label: 'Medium' },
				{ id: 'large', label: 'Large' },
			],
			selectedOption: String(values.selectedOption),
			onSelect: (option: { id: string }) => setKnob('selectedOption', option.id),
		}),
	},
	SettingsListCoordinate: {
		component: SettingsListCoordinate,
		bindProps: (values) => ({
			location: { latitude: Number(values.latitude), longitude: Number(values.longitude) },
			value: `${values.latitude}, ${values.longitude}`,
		}),
	},
	MyScrollViewModal: {
		component: ScrollViewModalDemo,
		bindProps: (values) => ({
			modalTitle: String(values.title ?? ''),
			modalBody: String(values.body ?? ''),
		}),
	},
	FeatureWishesScreen: {
		component: FeatureWishesScreen,
		// Full-screen component (internal list) – needs a fixed height inside
		// the playbook scroll view.
		targetContainerStyle: { height: 520 },
	},
	MyAvatar: {
		component: MyAvatar,
		bindProps: (values) => ({
			style: values.style as AvatarStyle,
		}),
	},
	CustomMarkdown: {
		component: CustomMarkdown,
		// Renders its own scrollable content (tables/images/sections) - give it
		// room instead of collapsing inside the playbook's outer scroll view.
		targetContainerStyle: { minHeight: 600 },
	},
};

export const playbookRegistry: PlaybookEntry[] = playbookRegistryData.map((data) => {
	const runtime = runtimeByName[data.name];
	if (!runtime) {
		throw new Error(`Playbook registry: missing runtime entry for "${data.name}" – add it to runtimeByName in registry.tsx.`);
	}
	return { ...data, ...runtime };
});

export function getPlaybookEntry(name: string): PlaybookEntry | undefined {
	return playbookRegistry.find((entry) => entry.name === name);
}

/**
 * Build the props for a playbook entry's component from URL query parameters.
 *
 * Merge order (later wins): baseProps → variant props → knob values
 * (defaults, overridden by variant values, overridden by explicit URL params)
 * → bound callback props.
 *
 * Returns the final component props plus the effective knob values (for the
 * knob panel UI).
 */
export function buildPlaybookProps(
	entry: PlaybookEntry,
	params: Record<string, string | string[] | undefined>,
	setKnob: SetKnobValue,
): { componentProps: Record<string, unknown>; knobValues: Record<string, KnobValue>; variantName: string | undefined } {
	const rawVariant = Array.isArray(params.variant) ? params.variant[0] : params.variant;
	const variantName = rawVariant && entry.variants?.[rawVariant] ? rawVariant : undefined;
	const variantProps = variantName ? entry.variants?.[variantName] ?? {} : {};

	// Effective knob values: defaults → serializable variant overrides → explicit URL params.
	const knobValues = getDefaultKnobValues(entry);
	for (const [knobName, knob] of Object.entries(entry.knobs)) {
		const variantValue = variantProps[knobName];
		if (typeof variantValue === 'string' || typeof variantValue === 'number' || typeof variantValue === 'boolean') {
			knobValues[knobName] = variantValue;
		}
		const rawParam = params[knobName];
		const raw = Array.isArray(rawParam) ? rawParam[0] : rawParam;
		if (raw !== undefined) {
			knobValues[knobName] = parseKnobValue(knob, raw);
		}
	}

	const knobProps: Record<string, unknown> = {};
	for (const [knobName, knob] of Object.entries(entry.knobs)) {
		if (knob.passAsProp !== false) {
			knobProps[knobName] = knobValues[knobName];
		}
	}

	const boundProps = entry.bindProps ? entry.bindProps(knobValues, setKnob) : {};

	return {
		componentProps: { ...entry.baseProps, ...variantProps, ...knobProps, ...boundProps },
		knobValues,
		variantName,
	};
}
