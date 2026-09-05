'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient, ApiError } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiClient('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, name, password }),
      });
      toast.success('Account created successfully!');
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
    } catch (err: unknown) {
      let errorMessage = 'Registration failed';
      if (err instanceof ApiError) {
        if (Array.isArray(err.payload?.message)) {
          errorMessage = err.payload.message.join(', ');
        } else {
          errorMessage = err.message || errorMessage;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-background p-4 sm:p-8 font-sans selection:bg-zinc-800 selection:text-white">
      <div className="mb-10 flex flex-col items-center animate-stagger-fade-up">
        <Image src="/logo.svg" alt="Kanban Logo" width={48} height={48} className="rounded-2xl shadow-sm mb-5" priority />
        <h1 className="text-3xl font-medium text-zinc-900 tracking-tight">Kanban</h1>
        <p className="mt-3 text-[15px] text-zinc-500 font-medium">Real-time collaborative boards</p>
      </div>
      
      <div 
        className="w-full max-w-md animate-stagger-fade-up opacity-0"
        style={{ animationDelay: '100ms' }}
      >
        <div className="p-2 rounded-[2.5rem] bg-zinc-100/80 border border-zinc-200/60 shadow-sm">
          <div className="bg-white rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 p-8 sm:p-10">
            <h2 className="mb-8 text-center text-[22px] font-medium text-zinc-900 tracking-tight">Create your account</h2>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 font-medium flex items-center justify-center text-center">
                  {error}
                </div>
              )}
              
              <div className="space-y-5">
                <div>
                  <label htmlFor="name" className="mb-2 block text-[13px] font-medium text-zinc-500 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-3.5 text-[15px] font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all duration-300 ease-(--ease-spring)"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-2 block text-[13px] font-medium text-zinc-500 uppercase tracking-wider">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-3.5 text-[15px] font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all duration-300 ease-(--ease-spring)"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="mb-2 block text-[13px] font-medium text-zinc-500 uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-3.5 text-[15px] font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all duration-300 ease-(--ease-spring)"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-full bg-zinc-900 py-3.5 text-[15px] font-medium text-white transition-all duration-500 ease-(--ease-spring) hover:bg-zinc-800 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-zinc-200 disabled:opacity-50 disabled:active:scale-100 shadow-sm"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} /> : 'Sign up'}
                </button>
              </div>
              
              <div className="text-center pt-4">
                <Link href="/login" className="text-[14px] font-medium text-zinc-500 transition-colors hover:text-zinc-900 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-900">
                  Already have an account? Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
