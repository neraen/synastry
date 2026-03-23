"use client"

import { ChevronRight, Settings2, Bell, Shield, LogOut } from "lucide-react"

interface PreferenceItem {
  id: string
  icon: "settings" | "bell" | "shield" | "logout"
  title: string
  description?: string
  onClick?: () => void
  danger?: boolean
}

interface PreferencesSectionProps {
  items: PreferenceItem[]
}

const iconMap = {
  settings: Settings2,
  bell: Bell,
  shield: Shield,
  logout: LogOut,
}

export function PreferencesSection({ items }: PreferencesSectionProps) {
  return (
    <div className="px-4 py-6">
      <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-4 px-2">
        Preferences & Alignment
      </p>
      
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = iconMap[item.icon]
          
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="w-full flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-surface-container-high/40 active:bg-surface-container-high/60"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                item.danger 
                  ? "bg-destructive/10" 
                  : "bg-surface-container-high/60"
              }`}>
                <Icon 
                  className={`w-5 h-5 ${
                    item.danger 
                      ? "text-destructive" 
                      : "text-primary"
                  }`} 
                  strokeWidth={1.5} 
                />
              </div>
              
              <div className="flex-1 text-left">
                <p className={`font-medium ${
                  item.danger 
                    ? "text-destructive" 
                    : "text-on-surface"
                }`}>
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-sm text-on-surface-variant">
                    {item.description}
                  </p>
                )}
              </div>
              
              {!item.danger && (
                <ChevronRight className="w-5 h-5 text-on-surface-variant" strokeWidth={1.5} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
