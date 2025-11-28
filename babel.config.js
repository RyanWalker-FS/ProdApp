module.exports = function (api) {
  api && api.cache && api.cache(true);

  // Include nativewind/babel plugin only when it's installed. This prevents
  // Metro/Babel from failing when nativewind isn't added to dependencies.
  const plugins = [];
  try {
    // Use require.resolve to check availability without throwing a require error
    require.resolve("nativewind/babel");
    plugins.push("nativewind/babel");
  } catch (e) {
    // nativewind isn't installed — skip the plugin. This keeps the dev server
    // resilient for environments where you haven't opted into NativeWind.
  }

  return {
    presets: ["babel-preset-expo"],
    plugins,
  };
};
