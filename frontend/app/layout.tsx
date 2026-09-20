import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'GreatLife Fitness | Indoor Court Booking',
    template: '%s | GreatLife Fitness',
  },
  description: 'Book indoor basketball, badminton, and table tennis courts at GreatLife Fitness in Urdaneta City, Pangasinan.',
  keywords: ['GreatLife Fitness', 'court booking', 'Urdaneta City', 'basketball', 'badminton', 'table tennis'],
};

import ClientLayout from '@/components/ClientLayout';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      </head>
      <body suppressHydrationWarning>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
