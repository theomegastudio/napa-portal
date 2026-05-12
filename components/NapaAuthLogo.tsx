import Image from 'next/image'

interface NapaAuthLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function NapaAuthLogo({ size = 'lg', className = '' }: NapaAuthLogoProps) {
  const dimensions = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96
  }

  return (
    <div className={`${className}`}>
      <Image
        src="/napa-auth-logo.png"
        alt="NAPA Logo"
        width={dimensions[size]}
        height={dimensions[size]}
        className="object-contain"
        style={{ width: 'auto', height: 'auto' }}
        priority
      />
    </div>
  )
}
