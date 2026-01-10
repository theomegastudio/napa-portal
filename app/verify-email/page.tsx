'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
import NapaAuthLogo from '@/components/NapaAuthLogo'

export default function VerifyEmailPage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const initialSendAttempted = useRef(false)

  // Handle cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Auto-send code on first load (use ref to prevent double-send in React Strict Mode)
  useEffect(() => {
    if (status === 'authenticated' && !codeSent && !initialSendAttempted.current) {
      initialSendAttempted.current = true
      handleSendCode()
    }
  }, [status, codeSent])

  const handleSendCode = async () => {
    setIsSending(true)
    try {
      const response = await fetch('/api/v2/auth/otp/send', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if it's a rate limit error with retry time
        if (data.error?.includes('wait')) {
          toast.error(data.error)
          // Extract seconds from error message and set cooldown
          const match = data.error.match(/(\d+) seconds/)
          if (match) {
            setResendCooldown(parseInt(match[1]))
          }
        } else {
          toast.error(data.error || 'Failed to send verification code')
        }
        return
      }

      toast.success('Verification code sent to your email')
      setCodeSent(true)
      setResendCooldown(30) // 30 second cooldown
      setCode(['', '', '', '', '', '']) // Reset code inputs
      inputRefs.current[0]?.focus()
    } catch (error) {
      toast.error('Failed to send verification code')
      console.error(error)
    } finally {
      setIsSending(false)
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits are entered
    if (value && index === 5) {
      const fullCode = newCode.join('')
      if (fullCode.length === 6) {
        handleVerify(fullCode)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      const newCode = pastedData.split('')
      setCode(newCode)
      handleVerify(pastedData)
    }
  }

  const handleVerify = async (codeToVerify?: string) => {
    const verificationCode = codeToVerify || code.join('')

    if (verificationCode.length !== 6) {
      toast.error('Please enter all 6 digits')
      return
    }

    setIsVerifying(true)
    try {
      const response = await fetch('/api/v2/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Invalid verification code')
        // Clear code on error
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }

      toast.success('Email verified successfully!')

      // Refresh session to get updated verification status
      await update()

      // Redirect to dashboard
      router.push('/')
    } catch (error) {
      toast.error('Failed to verify code')
      console.error(error)
    } finally {
      setIsVerifying(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <NapaAuthLogo size="xl" />
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Verify Your Email</CardTitle>
            <CardDescription>
              We sent a 6-digit code to <strong>{session.user.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Code Input */}
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-xl font-semibold"
                    disabled={isVerifying}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {/* Verify Button */}
              <Button
                onClick={() => handleVerify()}
                className="w-full"
                disabled={isVerifying || code.join('').length !== 6}
              >
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Email
              </Button>

              {/* Resend Code */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Didn't receive the code?
                </p>
                <Button
                  variant="link"
                  onClick={handleSendCode}
                  disabled={isSending || resendCooldown > 0}
                  className="text-primary"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend code in ${resendCooldown}s`
                  ) : (
                    'Resend code'
                  )}
                </Button>
              </div>

              {/* Back to login */}
              <div className="text-center pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/login')}
                  className="text-muted-foreground"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          The code expires in 10 minutes. Check your spam folder if you don't see the email.
        </p>
      </div>
    </div>
  )
}
