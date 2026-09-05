import type { Metadata } from "next";
import { Geist } from 'next/font/google';
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { Toaster } from 'sonner';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: "Mini Kanban Board",
  description: "Real-time collaborative kanban board",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${geist.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster position="top-center" richColors theme="light" style={{ fontFamily: 'var(--font-geist)' }} />
      </body>
    </html>
  );
}
