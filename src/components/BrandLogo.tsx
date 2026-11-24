type Props = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-9 w-9 rounded-xl text-sm',
  md: 'h-12 w-12 rounded-2xl text-lg',
  lg: 'h-14 w-14 rounded-2xl text-xl',
}

// Single placeholder brand mark. A real logo asset can be supplied by the
// branding endpoint later; this component never hard-codes a file path.
export function BrandLogo({ size = 'md', className = '' }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center border border-gold-400/50 bg-brand-700 font-black leading-none text-[#F7E7C1] shadow-card ${sizes[size]} ${className}`}
    >
      <span className="-mt-0.5">كرم</span>
    </span>
  )
}
