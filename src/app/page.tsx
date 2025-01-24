// app/page.tsx
'use client';

import { Steps } from '@/components/Steps';

export default function Home() {

  return (
      <main className="min-h-screen bg-gray-100">
        <nav className="bg-gray-800 text-white p-4">
          <div className="container mx-auto">
            <h1 className="text-xl font-bold">FigShare Integration</h1>
          </div>
        </nav>

        <div className="container mx-auto p-4">
          <div className="max-w-3xl mx-auto">
            <Steps />
          </div>
        </div>
      </main>
  );
}