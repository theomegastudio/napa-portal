import Image from 'next/image'

interface NapaLogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function NapaLogo({ size = 'md', className = '' }: NapaLogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }

  // TODO: Replace this with actual NAPA logo
  // Place your logo file in /public/napa-logo.png (or .svg)
  // Then uncomment the Image component below and remove the placeholder

  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
      {/* Placeholder - Replace with actual logo */}
      <div className="rounded-full bg-yellow-500 h-full w-full flex items-center justify-center text-white font-bold text-xl">
        NAPA
      </div>

      {/* Uncomment when you add your logo file to /public/napa-logo.png
      <Image
        src="/napa-logo.png"
        alt="NAPA Logo"
        width={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
        height={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
        className="object-contain"
      />
      */}
    </div>
  )
}
