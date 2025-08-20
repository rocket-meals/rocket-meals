import type { ConfigContext } from "@expo/config";

// Register ts-node so Expo can load TypeScript config helpers without a
// precompiled JavaScript file.
require("ts-node").register({
  transpileOnly: true,
  // Expo SDK 53 uses the bundler module setting which requires
  // the TypeScript compiler to output ES modules.
  compilerOptions: { module: "es2015" },
});

const { getFinalConfig } = require("./config.ts");

module.exports = function ({ config }: ConfigContext) {
  return getFinalConfig(config);
};
