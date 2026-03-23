"use client"

interface Transit {
  id: string
  startDate: string
  endDate?: string
  title: string
  description: string
  isHighlighted?: boolean
}

interface TransitTimelineProps {
  transits: Transit[]
  onViewCalendar?: () => void
}

export function TransitTimeline({ transits, onViewCalendar }: TransitTimelineProps) {
  return (
    <section className="px-5 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl tracking-wide text-on-surface">
          Upcoming Transits
        </h2>
        <button 
          onClick={onViewCalendar}
          className="text-xs uppercase tracking-[0.1em] text-primary transition-opacity hover:opacity-80"
        >
          View Calendar
        </button>
      </div>
      
      {/* Timeline */}
      <div className="relative mt-6">
        {/* Gradient vertical line */}
        <div 
          className="absolute left-1 top-2 h-[calc(100%-1rem)] w-px"
          style={{
            background: 'linear-gradient(to bottom, transparent, var(--outline-variant), transparent)'
          }}
        />
        
        {/* Transit items */}
        <div className="flex flex-col gap-8">
          {transits.map((transit, index) => (
            <div key={transit.id} className="relative pl-6">
              {/* Dot indicator */}
              <div 
                className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${
                  transit.isHighlighted 
                    ? 'bg-primary shadow-[0_0_12px_rgba(233,195,73,0.5)]' 
                    : 'bg-outline-variant'
                }`}
              />
              
              {/* Date */}
              <p className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">
                {transit.endDate 
                  ? `${transit.startDate} — ${transit.endDate}`
                  : transit.startDate
                }
              </p>
              
              {/* Title */}
              <h3 className="mt-2 font-serif text-base tracking-wide text-on-surface">
                {transit.title}
              </h3>
              
              {/* Description */}
              <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
                {transit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
