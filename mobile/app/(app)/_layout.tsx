import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

type IconName = React.ComponentProps<typeof Ionicons>['name']

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1D6296',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { borderTopColor: '#E5E7EB' },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      {[
        { name: 'dashboard', title: 'Home', icon: 'home' },
        { name: 'assessments/index', title: 'Assessments', icon: 'clipboard' },
        { name: 'mood', title: 'Mood', icon: 'heart' },
        { name: 'journal', title: 'Journal', icon: 'book' },
        { name: 'profile', title: 'Profile', icon: 'person' },
      ].map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon as IconName} size={size} color={color} />
            ),
          }}
        />
      ))}
      <Tabs.Screen name="assessments/[id]" options={{ href: null }} />
    </Tabs>
  )
}
