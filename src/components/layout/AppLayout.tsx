'use client';

import { useAuth } from '@/lib/AuthContext';
import React from "react";
import Image from "next/image";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoggedIn } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800">
      <header className="w-full px-4 py-3 bg-white shadow">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold flex items-center">
              <Image src="/logo.png" className="h-[2rem] w-[2rem] me-2" height={1024} width={1024}  alt="logo"/> Bushel
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

      <footer className="w-full px-4 py-2 bg-white border-t text-center text-sm text-gray-500 flex justify-between items-center">
        <div className="max-w-4xl">
          &copy; {new Date().getFullYear()} Sustainable Digital Scholarship, University of Oxford.
          <br />
          Source code available on <a href="https://github.com/OxfordRSE/bushel" className="underline text-blue-600">GitHub</a>.
          <br />
          Available under the <a href="https://gnu.org/licenses/agpl-3.0.en.html" className="underline text-blue-600">AGPL-3.0</a> license.
        </div>
        <div className="my-2 ml-2 flex items-center gap-2">
          <a href="https://www.sds.ox.ac.uk/home">
            <Image src="/sds-logo.png" alt="Sustainable Digital Scholarship" height={96} width={96} className="inline-block" />
          </a>
          <a href="https://www.rse.ox.ac.uk/">
            <Image src="/oxrse-logo.png" alt="Oxford Research Software Engineering" height={96} width={96} className="inline-block" />
          </a>
          <a href="https://www.ox.ack.uk/">
            <Image src="/oxford-logo.png" alt="University of Oxford" height={96} width={96} className="inline-block" />
          </a>
        </div>
      </footer>
    </div>
  );
}
