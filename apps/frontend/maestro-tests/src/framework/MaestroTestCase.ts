/**
 * MaestroTestCase – fluent builder that describes a Maestro UI test.
 *
 * Call the builder methods to add test steps, then export the instance as the
 * default export from a test file.  The `generate.ts` script discovers all
 * test files, calls `toYaml()` on each exported `MaestroTestCase`, and writes
 * the result into the `generated/` folder.
 *
 * Example
 * -------
 * ```ts
 * const test = new MaestroTestCase({ appId: 'com.example', outputFileName: 'login' });
 * test.openPage('http://localhost:8081/').waitForAnimationToEnd().tapOn('Sign in');
 * export default test;
 * ```
 */

type MaestroStep =
	| { type: 'launchApp'; url: string }
	| { type: 'waitForAnimationToEnd' }
	| { type: 'takeScreenshot'; name: string }
	| { type: 'tapOn'; label: string }
	| { type: 'tapOnIndex'; label: string; index: number }
	| { type: 'tapOnId'; id: string }
	| { type: 'assertVisible'; label: string }
	| { type: 'assertVisibleId'; id: string }
	| { type: 'assertNotVisible'; label: string }
	| { type: 'assertNotVisibleId'; id: string }
	| { type: 'inputText'; text: string }
	| { type: 'pressKey'; key: string }
	| { type: 'scroll' }
	| { type: 'swipe'; direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' };

export interface MaestroTestCaseOptions {
	/** Maestro `appId` written into the YAML header. */
	appId: string;
	/** Optional tags written into the YAML header. */
	tags?: string[];
	/**
	 * Base name for the generated YAML file (without extension).
	 * Defaults to `'test'`.
	 */
	outputFileName?: string;
}

export class MaestroTestCase {
	private readonly steps: MaestroStep[] = [];
	readonly appId: string;
	readonly tags: string[];
	readonly outputFileName: string;
	private url: string | null = null;

	constructor(options: MaestroTestCaseOptions) {
		this.appId = options.appId;
		this.tags = options.tags ?? [];
		this.outputFileName = options.outputFileName ?? 'test';
	}

	/** Launch the app and navigate to the given URL. */
	openPage(url: string): this {
		// The first URL is used as the YAML header `url:` field, which Maestro uses
		// to identify this as a web flow and as the default navigation target for
		// all launchApp steps (the header url becomes the appId for the web driver).
		if (this.url === null) {
			this.url = url;
		}
		this.steps.push({ type: 'launchApp', url });
		return this;
	}

	/** Wait for any running animation to finish. */
	waitForAnimationToEnd(): this {
		this.steps.push({ type: 'waitForAnimationToEnd' });
		return this;
	}

	/** Capture a screenshot with the given name. */
	takeScreenshot(name: string): this {
		this.steps.push({ type: 'takeScreenshot', name });
		return this;
	}

	/**
	 * Tap on the first element whose visible text contains `label`.
	 * Maestro performs a substring match, so passing a full translation string
	 * works even when the rendered text is longer than expected.
	 */
	tapOn(label: string): this {
		this.steps.push({ type: 'tapOn', label });
		return this;
	}

	/**
	 * Tap on the Nth element (0-based) whose visible text matches `label`.
	 * Useful when multiple elements share the same text and you need a specific one.
	 */
	tapOnIndex(label: string, index: number): this {
		this.steps.push({ type: 'tapOnIndex', label, index });
		return this;
	}

	/**
	 * Tap on the first element whose accessibility label / id matches `id`.
	 * Maestro performs a regex match, so partial patterns like `"Auswählen.*"` work.
	 */
	tapOnId(id: string): this {
		this.steps.push({ type: 'tapOnId', id });
		return this;
	}

	/** Assert that an element with text containing `label` is visible. */
	assertVisible(label: string): this {
		this.steps.push({ type: 'assertVisible', label });
		return this;
	}

	/** Assert that an element with accessibility label / id matching `id` is visible. */
	assertVisibleId(id: string): this {
		this.steps.push({ type: 'assertVisibleId', id });
		return this;
	}

	/** Assert that no element with text containing `label` is visible. */
	assertNotVisible(label: string): this {
		this.steps.push({ type: 'assertNotVisible', label });
		return this;
	}

	/** Assert that no element with accessibility label / id matching `id` is visible. */
	assertNotVisibleId(id: string): this {
		this.steps.push({ type: 'assertNotVisibleId', id });
		return this;
	}

	/** Type `text` into the currently focused input field. */
	inputText(text: string): this {
		this.steps.push({ type: 'inputText', text });
		return this;
	}

	/** Press a keyboard key (e.g. `'Enter'`, `'Back'`). */
	pressKey(key: string): this {
		this.steps.push({ type: 'pressKey', key });
		return this;
	}

	/** Scroll the current view. */
	scroll(): this {
		this.steps.push({ type: 'scroll' });
		return this;
	}

	/** Swipe in the given direction. */
	swipe(direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'): this {
		this.steps.push({ type: 'swipe', direction });
		return this;
	}

	/**
	 * Serialise the test case to a Maestro-compatible YAML string.
	 * Called automatically by `generate.ts`.
	 */
	toYaml(): string {
		const lines: string[] = [];

		// --- YAML header ---
		// `url:` must be present for Maestro to detect this as a web flow
		// (see FileUtils.isWebFlow() which checks config.url != null).
		if (this.url !== null) {
			lines.push(`url: ${yamlString(this.url)}`);
		}
		lines.push(`appId: ${this.appId}`);
		if (this.tags.length > 0) {
			lines.push('tags:');
			for (const tag of this.tags) {
				lines.push(`  - ${tag}`);
			}
		}
		lines.push('---');
		lines.push('');

		// --- steps ---
		for (const step of this.steps) {
			switch (step.type) {
				case 'launchApp':
					lines.push('- launchApp:');
					lines.push('    clearState: true');
					lines.push('    arguments:');
					lines.push(`      url: ${yamlString(step.url)}`);
					break;
				case 'waitForAnimationToEnd':
					lines.push('- waitForAnimationToEnd');
					break;
				case 'takeScreenshot':
					lines.push(`- takeScreenshot: ${step.name}`);
					break;
				case 'tapOn':
					lines.push(`- tapOn: ${yamlString(step.label)}`);
					break;
				case 'tapOnIndex':
					lines.push('- tapOn:');
					lines.push(`    text: ${yamlString(step.label)}`);
					lines.push(`    index: ${step.index}`);
					break;
				case 'tapOnId':
					lines.push('- tapOn:');
					lines.push(`    id: ${yamlString(step.id)}`);
					break;
				case 'assertVisible':
					lines.push(`- assertVisible: ${yamlString(step.label)}`);
					break;
				case 'assertVisibleId':
					lines.push('- assertVisible:');
					lines.push(`    id: ${yamlString(step.id)}`);
					break;
				case 'assertNotVisible':
					lines.push(`- assertNotVisible: ${yamlString(step.label)}`);
					break;
				case 'assertNotVisibleId':
					lines.push('- assertNotVisible:');
					lines.push(`    id: ${yamlString(step.id)}`);
					break;
				case 'inputText':
					lines.push(`- inputText: ${yamlString(step.text)}`);
					break;
				case 'pressKey':
					lines.push(`- pressKey: ${step.key}`);
					break;
				case 'scroll':
					lines.push('- scroll');
					break;
				case 'swipe':
					lines.push('- swipe:');
					lines.push(`    direction: ${step.direction}`);
					break;
			}
		}

		return lines.join('\n') + '\n';
	}
}

/** Wrap a string value in double quotes, escaping backslashes and double quotes in one pass. */
function yamlString(value: string): string {
	const escaped = value.replace(/[\\"]/g, (ch) => `\\${ch}`);
	return `"${escaped}"`;
}
