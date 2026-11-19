const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to mark non-essential hardware features as optional in AndroidManifest.xml.
 * Prevents Google Play Console from restricting app availability on tablets, foldables,
 * desktops/ChromeOS, and Android XR users due to portrait orientation or microphone usage.
 */
function withHardwareFeatures(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    if (!androidManifest['uses-feature']) {
      androidManifest['uses-feature'] = [];
    }

    const desiredFeatures = [
      { 'android:name': 'android.hardware.screen.portrait', 'android:required': 'false' },
      { 'android:name': 'android.hardware.screen.landscape', 'android:required': 'false' },
      { 'android:name': 'android.hardware.microphone', 'android:required': 'false' },
    ];

    for (const feat of desiredFeatures) {
      const existing = androidManifest['uses-feature'].find(
        (f) => f.$ && f.$['android:name'] === feat['android:name']
      );
      if (existing) {
        existing.$['android:required'] = feat['android:required'];
      } else {
        androidManifest['uses-feature'].push({
          $: {
            'android:name': feat['android:name'],
            'android:required': feat['android:required'],
          },
        });
      }
    }

    return config;
  });
}

module.exports = withHardwareFeatures;
