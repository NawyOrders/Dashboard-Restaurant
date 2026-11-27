import { useEffect, useState } from 'react'

type Props = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  // The restaurant's logo and name, from its own branding data.
  logoUrl?: string | null
  name?: string
}

const sizes: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-9 w-9 rounded-xl text-sm',
  md: 'h-12 w-12 rounded-2xl text-lg',
  lg: 'h-14 w-14 rounded-2xl text-xl',
}

// Shows the restaurant's logo; without one (or if it fails to load) the first
// letter of its name. No restaurant is hard-coded here.
export function BrandLogo({ size = 'md', className = '', logoUrl = null, name = '' }: Props) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [logoUrl])
  const initial = Array.from(name.trim())[0] ?? ''
  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`shrink-0 border border-gold-400/50 bg-white object-cover shadow-card ${sizes[size]} ${className}`}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center border border-gold-400/50 bg-brand-700 font-black uppercase leading-none text-[#F7E7C1] shadow-card ${sizes[size]} ${className}`}
    >
      <span className="-mt-0.5">{initial}</span>
    </span>
  )
}
