// Expo config plugin: puts the exported Godot game into the native projects
// during `expo prebuild`.
//
// The two platforms want different formats:
//   - iOS reads a single pack file from the app bundle (assets/godot/main.pck).
//     Reading a .pck from the bundle is cheap, so this is the simplest option.
//   - Android reads the unpacked project folder from the APK assets
//     (assets/godot/godot-files/main). Reading pack file contents from the apk
//     is noticeably slower there, so the files are shipped individually.
//
// Both sources are optional: without them the plugin only warns, so the app
// still prebuilds (with a Godot view that has nothing to run).
const fs = require('node:fs');
const path = require('node:path');

const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const PCK_FILE_NAME = 'main.pck';
const ANDROID_PROJECT_DIR_NAME = 'main';

/** iOS: copy main.pck next to the Xcode project and add it to the app target's resources. */
function withGodotPackFile(config) {
	return withXcodeProject(config, (config) => {
		const projectRoot = config.modRequest.projectRoot;
		const sourcePath = path.join(projectRoot, 'assets', 'godot', PCK_FILE_NAME);
		const targetPath = path.join(projectRoot, 'ios', PCK_FILE_NAME);

		if (!fs.existsSync(sourcePath)) {
			console.warn(`[playground] No Godot pack file at ${sourcePath} - the iOS app will start without a game.`);
			return config;
		}

		fs.copyFileSync(sourcePath, targetPath);

		const project = config.modResults;
		if (project.hasFile(PCK_FILE_NAME)) {
			return config;
		}

		const mainGroupKey = project.getFirstProject().firstProject.mainGroup;
		if (!mainGroupKey) {
			throw new Error('[playground] Could not find the main group of the Xcode project.');
		}

		// lastKnownFileType "file": Xcode must copy the pack verbatim instead of
		// trying to process it as a known resource type.
		const file = project.addFile(PCK_FILE_NAME, mainGroupKey, { lastKnownFileType: 'file', defaultEncoding: 4 });
		if (!file) {
			throw new Error(`[playground] Could not add ${PCK_FILE_NAME} to the Xcode project.`);
		}

		// addFile() only creates the file reference - the build file entry and
		// the resources build phase membership have to be added by hand.
		const buildFileUuid = project.generateUuid();
		const buildFile = { uuid: buildFileUuid, basename: PCK_FILE_NAME, group: 'Resources' };
		project.addToPbxBuildFileSection({ ...buildFile, isa: 'PBXBuildFile', fileRef: file.fileRef });
		project.addToPbxResourcesBuildPhase({ ...buildFile, target: project.getFirstTarget().uuid });

		return config;
	});
}

/** Android: copy the unpacked Godot project into the apk assets. */
function withGodotProjectFiles(config) {
	return withDangerousMod(config, [
		'android',
		(config) => {
			const projectRoot = config.modRequest.projectRoot;
			const sourcePath = path.join(projectRoot, 'assets', 'godot', 'godot-files', ANDROID_PROJECT_DIR_NAME);
			const targetPath = path.join(
				projectRoot,
				'android',
				'app',
				'src',
				'main',
				'assets',
				ANDROID_PROJECT_DIR_NAME
			);

			if (!fs.existsSync(sourcePath)) {
				console.warn(`[playground] No Godot project at ${sourcePath} - the Android app will start without a game.`);
				return config;
			}

			fs.cpSync(sourcePath, targetPath, { recursive: true });

			return config;
		},
	]);
}

module.exports = function withGodotAssets(config) {
	return withGodotProjectFiles(withGodotPackFile(config));
};
