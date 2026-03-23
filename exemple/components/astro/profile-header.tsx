"use client"

import Image from "next/image"

interface ProfileHeaderProps {
  name: string
  avatarUrl: string
  sunSign: string
  moonSign: string
  risingSign: string
  bio: string
  isOnline?: boolean
}

export function ProfileHeader({
  name,
  avatarUrl,
  sunSign,
  moonSign,
  risingSign,
  bio,
  isOnline = true,
}: ProfileHeaderProps) {
  return (
    <div className="flex flex-col items-center text-center px-6 pt-8 pb-6">
      {/* Avatar with online indicator */}
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-full overflow-hidden ring-2 ring-surface-container-high">
          <Image
            src={avatarUrl}
            alt={name}
            width={112}
            height={112}
            className="w-full h-full object-cover"
          />
        </div>
        {isOnline && (
          <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-primary border-2 border-surface" />
        )}
      </div>

      {/* Name */}
      <h1 className="font-serif text-3xl text-on-surface mb-3 tracking-wide">
        {name}
      </h1>

      {/* Astrological signs */}
      <div className="flex items-center gap-2 text-sm mb-2">
        <span className="text-primary font-medium">{sunSign} Sun</span>
        <span className="text-on-surface-variant">·</span>
        <span className="text-primary font-medium">{moonSign} Moon</span>
        <span className="text-on-surface-variant">·</span>
      </div>
      <p className="text-on-surface text-sm mb-4">{risingSign} Rising</p>

      {/* Bio */}
      <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs text-balance">
        {bio}
      </p>
    </div>
  )
}
