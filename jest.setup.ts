// ─── AsyncStorage ─────────────────────────────────────────────────────────────
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// ─── expo-secure-store ────────────────────────────────────────────────────────
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ─── expo-notifications ───────────────────────────────────────────────────────
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[mock]' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

// ─── expo-router ──────────────────────────────────────────────────────────────
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useSegments: jest.fn(() => []),
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/'),
  Link: 'Link',
  Redirect: 'Redirect',
  Stack: { Screen: 'Screen' },
  Tabs: { Screen: 'Screen' },
}));

// ─── react-i18next ────────────────────────────────────────────────────────────
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({
    t: (k: string, opts?: any) => opts?.defaultValue ?? k,
    i18n: { language: 'ru', changeLanguage: jest.fn().mockResolvedValue(undefined) },
  })),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
  Trans: ({ children }: any) => children,
}));

// ─── i18next ──────────────────────────────────────────────────────────────────
jest.mock('i18next', () => ({
  __esModule: true,
  default: {
    language: 'ru',
    changeLanguage: jest.fn().mockResolvedValue(undefined),
    t: (k: string) => k,
    use: jest.fn().mockReturnThis(),
    init: jest.fn().mockResolvedValue(undefined),
  },
}));

// ─── expo-sqlite ──────────────────────────────────────────────────────────────
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    runSync: jest.fn(),
    getAllSync: jest.fn(() => []),
    getFirstSync: jest.fn(() => null),
    prepareSync: jest.fn(() => ({
      executeSync: jest.fn(() => ({ rows: [] })),
      finalizeSync: jest.fn(),
    })),
    withTransactionSync: jest.fn((fn: () => void) => fn()),
    closeSync: jest.fn(),
  })),
}));

// ─── react-native-reanimated ──────────────────────────────────────────────────
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// ─── react-native-gesture-handler ────────────────────────────────────────────
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  const TouchableOpacity = require('react-native').TouchableOpacity;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: require('react-native').ScrollView,
    Slider: View,
    Switch: require('react-native').Switch,
    TextInput: require('react-native').TextInput,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: require('react-native').FlatList,
    gestureHandlerRootHOC: (c: any) => c,
    GestureHandlerRootView: View,
    TouchableOpacity,
    TouchableHighlight: require('react-native').TouchableHighlight,
    TouchableNativeFeedback: View,
    TouchableWithoutFeedback: require('react-native').TouchableWithoutFeedback,
    Directions: {},
    Gesture: { Pan: jest.fn(() => ({ onUpdate: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() })) },
  };
});

// ─── expo-crypto ──────────────────────────────────────────────────────────────
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-1234'),
}));

// ─── @expo/vector-icons ───────────────────────────────────────────────────────
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
}));
