"use client"

import { ArrowRight } from "lucide-react"
import { CosmicSyncCircle } from "./cosmic-sync-circle"

interface CompatibilityCardProps {
  syncPercentage?: number
  description?: string
  onAnalyzeClick?: () => void
}

export function CompatibilityCard({ 
  syncPercentage = 88,
  description = "Celestial energy is 88% synchronized for new romantic ventures. The moon's position in Taurus stabilizes your emotional core.",
  onAnalyzeClick
}: CompatibilityCardProps) {
  return (
    <div className="mx-5 overflow-hidden rounded-[2rem] bg-surface-container-low/60 backdrop-blur-xl">
      <div className="p-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-high/80 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">
            Daily Alignment
          </span>
        </div>
        
        {/* Title */}
        <h2 className="mt-5 font-serif text-2xl leading-tight tracking-wide text-on-surface">
          Your compatibility today
        </h2>
        
        {/* Description */}
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
          {description}
        </p>
        
        {/* CTA Button */}
        <button
          onClick={onAnalyzeClick}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container py-4 text-sm font-medium text-on-primary transition-all duration-300 hover:opacity-90 active:scale-[0.98]"
        >
          Analyze a new match
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        
        {/* Cosmic Sync Circle */}
        <div className="mt-8 flex justify-center">
          <CosmicSyncCircle percentage={syncPercentage} />
        </div>
      </div>
    </div>
  )
}
