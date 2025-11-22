module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],

    plugins: [
      'react-native-reanimated/plugin'
    ],
  };
};
  