'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-900 p-8 rounded-lg shadow border border-gray-200 dark:border-gray-800">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">UBEK</h1>
        <p className="mt-2 text-center text-gray-600 dark:text-gray-300">Sign in to your account</p>
        {error && <div className="text-sm text-red-400 text-center">{error}</div>}
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-transparent py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-100"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-transparent py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || authLoading}
            className="w-full rounded-md bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 disabled:opacity-50"
          >
            {submitting ? 'Loading...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
          Don’t have an account?{' '}
          <a href="/auth/register" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
