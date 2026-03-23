"use client"

import { Home, Heart, Sparkles, User } from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = "home" | "matches" | "insights" | "profile"

interface BottomNavProps {
  activeItem?: NavItem
  onItemClick?: (item: NavItem) => void
}

const navItems: { id: NavItem; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "matches", label: "Matches", icon: Heart },
  { id: "insights", label: "Insights", icon: Sparkles },
  { id: "profile", label: "Profile", icon: User },
]

export function BottomNav({ activeItem = "home", onItemClick }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant/10 bg-surface-container-lowest/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeItem === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 transition-all duration-300",
                isActive ? "text-primary" : "text-on-surface-variant"
              )}
            >
              <Icon 
                className={cn(
                  "h-5 w-5 transition-all duration-300",
                  isActive && "drop-shadow-[0_0_8px_rgba(233,195,73,0.5)]"
                )} 
                strokeWidth={1.5} 
              />
              <span className="text-[10px] uppercase tracking-[0.1em]">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
      
      {/* Safe area spacer for mobile */}
      <div className="h-safe-area-inset-bottom bg-surface-container-lowest" />
    </nav>
  )
}
