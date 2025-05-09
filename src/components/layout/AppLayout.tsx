'use client';

import { useAuth } from '@/lib/AuthContext';
import React from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoggedIn } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800">
      <header className="w-full px-4 py-3 bg-white shadow">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold flex items-center">
              <img src="/logo.png" className="h-[2rem] me-2"  alt="logo"/> Bushel
          </h1>
          {isLoggedIn && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>👤 {user?.first_name ?? 'Unknown'} {user?.last_name ?? 'User'}</span>
              <button onClick={logout} className="underline text-red-500">Logout</button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center p-4">
        {children}
      </main>

      <footer className="w-full px-4 py-2 bg-white border-t text-center text-sm text-gray-500">
        <div className="max-w-4xl mx-auto">
          &copy; {new Date().getFullYear()} Bushel. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
