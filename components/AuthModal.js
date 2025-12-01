import React, { useState } from 'react';
import { signInWithMagicLink } from '../lib/supabase';

export default function AuthModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithMagicLink(email);
      setEmailSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Success state - email sent
  if (emailSent) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-stone-900 mb-2">
            Check your email
          </h2>
          
          <p className="text-stone-600 mb-6">
            We sent a login link to<br />
            <span className="font-semibold text-stone-900">{email}</span>
          </p>
          
          <p className="text-sm text-stone-500 mb-6">
            Click the link in the email to sign in. The link expires in 1 hour.
          </p>
          
          <button
            onClick={() => {
              setEmailSent(false);
              setEmail('');
            }}
            className="text-stone-600 hover:text-stone-900 text-sm font-medium"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">
          Welcome to FWD
        </h2>
        <p className="text-stone-600 mb-6">
          Enter your email to sign in or create an account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent transition"
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading || !email}
            className="w-full bg-stone-900 text-white py-3 rounded-lg font-semibold hover:bg-stone-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Sending link...
              </span>
            ) : (
              'Continue with email'
            )}
          </button>
        </form>

        <p className="text-xs text-stone-500 mt-6 text-center">
          We'll send you a magic link to sign in instantly.<br />
          No password needed.
        </p>
      </div>
    </div>
  );
}
