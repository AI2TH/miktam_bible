const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'db' to the list of assets extensions so that the preseeded bible.db is bundled with the app
config.resolver.assetExts.push('db');

module.exports = config;
