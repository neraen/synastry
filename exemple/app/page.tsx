"use client"

import { useState } from "react"
import { Sparkles, Star } from "lucide-react"
import { 
  Header, 
  HeroSection, 
  CompatibilityCard, 
  InsightCard, 
  TransitTimeline, 
  BottomNav 
} from "@/components/astro"

const transits = [
  {
    id: "1",
    startDate: "Oct 12",
    endDate: "Oct 15",
    title: "Mars Opposite Saturn",
    description: "Expect some friction in professional partnerships. Patience is your greatest cosmic ally during this transit.",
    isHighlighted: true
  },
  {
    id: "2",
    startDate: "Oct 18",
    title: "New Moon in Libra",
    description: "A perfect window for setting intentions around balance and aesthetic harmony in your home.",
    isHighlighted: false
  }
]

export default function Home() {
  const [activeNav, setActiveNav] = useState<"home" | "matches" | "insights" | "profile">("home")

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Background gradient effect */}
      <div 
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(68, 15, 219, 0.15) 0%, transparent 50%)'
        }}
      />
      
      <div className="relative z-10 mx-auto max-w-md">
        <Header userName="Selena" />
        
        <HeroSection 
          title="Venus in Retrograde" 
          subtitle="The stars favor deep connections today."
        />
        
        <CompatibilityCard 
          syncPercentage={88}
          description="Celestial energy is 88% synchronized for new romantic ventures. The moon's position in Taurus stabilizes your emotional core."
          onAnalyzeClick={() => console.log("Analyze clicked")}
        />
        
        {/* Insight Cards Grid */}
        <div className="mt-8 grid gap-4 px-5">
          <InsightCard
            icon={<Sparkles className="h-5 w-5 text-secondary" strokeWidth={1.5} />}
            title="Your birth chart"
            description="Deep dive into your sun, moon, and rising signs to unlock your cosmic DNA."
            symbols={["sun", "moon", "rising"]}
          />
          
          <InsightCard
            icon={<Star className="h-5 w-5 text-secondary" strokeWidth={1.5} />}
            title="Daily insights"
            description="Personalized horoscopes based on your current transits and house placements."
            highlightText="Communication will be key as Mercury enters your 5th house."
          />
        </div>
        
        <TransitTimeline 
          transits={transits}
          onViewCalendar={() => console.log("View calendar")}
        />
      </div>
      
      <BottomNav 
        activeItem={activeNav}
        onItemClick={setActiveNav}
      />
    </div>
  )
}
