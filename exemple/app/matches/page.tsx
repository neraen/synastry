"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/astro/header"
import { BottomNav } from "@/components/astro/bottom-nav"
import { MetricCard } from "@/components/astro/metric-card"
import { CelestialInsightsCard } from "@/components/astro/celestial-insights-card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function MatchesPage() {
  const [animatedPercentage, setAnimatedPercentage] = useState(0)
  const targetPercentage = 78

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(targetPercentage)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const metrics = [
    { label: "Emotional", title: "Deep Resonance", percentage: 80 },
    { label: "Communication", title: "Fluid Exchange", percentage: 65 },
    { label: "Attraction", title: "Magnetic Pull", percentage: 90 },
    { label: "Long-term", title: "Stable Orbit", percentage: 72 },
  ]

  const insightText = `The stars suggest a profound alignment between your Lunar placements. While your communication styles may require conscious effort during Mercury retrogrades, the underlying emotional tether is exceptionally resilient. This match thrives on shared creative ventures and quiet, domestic intimacy.`

  return (
    <div className="min-h-screen bg-surface pb-24">
      <Header userName="Selena" />
      
      <main className="mx-auto max-w-md px-4 pt-6">
        {/* Hero percentage */}
        <section className="mb-10 flex flex-col items-center text-center">
          <div className="relative mb-3">
            <span 
              className="bg-gradient-to-r from-primary to-primary-container bg-clip-text font-serif text-7xl font-medium text-transparent transition-all duration-1000"
            >
              {Math.round(animatedPercentage)}%
            </span>
          </div>
          <h1 className="mb-2 font-serif text-2xl italic text-on-surface">
            Strong emotional connection
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            Cosmic Compatibility Result
          </p>
        </section>

        {/* Metrics */}
        <section className="mb-8 flex flex-col gap-3">
          {metrics.map((metric, index) => (
            <MetricCard
              key={index}
              label={metric.label}
              title={metric.title}
              percentage={metric.percentage}
            />
          ))}
        </section>

        {/* Celestial Insights */}
        <section className="mb-8">
          <CelestialInsightsCard
            insightText={insightText}
            signs={{ first: "Leo", second: "Taurus" }}
          />
        </section>

        {/* Action buttons */}
        <section className="flex flex-col gap-3">
          <Button 
            className="w-full rounded-full bg-gradient-to-r from-primary to-primary-container py-6 text-sm font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
          >
            Save this match
            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
          </Button>
          
          <Button 
            variant="outline"
            className="w-full rounded-full border-outline-variant/20 bg-surface-container-high/40 py-6 text-sm font-semibold uppercase tracking-[0.15em] text-on-surface backdrop-blur-sm hover:bg-surface-container-highest/60"
          >
            Share Result
          </Button>
        </section>
      </main>

      <BottomNav activeItem="matches" />
    </div>
  )
}
