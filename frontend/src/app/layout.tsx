import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quantum Express | Tamil Nadu B2B Logistics & State Freight Platform',
  description: 'Enterprise B2B Freight Orchestration & State Logistics Center Platform across 16 Tamil Nadu Warehousing Hubs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased font-sans flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
