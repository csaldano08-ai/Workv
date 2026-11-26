import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/features/app/AppProvider';
import { colors, font } from '../../src/theme/tokens';
import { t } from '../../src/i18n/it';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue | null; size: number }) {
    return <Ionicons name={name} color={typeof color === "string" ? color : undefined} size={size} />;
  };

export default function TabsLayout() {
  const { snapshot } = useApp();
  const insets = useSafeAreaInsets();
  const shoppingCount = snapshot?.shopping.trips.find((tr) => tr.date === snapshot.today)?.lines.length;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.inkSoft,
        // 49 = altezza standard della barra; +6 di respiro, così le etichette non vengono tagliate
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, borderTopWidth: 1, height: 55 + insets.bottom, paddingTop: 2 },
        tabBarLabelStyle: { fontSize: 12, fontFamily: font.bold },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.today'), tabBarIcon: icon('sunny-outline') }} />
      <Tabs.Screen name="settimana" options={{ title: t('tabs.week'), tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen
        name="spesa"
        options={{
          title: t('tabs.shopping'),
          tabBarIcon: icon('basket-outline'),
          tabBarBadge: shoppingCount ? shoppingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.peach, color: colors.ink, fontFamily: font.extrabold, fontSize: 11 },
        }}
      />
      <Tabs.Screen name="dispensa" options={{ title: t('tabs.pantry'), tabBarIcon: icon('file-tray-stacked-outline') }} />
      <Tabs.Screen name="ricette" options={{ title: t('tabs.recipes'), tabBarIcon: icon('book-outline') }} />
    </Tabs>
  );
}
