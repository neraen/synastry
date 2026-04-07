// =============================================================================
// AstroMatch - Dynamic Expo Configuration
// =============================================================================
// This file allows environment-specific configuration
// =============================================================================

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';
const IS_PROD = process.env.APP_VARIANT === 'production' || (!IS_DEV && !IS_PREVIEW);

const getUniqueIdentifier = () => {
  if (IS_DEV) return 'com.astromatch.app.dev';
  if (IS_PREVIEW) return 'com.astromatch.app.preview';
  return 'com.astromatch.app';
};

const getAppName = () => {
  if (IS_DEV) return 'Lunestia (Dev)';
  if (IS_PREVIEW) return 'Lunestia (Preview)';
  return 'Lunestia';
};

export default {
  expo: {
    name: getAppName(),
    slug: 'astromatch',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/lunestia-icon.png',
    scheme: 'astromatch',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    // iOS Configuration
    ios: {
      supportsTablet: true,
      bundleIdentifier: getUniqueIdentifier(),
      buildNumber: '1',
      infoPlist: {
        NSCameraUsageDescription: 'Cette app nécessite un accès à la caméra pour prendre des photos.',
        NSPhotoLibraryUsageDescription: 'Cette app nécessite un accès à vos photos.',
        CFBundleAllowMixedLocalizations: true,
      },
      config: {
        usesNonExemptEncryption: false,
      },
    },

    // Android Configuration
    android: {
      package: getUniqueIdentifier(),
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: '#0A0A1A',
        foregroundImage: './assets/images/lunestia-icon.png',
      },
      edgeToEdgeEnabled: true,
      permissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
      ],
    },

    // Web Configuration
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
      bundler: 'metro',
    },

    // Splash Screen
    splash: {
      image: './assets/images/lunestia-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0A0A1A',
    },

    // Plugins
    plugins: [
      'expo-router',
      'expo-secure-store',
      '@react-native-community/datetimepicker',
      'expo-localization',
      [
        'expo-splash-screen',
        {
          image: './assets/images/lunestia-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#0A0A1A',
          dark: {
            backgroundColor: '#0A0A1A',
          },
        },
      ],
    ],

    // Experiments
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    // Extra configuration
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL_PROD || 'https://astro-api.clement-silvestre.com',
      eas: {
        projectId: '8968e738-730c-4db7-b676-9749546b6740',
      },
    },

    // Updates (OTA)
    updates: {
      url: 'https://u.expo.dev/8968e738-730c-4db7-b676-9749546b6740',
    },

    // Assets
    assetBundlePatterns: ['**/*'],

    // Owner (Expo username)
    owner: 'neraen',
  },
};
