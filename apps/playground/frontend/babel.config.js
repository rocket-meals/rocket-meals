// react-native-godot runs its callbacks on a dedicated Godot thread through
// react-native-worklets-core, whose babel plugin turns every function with a
// `'worklet'` directive into a worklet. Without this plugin those callbacks
// stay ordinary functions and crash as soon as the Godot thread calls them.
module.exports = function babelConfig(api) {
	api.cache(true);
	return {
		presets: ['babel-preset-expo'],
		plugins: ['react-native-worklets-core/plugin'],
	};
};
