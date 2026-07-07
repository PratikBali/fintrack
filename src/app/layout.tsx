import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/lib/auth';
import { TransactionsProvider } from '@/lib/transactions';
import { ProfileSync } from '@/lib/profile';
import { AppFooter } from '@/components/app-footer';

export const metadata: Metadata = {
  title: 'FinTrack Pro',
  description: 'Manage your finances like a pro. Track expenses, split bills, and manage balances.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background">
        <AuthProvider>
            <ProfileSync />
            <TransactionsProvider>
                {children}
                <AppFooter />
            </TransactionsProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
