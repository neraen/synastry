"use client"

import { Sparkles } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface HeaderProps {
  userName?: string
  userAvatar?: string
}

export function Header({ userName = "Selena", userAvatar }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
        <span className="font-serif text-lg tracking-wide text-on-surface">
          AstroMatch
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-sm text-on-surface-variant">
          Hi, {userName}
        </span>
        <Avatar className="h-9 w-9 border border-outline-variant/15">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback className="bg-surface-container-high text-on-surface text-xs">
            {userName.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
