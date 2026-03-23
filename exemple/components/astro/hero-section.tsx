"use client"

interface HeroSectionProps {
  title: string
  subtitle: string
}

export function HeroSection({ 
  title = "Venus in Retrograde", 
  subtitle = "The stars favor deep connections today." 
}: HeroSectionProps) {
  return (
    <section className="px-5 py-6">
      <h1 className="font-serif text-4xl leading-tight tracking-wide text-on-surface text-balance">
        {title}
      </h1>
      <p className="mt-2 text-base text-on-surface-variant leading-relaxed">
        {subtitle}
      </p>
    </section>
  )
}
