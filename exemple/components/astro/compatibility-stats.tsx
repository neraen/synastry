"use client"

interface CompatibilityStatsProps {
  percentage: number
  label?: string
}

export function CompatibilityStats({
  percentage,
  label = "AVG COMPATIBILITY",
}: CompatibilityStatsProps) {
  return (
    <div className="flex flex-col items-center py-8">
      {/* Icon */}
      <div className="w-14 h-14 rounded-full bg-secondary-container/80 flex items-center justify-center mb-4">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-on-surface"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      </div>
      
      {/* Percentage */}
      <p className="text-4xl font-medium text-on-surface mb-1">
        {percentage}%
      </p>
      
      {/* Label */}
      <p className="text-xs text-on-surface-variant uppercase tracking-widest">
        {label}
      </p>
      
      {/* Divider line */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-outline-variant/30 to-transparent mt-8" />
    </div>
  )
}
