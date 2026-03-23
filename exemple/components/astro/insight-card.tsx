"use client"

import { ArrowUpRight, Sun, Moon, Sparkles } from "lucide-react"
import { type ReactNode } from "react"

interface InsightCardProps {
  icon: ReactNode
  title: string
  description: string
  symbols?: Array<"sun" | "moon" | "rising">
  highlightText?: string
  onClick?: () => void
}

const symbolIcons = {
  sun: <Sun className="h-4 w-4 text-primary" strokeWidth={1.5} />,
  moon: <Moon className="h-4 w-4 text-on-surface-variant" strokeWidth={1.5} />,
  rising: <Sparkles className="h-4 w-4 text-secondary" strokeWidth={1.5} />
}

export function InsightCard({ 
  icon, 
  title, 
  description, 
  symbols,
  highlightText,
  onClick 
}: InsightCardProps) {
  return (
    <button 
      onClick={onClick}
      className="group w-full rounded-[1.5rem] bg-surface-container-low/40 p-5 text-left backdrop-blur-lg transition-all duration-300 hover:bg-surface-container-low/60"
    >
      {/* Header with icon and arrow */}
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-container/30">
          {icon}
        </div>
        <ArrowUpRight 
          className="h-5 w-5 text-on-surface-variant opacity-0 transition-all duration-300 group-hover:opacity-100" 
          strokeWidth={1.5} 
        />
      </div>
      
      {/* Title */}
      <h3 className="mt-5 font-serif text-lg tracking-wide text-on-surface">
        {title}
      </h3>
      
      {/* Description */}
      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
        {description}
      </p>
      
      {/* Symbols */}
      {symbols && symbols.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          {symbols.map((symbol, index) => (
            <div 
              key={index}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-high/60"
            >
              {symbolIcons[symbol]}
            </div>
          ))}
        </div>
      )}
      
      {/* Highlight text box */}
      {highlightText && (
        <div className="mt-4 rounded-xl bg-secondary-container/20 px-4 py-3">
          <p className="text-sm italic text-secondary">
            {'"'}{highlightText}{'"'}
          </p>
        </div>
      )}
    </button>
  )
}
