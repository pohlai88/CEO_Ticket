'use client';

import { useState, useCallback } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Command,
  Github,
  ArrowRight
} from 'lucide-react';

import { supabase } from '@/lib/supabase/client';


export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
        if (!fullName.trim()) {
          setError('Full name is required');
          setLoading(false);
          return;
        }
        if (!email.trim()) {
          setError('Email is required');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (signupError) {
          setError(signupError.message);
          setLoading(false);
          return;
        }

        if (!data.user) {
          setError('Signup failed: no user returned');
          setLoading(false);
          return;
        }

        // Artificial delay for UX smoothness
        await new Promise((resolve) => setTimeout(resolve, 500));

        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) {
          setError('Session not established. Please refresh and try logging in.');
          setLoading(false);
          return;
        }

        router.push('/onboarding');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
      }
    },
    [email, password, fullName, router]
  );

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Background Element (Aurora Semantics) */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

      {/* Header / Brand */}
      <header className="w-full py-6 px-4 md:px-8 flex justify-center md:justify-start">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Command className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Quantum<span className="text-primary">Nexus</span>
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Card Container */}
          <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="p-8">

              {/* Title Section */}
              <div className="text-center mb-8 space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Create account</h2>
                <p className="text-sm text-muted-foreground">
                  Join your organization and start creating requests
                </p>
              </div>

              {/* Error Alert */}
              {error && !loading && (
                <div className="mb-6 rounded-md border border-error-border bg-error-bg p-4 animate-in slide-in-from-top-2">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-error-fg flex-shrink-0" />
                    <div className="text-sm text-error-fg">
                      <p className="font-medium">{error}</p>
                      {error.includes('already registered') && (
                        <p className="mt-1 opacity-90">
                          Already have an account?{' '}
                          <Link href="/auth/login" className="underline hover:text-error-fg/80 transition-colors">
                            Sign in instead
                          </Link>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Info State */}
              {loading && !error && (
                <div className="mb-6 rounded-md border border-info-border bg-info-bg p-4 flex items-center gap-3 animate-pulse">
                  <Loader2 className="h-4 w-4 text-info-fg animate-spin" />
                  <p className="text-sm font-medium text-info-fg">Provisioning organization space...</p>
                </div>
              )}

              {/* Signup Form */}
              <form onSubmit={handleSignup} className="space-y-4">

                {/* Full Name Input */}
                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    disabled={loading}
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-secondary/20 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                  />
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={loading}
                    placeholder="executive@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-secondary/20 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      Password
                    </label>
                    <span className="text-xs text-muted-foreground">Min 6 chars</span>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      disabled={loading}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-secondary/20 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">
                    By registering, you confirm adherence to the{' '}
                    <Link href="#" className="text-primary hover:underline font-medium">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="#" className="text-primary hover:underline font-medium">
                      Privacy Protocol
                    </Link>.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-4"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Initializing...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or register with</span>
                </div>
              </div>

              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-md border border-input bg-background hover:bg-secondary/50 text-foreground text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Github className="h-4 w-4" />
                  <span>GitHub</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-md border border-input bg-background hover:bg-secondary/50 text-foreground text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Google</span>
                </button>
              </div>
            </div>

            {/* Footer Area */}
            <div className="bg-muted/30 px-8 py-4 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
