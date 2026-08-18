// Hand-written typings for @borndotcom/react-native-godot@1.0.1.
//
// The package declares `"types": "lib/typescript/index.d.ts"`, but that file is
// not part of the published tarball (the generated declarations sit one level
// deeper, in lib/typescript/js/), so TypeScript cannot resolve the module on
// its own. Only the parts this app actually uses are declared here.
declare module '@borndotcom/react-native-godot' {
	import type { HostComponent, ViewProps } from 'react-native';

	/** Godot's `Input` singleton, reachable through the JSI bridge. */
	export type GodotInput = {
		action_press(action: string, strength?: number): void;
		action_release(action: string): void;
		is_action_pressed(action: string): boolean;
	};

	/** The Godot API object graph - only the singletons used here are typed. */
	export type GodotApi = {
		Input: GodotInput;
	} & Record<string, unknown>;

	export interface GodotModuleInterface {
		/** Boots the engine with Godot's own command line arguments. */
		createInstance(args: string[]): unknown;
		getInstance(): unknown;
		API(): GodotApi;
		updateWindow(windowName: string): unknown;
		pause(): void;
		resume(): void;
		is_paused(): boolean;
		runOnGodotThread<T>(f: () => T): Promise<T>;
		destroyInstance(): void;
	}

	export const RTNGodot: GodotModuleInterface;

	/** Runs a `'worklet'` function on the dedicated Godot thread. */
	export function runOnGodotThread<T>(f: () => T): Promise<T>;

	export interface RTNGodotViewProps extends ViewProps {
		windowName?: string;
	}

	export const RTNGodotView: HostComponent<RTNGodotViewProps>;
}
