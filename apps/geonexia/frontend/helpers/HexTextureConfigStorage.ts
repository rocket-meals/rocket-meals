import { File, Paths } from 'expo-file-system';
import type { SpriteAnchorOverride } from './BillboardConfigStorage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TextureSpriteAnchorOverride = SpriteAnchorOverride;

export type HexTextureConfigState = Record<string, TextureSpriteAnchorOverride>;

// ─── Persistence ─────────────────────────────────────────────────────────────

function getHexTextureConfigFile(): File {
	return new File(Paths.document, 'geonexia-hex-texture-config.json');
}

/**
 * Persist hex texture config (sprite anchor overrides) to disk.
 * Silently ignores write errors to avoid crashing on storage failures.
 */
export function saveHexTextureConfig(config: HexTextureConfigState): void {
	try {
		getHexTextureConfigFile().write(JSON.stringify(config));
	} catch (err) {
		console.warn('[HexTextureConfigStorage] Failed to save hex texture config:', err);
	}
}

/**
 * Load hex texture config from disk.
 * Returns an empty object when the file does not exist or cannot be parsed.
 */
export async function loadHexTextureConfig(): Promise<HexTextureConfigState> {
	try {
		const file = getHexTextureConfigFile();
		if (!file.exists) return {};
		const content = await file.text();
		return JSON.parse(content) as HexTextureConfigState;
	} catch {
		return {};
	}
}
