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
	| { type: 'waitUntilVisibleId'; id: string; timeoutMs: number }
	| { type: 'takeScreenshot'; name: string }
	| { type: 'tapOn'; label: string }
	| { type: 'tapOnIndex'; label: string; index: number }
	| { type: 'tapOnId'; id: string }
	| { type: 'tapOnIdIndex'; id: string; index: number }
	| { type: 'optionalTapOnId'; id: string }
	| { type: 'assertVisible'; label: string }
	| { type: 'assertVisibleId'; id: string }
	| { type: 'assertVisibleIdIndex'; id: string; index: number }
	| { type: 'assertNotVisible'; label: string }
	| { type: 'assertNotVisibleId'; id: string }
	| { type: 'assertNotVisibleIdIndex'; id: string; index: number }
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

	/**
	 * Wait (up to `timeoutMs`) until an element with testID / id matching `id` is
	 * visible. Unlike waitForAnimationToEnd - which returns immediately on a static
	 * loading page - this actually blocks until the app has rendered the element,
	 * so it's the right step after launching a page before screenshotting it.
	 */
	waitUntilVisibleId(id: string, timeoutMs = 30000): this {
		this.steps.push({ type: 'waitUntilVisibleId', id, timeoutMs });
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
	 * Tap on the first element whose testID / id matches `id`.
	 * Maestro performs a regex match, so partial patterns like `"Auswählen.*"` work.
	 */
	tapOnId(id: string): this {
		this.steps.push({ type: 'tapOnId', id });
		return this;
	}

	/**
	 * Tap on the Nth element (0-based) whose testID / id matches `id`.
	 * Useful when multiple elements share the same testID and you need a specific one.
	 */
	tapOnIdIndex(id: string, index: number): this {
		this.steps.push({ type: 'tapOnIdIndex', id, index });
		return this;
	}

	/**
	 * Optionally tap on an element whose testID / id matches `id`.
	 * If the element is not found the step is silently skipped – useful for
	 * dismissing modals or popups that may or may not be present.
	 */
	optionalTapOnId(id: string): this {
		this.steps.push({ type: 'optionalTapOnId', id });
		return this;
	}

	/** Assert that an element with text containing `label` is visible. */
	assertVisible(label: string): this {
		this.steps.push({ type: 'assertVisible', label });
		return this;
	}

	/** Assert that an element with testID / id matching `id` is visible. */
	assertVisibleId(id: string): this {
		this.steps.push({ type: 'assertVisibleId', id });
		return this;
	}

	/** Assert that the Nth element (0-based) with testID / id matching `id` is visible. */
	assertVisibleIdIndex(id: string, index: number): this {
		this.steps.push({ type: 'assertVisibleIdIndex', id, index });
		return this;
	}

	/** Assert that no element with text containing `label` is visible. */
	assertNotVisible(label: string): this {
		this.steps.push({ type: 'assertNotVisible', label });
		return this;
	}

	/** Assert that no element with testID / id matching `id` is visible. */
	assertNotVisibleId(id: string): this {
		this.steps.push({ type: 'assertNotVisibleId', id });
		return this;
	}

	/** Assert that the Nth element (0-based) with testID / id matching `id` is not visible. */
	assertNotVisibleIdIndex(id: string, index: number): this {
		this.steps.push({ type: 'assertNotVisibleIdIndex', id, index });
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
			const desc = stepDescription(step);
			lines.push(`# [Test: ${this.outputFileName}]: ${desc}`);
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
				case 'waitUntilVisibleId':
					lines.push('- extendedWaitUntil:');
					lines.push('    visible:');
					lines.push(`        id: ${yamlString(idPattern(step.id))}`);
					lines.push(`    timeout: ${step.timeoutMs}`);
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
					lines.push(`    id: ${yamlString(idPattern(step.id))}`);
					break;
				case 'tapOnIdIndex':
					lines.push('- tapOn:');
					lines.push(`    id: ${yamlString(idPattern(step.id))}`);
					lines.push(`    index: ${step.index}`);
					break;
				case 'optionalTapOnId':
					lines.push('- tapOn:');
					lines.push(`    id: ${yamlString(idPattern(step.id))}`);
					lines.push('    optional: true');
					break;
				case 'assertVisible':
					lines.push(`- assertVisible: ${yamlString(step.label)}`);
					break;
				case 'assertVisibleId':
					lines.push('- assertVisible:');
					lines.push(`    id: ${yamlString(idPattern(step.id))}`);
					break;
				case 'assertVisibleIdIndex':
					lines.push('- assertVisible:');
					lines.push(`    id: ${yamlString(idPattern(step.id))}`);
					lines.push(`    index: ${step.index}`);
					break;
				case 'assertNotVisible':
					lines.push(`- assertNotVisible: ${yamlString(step.label)}`);
					break;
				case 'assertNotVisibleId':
					lines.push('- assertNotVisible:');
					lines.push(`    id: ${yamlString(idPattern(step.id))}`);
					break;
				case 'assertNotVisibleIdIndex':
					lines.push('- assertNotVisible:');
					lines.push(`    id: ${yamlString(idPattern(step.id))}`);
					lines.push(`    index: ${step.index}`);
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

/**
 * Ensure an `id:` pattern ends with `.*` so that Maestro's fully-anchored
 * regex (`^pattern$`) also matches elements whose rendered HTML `id` attribute
 * has a dynamic suffix (e.g. `canteen-select-button-23456543`).
 *
 * Adding `.*` is always safe: if the id has no suffix the pattern still
 * matches the exact value, and it also matches any suffixed variant.
 */
function idPattern(id: string): string {
	return id.endsWith('.*') ? id : id + '.*';
}

/**
 * Build a human-readable description of a Maestro step.
 * Used to generate YAML comments that annotate each step in the generated file.
 */
function stepDescription(step: MaestroStep): string {
	switch (step.type) {
		case 'launchApp': return `LaunchApp: ${step.url}`;
		case 'waitForAnimationToEnd': return 'WaitForAnimationToEnd';
		case 'waitUntilVisibleId': return `WaitUntilVisibleId: ${step.id} (timeout ${step.timeoutMs}ms)`;
		case 'takeScreenshot': return `TakeScreenshot: ${step.name}`;
		case 'tapOn': return `TapOn: ${step.label}`;
		case 'tapOnIndex': return `TapOnIndex: ${step.label}[${step.index}]`;
		case 'tapOnId': return `TapOnId: ${step.id}`;
		case 'tapOnIdIndex': return `TapOnIdIndex: ${step.id}[${step.index}]`;
		case 'optionalTapOnId': return `OptionalTapOnId: ${step.id}`;
		case 'assertVisible': return `AssertVisible: ${step.label}`;
		case 'assertVisibleId': return `AssertVisibleId: ${step.id}`;
		case 'assertVisibleIdIndex': return `AssertVisibleIdIndex: ${step.id}[${step.index}]`;
		case 'assertNotVisible': return `AssertNotVisible: ${step.label}`;
		case 'assertNotVisibleId': return `AssertNotVisibleId: ${step.id}`;
		case 'assertNotVisibleIdIndex': return `AssertNotVisibleIdIndex: ${step.id}[${step.index}]`;
		case 'inputText': return `InputText: ${step.text}`;
		case 'pressKey': return `PressKey: ${step.key}`;
		case 'scroll': return 'Scroll';
		case 'swipe': return `Swipe: ${step.direction}`;
	}
}
