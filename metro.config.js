/**
 * Metro configuration for React Native
 * See https://facebook.github.io/metro/docs/configuration
 */
const { getDefaultConfig } = require("expo/metro-config");

// NativeWind provides a metro plugin via `nativewind/metro` that optimizes
// processing of style classes. If available, use it; otherwise fall back to
// Expo's default Metro config.
let config = getDefaultConfig(__dirname);
try {
  // nativewind/metro may export either an object with `withNativeWind`
  // or a function. Attempt to require it and handle both shapes.
  const nativewindMetro = require("nativewind/metro");
  if (nativewindMetro && typeof nativewindMetro.withNativeWind === "function") {
    config = nativewindMetro.withNativeWind(config, {
      input: "./styles/global.css",
    });
  } else if (typeof nativewindMetro === "function") {
    config = nativewindMetro(config, { input: "./styles/global.css" });
  }
} catch (e) {
  // nativewind not installed — keep default config
}

module.exports = config;
