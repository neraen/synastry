"use client"

import { useEffect, useState } from "react"

interface MetricCardProps {
  label: string
  title: string
  percentage: number
}

export function MetricCard({ label, title, percentage }: MetricCardProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0)
  
  const size = 64
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (animatedPercentage / 100) * circumference
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage)
    }, 200)
    return () => clearTimeout(timer)
  }, [percentage])

  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface-container-low/60 px-5 py-4 backdrop-blur-sm">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">
          {label}
        </span>
        <span className="font-serif text-xl text-on-surface">
          {title}
        </span>
      </div>
      
      {/* Mini circular progress */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="absolute" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-surface-container-high"
          />
        </svg>
        
        <svg 
          className="absolute -rotate-90" 
          width={size} 
          height={size}
        >
          <defs>
            <linearGradient id={`metricGradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--primary-container)" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#metricGradient-${label})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        <span className="text-sm font-medium text-on-surface">
          {Math.round(animatedPercentage)}%
        </span>
      </div>
    </div>
  )
}
