'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from '@/lib/supabase/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    router.push('/quotations');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-nammos-dark flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-nammos-charcoal to-nammos-dark items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="mb-8">
            <Image
              src="/logo.svg"
              alt="Nammos"
              width={200}
              height={60}
              className="mx-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-nammos-cream mb-4">
            Quotation Management System
          </h1>
          <p className="text-nammos-muted text-lg">
            Streamline your furniture quotation workflow with our powerful management platform.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">500+</div>
              <div className="text-sm text-nammos-muted">Products</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">1000+</div>
              <div className="text-sm text-nammos-muted">Materials</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">50+</div>
              <div className="text-sm text-nammos-muted">Clients</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Image
              src="/logo.svg"
              alt="Nammos"
              width={150}
              height={45}
              className="mx-auto"
            />
          </div>

          <div className="bg-nammos-charcoal rounded-2xl p-8 border border-border shadow-xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-nammos-cream">Welcome Back</h2>
              <p className="text-nammos-muted mt-2">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-nammos-cream">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-nammos-dark border-border text-nammos-cream placeholder:text-nammos-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-nammos-cream">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-nammos-dark border-border text-nammos-cream placeholder:text-nammos-muted pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nammos-muted hover:text-nammos-cream transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-nammos-muted">
                Contact your administrator for account access
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-nammos-muted">
            &copy; {new Date().getFullYear()} Nammos. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
