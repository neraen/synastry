"use client"

import { Infinity, Sparkles, Sun, Fish } from "lucide-react"

interface ProfileData {
  name: string
  sign: string
  icon: React.ReactNode
}

function ZodiacProfile({ name, sign, icon }: ProfileData) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-20 h-20 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-2xl border border-white/[0.08] shadow-inner">
        {icon}
      </div>
      <div className="text-center">
        <p className="font-serif text-lg font-normal tracking-wide text-on-surface">{name}</p>
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-on-surface-variant/70 mt-0.5">{sign}</p>
      </div>
    </div>
  )
}

function SynergyConnector() {
  return (
    <div className="flex flex-col items-center gap-1 my-2">
      <div className="w-px h-6 bg-gradient-to-b from-primary/30 to-transparent" />
      <Infinity className="w-6 h-6 text-primary/40" />
      <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-secondary/70">Synergy</span>
      <div className="w-px h-6 bg-gradient-to-t from-primary/30 to-transparent" />
    </div>
  )
}

export default function ShareCompatibilityPage() {
  const compatibility = 89
  const person1 = { name: "Elena", sign: "Leo", icon: <Sun className="w-8 h-8 text-primary/70" /> }
  const person2 = { name: "Julian", sign: "Pisces", icon: <Fish className="w-8 h-8 text-primary/70" /> }

  return (
    <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-6">
      <div 
        className="relative w-full max-w-[400px] min-h-[750px] rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] flex flex-col items-center justify-between p-10 border border-white/[0.08]"
        style={{
          background: `
            radial-gradient(circle at 50% 0%, #2f2444 0%, transparent 70%),
            radial-gradient(circle at 50% 100%, rgba(68, 15, 219, 0.06) 0%, transparent 70%),
            #130827
          `
        }}
      >
        {/* Background textures */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,_rgba(233,195,73,0.03)_0%,_transparent_60%)]" />
        </div>

        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/5 rounded-full blur-[60px] -ml-10 -mb-10" />

        {/* Header */}
        <header className="z-10 w-full flex flex-col items-center gap-1">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-primary/80" />
            <span className="font-sans font-medium text-xl tracking-[0.15em] text-primary/90">AstroMatch</span>
          </div>
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mt-2" />
        </header>

        {/* Main content */}
        <main className="z-10 w-full flex-1 flex flex-col items-center justify-start gap-6 mt-8">
          {/* Profiles */}
          <div className="flex flex-col items-center gap-4 w-full">
            <ZodiacProfile {...person1} />
            <SynergyConnector />
            <ZodiacProfile {...person2} />
          </div>

          {/* Percentage display */}
          <div className="relative flex flex-col items-center mt-4">
            <div className="absolute -inset-10 bg-primary/5 blur-[40px] rounded-full opacity-50" />
            <div className="relative z-10 flex flex-col items-center">
              <h1 
                className="font-serif text-[90px] font-extralight tracking-tighter leading-none"
                style={{
                  background: "linear-gradient(to bottom, #f3d47a, #e9c349, #a38520)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}
              >
                {compatibility}%
              </h1>
              <div className="mt-4 px-6 py-1.5 rounded-full border border-primary/20 bg-primary/5">
                <span className="text-[9px] font-semibold text-primary uppercase tracking-[0.3em]">Destined Connection</span>
              </div>
            </div>
          </div>

          {/* Quote */}
          <div className="w-full max-w-[300px] mt-2">
            <p className="text-center text-on-surface/60 text-sm leading-relaxed font-light italic">
              {'"Leo\'s vibrant flame meets the ethereal depths of Pisces, weaving a tapestry of profound spiritual understanding."'}
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="z-10 w-full flex flex-col items-center gap-5 mt-4">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="flex justify-between w-full items-center text-[8px] uppercase tracking-[0.3em] text-on-surface-variant/40">
            <span>astromatch.app</span>
            <span>#SoulmateReading</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
