import { createContext } from 'react'

// The current restaurant's own logo and name, shared with pop-ups so they can
// show the logo in their header. Empty until branding loads or when the
// restaurant has no logo.
export type BrandInfo = { logoUrl: string | null; name: string }

export const BrandContext = createContext<BrandInfo>({ logoUrl: null, name: '' })
