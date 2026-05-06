'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    setIsSubmitting(false);

    if (response.ok) {
      window.location.assign('/admin/proposals');
      return;
    }

    const result = await response.json();
    setError(result?.error || 'Login failed.');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">Admin Login</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Secure admin access</h1>
          <p className="mt-2 text-sm text-slate-500">Use your admin credentials to access proposal management.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-100"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-100"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold !text-white transition hover:bg-slate-700 disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Default admin credentials:
          <div className="mt-2 text-sm text-slate-900">
            <strong>Username:</strong> admin
            <br />
            <strong>Password:</strong> admin123
          </div>
          <p className="mt-3 text-xs text-slate-500">
            You can override these values using `ADMIN_USERNAME` and `ADMIN_PASSWORD` in your environment.
          </p>
        </div> */}
      </div>
    </div>
  );
}
