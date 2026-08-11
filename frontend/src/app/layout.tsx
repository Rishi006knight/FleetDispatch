import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quantum Express | AI Fleet & Delivery Platform',
  description: 'Intelligent Real-time Fleet Tracking, Route Optimization and Dynamic Pricing Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-zinc-950 text-zinc-100">
      <body className="h-full antialiased font-sans flex flex-col">
        {children}
      </body>
    </html>
  );
}
