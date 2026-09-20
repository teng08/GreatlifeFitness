'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    // Check if the current path is an admin path or the login page
    const isDashboardPath = pathname?.startsWith('/admin') || pathname === '/login';
    const isBookingPath = pathname?.startsWith('/booking');
    const hideFooterPaths = ['/faqs-developers', '/privacy', '/terms-conditions'];
    const shouldHideFooter = isBookingPath || hideFooterPaths.includes(pathname || '');

    return (
        <>
            {!isDashboardPath && <Navbar />}
            <main className={!isDashboardPath ? "min-h-screen pt-20" : ""}>
                {children}
            </main>
            {!isDashboardPath && !shouldHideFooter && <Footer />}
        </>
    );
}
