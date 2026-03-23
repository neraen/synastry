"use client"

interface SubscriptionCardProps {
  planName: string
  description: string
  expiryDate: string
  onManage?: () => void
}

export function SubscriptionCard({
  planName,
  description,
  expiryDate,
  onManage,
}: SubscriptionCardProps) {
  return (
    <div className="mx-4 p-5 rounded-2xl bg-surface-container-low/60 backdrop-blur-xl">
      <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-2">
        Current Plan
      </p>
      
      <h3 className="font-serif text-xl text-on-surface mb-2">
        {planName}
      </h3>
      
      <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
        {description} active until {expiryDate}.
      </p>
      
      <button
        onClick={onManage}
        className="px-5 py-2.5 rounded-full bg-gradient-to-r from-primary to-primary-container text-primary-foreground font-medium text-sm transition-all hover:opacity-90 active:scale-95"
      >
        Manage Subscription
      </button>
    </div>
  )
}
