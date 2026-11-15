module.exports = function (api) {
  // api.env() also sets up caching keyed on BABEL_ENV / NODE_ENV, so dev and
  // production builds don't share a cached config.
  const isProduction = api.env('production');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-worklets/plugin',
      // Keep user data (questions, notes, transcripts) out of the device log in
      // release builds. Errors and warnings are kept for crash diagnostics.
      ...(isProduction ? [['transform-remove-console', { exclude: ['error', 'warn'] }]] : []),
    ],
  };
};
