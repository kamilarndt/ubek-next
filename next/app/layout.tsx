import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './providers';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: 'UBEK - AI Agent Platform',
  description: 'Build and deploy AI agents with UBEK - the open-source AI agent platform',
};

export const viewport = {
  width: 'device-width' as const,
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={geist.variable}>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
