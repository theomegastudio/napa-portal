import Image from 'next/image'

interface NapaPortalLogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function NapaPortalLogo({ size = 'md', className = '' }: NapaPortalLogoProps) {
  const dimensions = {
    sm: 32,
    md: 48,
    lg: 64
  }

  return (
    <div className={`${className}`}>
      <Image
        src="/napa-portal-logo.png"
        alt="NAPA Portal Logo"
        width={dimensions[size]}
        height={dimensions[size]}
        className="object-contain"
        priority
      />
    </div>
  )
}
