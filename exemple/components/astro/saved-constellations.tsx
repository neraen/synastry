"use client"

import Image from "next/image"
import { Heart, ArrowRight } from "lucide-react"

interface SavedProfile {
  id: string
  name: string
  age: number
  avatarUrl: string
  matchPercentage: number
}

interface SavedConstellationsProps {
  profiles: SavedProfile[]
  onViewAll?: () => void
}

export function SavedConstellations({
  profiles,
  onViewAll,
}: SavedConstellationsProps) {
  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl text-on-surface leading-tight">
            Saved
          </h2>
          <h2 className="font-serif text-2xl text-on-surface leading-tight">
            Constellations
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Profile matches you've bookmarked for alignment.
          </p>
        </div>
        
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-primary text-sm font-medium uppercase tracking-wide"
        >
          View
          <br />
          All
          <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Profile Grid */}
      <div className="grid grid-cols-2 gap-4">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="relative rounded-2xl overflow-hidden aspect-[4/5]"
          >
            <Image
              src={profile.avatarUrl}
              alt={profile.name}
              fill
              className="object-cover"
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/20 to-transparent" />
            
            {/* Match badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-surface/60 backdrop-blur-sm">
              <Heart className="w-3 h-3 text-primary fill-primary" />
              <span className="text-xs text-primary font-medium">
                {profile.matchPercentage}% Match
              </span>
            </div>
            
            {/* Name and age */}
            <div className="absolute bottom-3 left-3">
              <p className="text-on-surface font-medium">
                {profile.name}, {profile.age}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
