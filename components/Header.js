import React from 'react';
import Link from 'next/link';
import { LogoutIcon } from './Icons';

export default function Header({ user, onSignOut, showBackLink = false }) {
  return (
    <header className="bg-white border-b border-stone-200">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackLink && (
            <Link 
              href="/app" 
              className="text-stone-400 hover:text-stone-600 transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </Link>
          )}
          <div>
            <Link href="/" className="text-2xl font-bold text-stone-900 hover:text-stone-700 transition">
              FWD
            </Link>
            {user && (
              <p className="text-sm text-stone-500">{user.email}</p>
            )}
          </div>
        </div>
        
        {user && (
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 px-4 py-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
          >
            <LogoutIcon />
            <span className="text-sm font-medium">Log out</span>
          </button>
        )}
      </div>
    </header>
  );
}

