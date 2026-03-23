import { Header } from "@/components/astro/header"
import { BottomNav } from "@/components/astro/bottom-nav"
import { ProfileHeader } from "@/components/astro/profile-header"
import { SubscriptionCard } from "@/components/astro/subscription-card"
import { CompatibilityStats } from "@/components/astro/compatibility-stats"
import { SavedConstellations } from "@/components/astro/saved-constellations"
import { PreferencesSection } from "@/components/astro/preferences-section"

const savedProfiles = [
  {
    id: "1",
    name: "Julian",
    age: 29,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face",
    matchPercentage: 92,
  },
  {
    id: "2",
    name: "Amara",
    age: 27,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop&crop=face",
    matchPercentage: 88,
  },
  {
    id: "3",
    name: "Soren",
    age: 31,
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop&crop=face",
    matchPercentage: 76,
  },
  {
    id: "4",
    name: "Mia",
    age: 26,
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop&crop=face",
    matchPercentage: 95,
  },
]

const preferenceItems = [
  {
    id: "criteria",
    icon: "settings" as const,
    title: "Matching Criteria",
    description: "Sun sign filters, distance, and age",
  },
  {
    id: "alerts",
    icon: "bell" as const,
    title: "Celestial Alerts",
    description: "New matches and transit notifications",
  },
  {
    id: "privacy",
    icon: "shield" as const,
    title: "Privacy & Sanctuary",
    description: "Visibility and data protection",
  },
  {
    id: "logout",
    icon: "logout" as const,
    title: "Sign Out",
    danger: true,
  },
]

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-surface pb-24">
      <Header userName="Elena" />

      <ProfileHeader
        name="Elena Vance"
        avatarUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face"
        sunSign="Scorpio"
        moonSign="Pisces"
        risingSign="Leo"
        bio="Seeker of cosmic connections and deep conversations. Navigating the stars to find a resonant soul."
        isOnline={true}
      />

      <SubscriptionCard
        planName="Celestial Premium"
        description="Unlimited natal chart comparisons and priority matching"
        expiryDate="Dec 2024"
      />

      <CompatibilityStats percentage={84} />

      <SavedConstellations profiles={savedProfiles} />

      <PreferencesSection items={preferenceItems} />

      <BottomNav activeTab="profile" />
    </main>
  )
}
