"use client"

import { useEffect, useState } from "react"

interface CosmicSyncCircleProps {
  percentage: number
  size?: number
  strokeWidth?: number
}

export function CosmicSyncCircle({ 
  percentage, 
  size = 160, 
  strokeWidth = 8 
}: CosmicSyncCircleProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0)
  
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (animatedPercentage / 100) * circumference
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage)
    }, 100)
    return () => clearTimeout(timer)
  }, [percentage])

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background circle */}
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
      
      {/* Animated progress circle */}
      <svg 
        className="absolute -rotate-90" 
        width={size} 
        height={size}
      >
        <defs>
          <linearGradient id="cosmicGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--primary-container)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#cosmicGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {/* Center content */}
      <div className="flex flex-col items-center justify-center">
        <span className="font-serif text-4xl font-medium text-on-surface">
          {Math.round(animatedPercentage)}%
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
          Cosmic Sync
        </span>
      </div>
    </div>
  )
}
