import Image from 'next/image'

interface BrandLogoProps {
  /** "icon" shows just the brain (cropped); "full" shows brain + wordmark */
  variant?: 'icon' | 'full'
  /** Height in pixels — width is auto-calculated from the square source */
  size?: number
  className?: string
}

export default function BrandLogo({ variant = 'icon', size = 36, className = '' }: BrandLogoProps) {
  if (variant === 'full') {
    return (
      <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
        <Image
          src="/logo.png"
          alt="V Welfare Mental Health Clinic"
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    )
  }

  // "icon" — show only the brain portion (top ~65% of the square image)
  const containerH = Math.round(size * 0.65)
  return (
    <div
      className={`relative overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: size, height: containerH }}
    >
      <Image
        src="/logo.png"
        alt="V Welfare logo"
        fill
        style={{ objectFit: 'cover', objectPosition: 'top center' }}
        priority
      />
    </div>
  )
}
