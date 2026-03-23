"use client"

import Link from "next/link"
import { Sparkles, Star, ArrowRight } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface relative overflow-hidden">
      {/* Background stars/dots decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-12 w-1 h-1 bg-on-surface-variant/40 rounded-full" />
        <div className="absolute top-32 right-24 w-0.5 h-0.5 bg-on-surface-variant/30 rounded-full" />
        <div className="absolute top-48 left-8 w-1 h-1 bg-on-surface-variant/20 rounded-full" />
        <div className="absolute top-64 right-8 w-0.5 h-0.5 bg-on-surface-variant/40 rounded-full" />
        <div className="absolute bottom-96 left-12 w-1 h-1 bg-on-surface-variant/30 rounded-full" />
        <div className="absolute bottom-80 right-16 w-0.5 h-0.5 bg-on-surface-variant/20 rounded-full" />
      </div>

      <div className="relative z-10 px-6 pt-8 pb-12 flex flex-col min-h-screen">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <span className="font-serif text-xl text-primary tracking-wide">AstroMatch</span>
        </div>

        {/* Badge */}
        <div className="mt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high/60 backdrop-blur-sm">
            <Star className="w-4 h-4 text-primary fill-primary" strokeWidth={1.5} />
            <span className="text-xs font-medium tracking-widest text-on-surface-variant uppercase">
              The stars are aligning
            </span>
          </div>
        </div>

        {/* Hero Title */}
        <div className="mt-8">
          <h1 className="font-serif text-4xl md:text-5xl leading-tight text-on-surface">
            Discover your{" "}
            <br />
            true{" "}
            <span className="text-primary italic">compatibility</span>
          </h1>
        </div>

        {/* Description */}
        <p className="mt-6 text-on-surface-variant leading-relaxed max-w-sm">
          Where ancient wisdom meets modern connection. Journey through the zodiac to find a soul that resonates with your celestial frequency.
        </p>

        {/* Avatar Stack with Social Proof */}
        <div className="mt-8 flex items-center gap-4">
          <div className="flex -space-x-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-surface overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face" 
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-surface overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face" 
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-surface overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face" 
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-surface flex items-center justify-center">
              <span className="text-xs font-semibold text-on-surface-variant">+12K</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-sm text-on-surface-variant">
            Join 12,000+ souls already connected
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-8" />

        {/* Bottom Card - Glassmorphism */}
        <div className="mt-auto -mx-6 px-6">
          <div className="bg-surface-container-low/80 backdrop-blur-xl rounded-t-[2.5rem] px-6 pt-8 pb-8 border-t border-outline-variant/10">
            {/* Card Header */}
            <h2 className="font-serif text-2xl text-on-surface">Begin your journey</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              {"We'll need your birth chart details to find your cosmic matches."}
            </p>

            {/* Primary CTA */}
            <Link href="/">
              <button className="mt-6 w-full py-4 px-6 rounded-full bg-gradient-to-r from-primary to-primary-container flex items-center justify-center gap-3 group transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
                <span className="font-semibold text-surface tracking-wide">Create Birth Chart</span>
                <ArrowRight className="w-5 h-5 text-surface transition-transform group-hover:translate-x-1" strokeWidth={2} />
              </button>
            </Link>

            {/* Secondary Button */}
            <Link href="/">
              <button className="mt-3 w-full py-4 px-6 rounded-full bg-surface-bright/60 border border-outline-variant/10 transition-all duration-300 hover:bg-surface-bright">
                <span className="font-semibold text-on-surface">Login</span>
              </button>
            </Link>

            {/* Divider */}
            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-outline-variant/20" />
              <span className="text-xs text-on-surface-variant/60 tracking-widest uppercase">Or sign up with</span>
              <div className="flex-1 h-px bg-outline-variant/20" />
            </div>

            {/* Social Buttons */}
            <div className="mt-6 flex gap-4">
              <button className="flex-1 py-3.5 px-4 rounded-full bg-surface-container-high/60 border border-outline-variant/10 flex items-center justify-center gap-2 transition-all duration-300 hover:bg-surface-container-high">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"/>
                  <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"/>
                  <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"/>
                  <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7## 301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"/>
                </svg>
                <span className="text-sm font-medium text-on-surface">Google</span>
              </button>

              <button className="flex-1 py-3.5 px-4 rounded-full bg-surface-container-high/60 border border-outline-variant/10 flex items-center justify-center gap-2 transition-all duration-300 hover:bg-surface-container-high">
                <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-sm font-medium text-on-surface">Facebook</span>
              </button>
            </div>

            {/* Terms */}
            <p className="mt-6 text-center text-xs text-on-surface-variant/60 leading-relaxed">
              {"By continuing, you agree to AstroMatch's"}{" "}
              <Link href="/terms" className="text-on-surface-variant underline underline-offset-2 hover:text-on-surface">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-on-surface-variant underline underline-offset-2 hover:text-on-surface">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
