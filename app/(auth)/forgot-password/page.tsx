'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { emailOtp } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Mail, ArrowLeft, CheckCircle2, KeyRound, Eye, EyeOff } from 'lucide-react'
import NapaAuthLogo from '@/components/NapaAuthLogo'
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"

type Step = 'email' | 'otp' | 'success'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!email) { setError('Please enter your email'); return }
    setIsLoading(true)
    try {
      const result = await emailOtp.sendVerificationOtp({ email, type: 'forget-password' })
      if (result.error) { setError(result.error.message || 'Failed to send reset code'); return }
      toast.success('Reset code sent to your email')
      setStep('otp')
      setResendCooldown(30)
      setCode(['', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length > 0) {
      setCode(pastedData.split('').concat(Array(6 - pastedData.length).fill('')))
      if (pastedData.length < 6) inputRefs.current[pastedData.length]?.focus()
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const verificationCode = code.join('')
    if (verificationCode.length !== 6) { setError('Please enter all 6 digits'); return }
    if (!newPassword) { setError('Please enter a new password'); return }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setIsLoading(true)
    try {
      const result = await emailOtp.resetPassword({ email, otp: verificationCode, password: newPassword })
      if (result.error) { setError(result.error.message || 'Failed to reset password'); return }
      toast.success('Password reset successfully!')
      setStep('success')
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center"><NapaAuthLogo size="xl" /></div>
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Password Reset!</CardTitle>
              <CardDescription>Your password has been successfully reset. You can now sign in with your new password.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/login')} className="w-full">Sign In</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center"><NapaAuthLogo size="xl" /></div>
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Reset Your Password</CardTitle>
              <CardDescription>Enter the 6-digit code sent to <strong>{email}</strong> and your new password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-6">
                <FieldGroup>
                  {error && <FieldError className="text-center">{error}</FieldError>}
                  <Field>
                    <FieldLabel>Verification Code</FieldLabel>
                    <div className="flex justify-center gap-2" onPaste={handlePaste}>
                      {code.map((digit, index) => (
                        <Input key={index} ref={(el) => { inputRefs.current[index] = el }} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleCodeChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(index, e)} className="w-10 h-12 text-center text-lg font-semibold" disabled={isLoading} />
                      ))}
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                    <div className="relative">
                      <Input id="newPassword" type={showPassword ? "text" : "password"} placeholder="Enter new password (min 8 characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isLoading} required className="pr-10" />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} disabled={isLoading}>
                        {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                    <div className="relative">
                      <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} required className="pr-10" />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={isLoading}>
                        {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </Field>
                  <Button type="submit" className="w-full" disabled={isLoading || code.join('').length !== 6}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reset Password
                  </Button>
                </FieldGroup>
              </form>
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground mb-2">Didn&apos;t receive the code?</p>
                <Button variant="link" onClick={() => handleSendCode()} disabled={isLoading || resendCooldown > 0} className="text-primary">
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </Button>
              </div>
              <div className="text-center pt-4 border-t mt-4">
                <Button variant="ghost" onClick={() => setStep('email')} className="text-muted-foreground">
                  <ArrowLeft className="mr-2 h-4 w-4" />Change email
                </Button>
              </div>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground">The code expires in 10 minutes. Check your spam folder if you don&apos;t see the email.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center"><NapaAuthLogo size="xl" /></div>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Forgot Password?</CardTitle>
            <CardDescription>Enter your email address and we&apos;ll send you a code to reset your password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendCode} className="space-y-6">
              <FieldGroup>
                {error && <FieldError className="text-center">{error}</FieldError>}
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" type="email" placeholder="chair@napahq.org" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required />
                </Field>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Code
                </Button>
              </FieldGroup>
            </form>
            <div className="text-center pt-4 border-t mt-4">
              <Button variant="ghost" onClick={() => router.push('/login')} className="text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />Back to login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
