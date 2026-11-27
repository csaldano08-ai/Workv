import type Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/features/app/AppProvider';
import { useReducedMotion } from '../../src/ui/useReducedMotion';
import { TabIcon, hopTab } from '../../src/ui/TabIcon';
import { colors, font } from '../../src/theme/tokens';
import { t } from '../../src/i18n/it';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName, route: string) =>
  function TabBarIcon({ color, size, focused }: { color: ColorValue | null; size: number; focused: boolean }) {
    return <TabIcon name={name} route={route} color={color} size={size} focused={focused} />;
  };

export default function TabsLayout() {
  const { snapshot } = useApp();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const shoppingCount = snapshot?.shopping.trips.find((tr) => tr.date === snapshot.today)?.lines.length;
  return (
    <Tabs
      // al tocco di una scheda la sua icona fa un saltello
      screenListeners={({ route }) => ({ tabPress: () => hopTab(route.name) })}
      screenOptions={{
        headerShown: false,
        // cambio di scheda: la pagina nuova scivola appena dal lato della scheda e si dissolve (ferma con "Riduci movimento")
        animation: reduced ? 'none' : 'shift',
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.inkSoft,
        // 49 = altezza standard della barra; +6 di respiro, così le etichette non vengono tagliate
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, borderTopWidth: 1, height: 55 + insets.bottom, paddingTop: 2 },
        tabBarLabelStyle: { fontSize: 12, fontFamily: font.bold },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.today'), tabBarIcon: icon('sunny-outline', 'index') }} />
      <Tabs.Screen name="settimana" options={{ title: t('tabs.week'), tabBarIcon: icon('calendar-outline', 'settimana') }} />
      <Tabs.Screen
        name="spesa"
        options={{
          title: t('tabs.shopping'),
          tabBarIcon: icon('basket-outline', 'spesa'),
          tabBarBadge: shoppingCount ? shoppingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.peach, color: colors.ink, fontFamily: font.extrabold, fontSize: 11 },
        }}
      />
      <Tabs.Screen name="dispensa" options={{ title: t('tabs.pantry'), tabBarIcon: icon('file-tray-stacked-outline', 'dispensa') }} />
      <Tabs.Screen name="ricette" options={{ title: t('tabs.recipes'), tabBarIcon: icon('book-outline', 'ricette') }} />
    </Tabs>
  );
}
