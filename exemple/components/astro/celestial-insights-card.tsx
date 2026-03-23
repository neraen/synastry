import { Sparkles } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface CelestialInsightsCardProps {
  insightText: string
  signs: {
    first: string
    second: string
  }
  avatars?: {
    first?: string
    second?: string
  }
}

export function CelestialInsightsCard({ 
  insightText, 
  signs,
  avatars 
}: CelestialInsightsCardProps) {
  return (
    <div className="rounded-3xl bg-surface-container-low/80 p-6 backdrop-blur-md">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-container/30">
          <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
          Celestial Insights
        </span>
      </div>
      
      {/* Insight text */}
      <p className="mb-6 text-sm leading-relaxed text-on-surface/90">
        {insightText}
      </p>
      
      {/* Avatars and alignment */}
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          <Avatar className="h-8 w-8 border-2 border-surface-container-low">
            <AvatarImage src={avatars?.first} />
            <AvatarFallback className="bg-surface-container-high text-xs text-on-surface">
              {signs.first.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <Avatar className="h-8 w-8 border-2 border-surface-container-low">
            <AvatarImage src={avatars?.second} />
            <AvatarFallback className="bg-surface-container-high text-xs text-on-surface">
              {signs.second.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wider text-primary">
            {signs.first} + {signs.second}
          </span>
          <span className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">
            Alignment
          </span>
        </div>
      </div>
    </div>
  )
}
