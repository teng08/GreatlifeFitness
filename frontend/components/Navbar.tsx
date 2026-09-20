'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const navItems = [
    { name: 'Home', href: '/#hero' },
    { name: 'About', href: '/#about' },
    { name: 'Courts', href: '/#courts' },
    { name: 'Facility', href: '/#why' },
    { name: 'Contact', href: '/#contact' },
];

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    return (
        <>
            <nav
                aria-label="Main navigation"
                className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${isScrolled || isOpen ? 'border-b border-white/10 bg-[#090e36]/92 shadow-[0_12px_40px_rgba(4,7,28,.2)] backdrop-blur-xl' : 'bg-gradient-to-b from-[#070b2e]/85 to-transparent'}`}
            >
                <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6 md:px-10 lg:px-16">
                    <Link href="/" className="relative z-[1001] flex items-center gap-3" aria-label="GreatLife Fitness home">
                        <Image src="/images/logo.png" alt="" width={54} height={54} className="h-12 w-auto object-contain" priority />
                        <span className="hidden text-sm font-black uppercase leading-tight tracking-[0.12em] text-white sm:block">
                            GreatLife<br /><span className="text-[10px] tracking-[0.25em] text-[#f4c46b]">Fitness</span>
                        </span>
                    </Link>

                    <div className="hidden items-center gap-1 md:flex">
                        {navItems.map((item) => (
                            <Link key={item.name} href={item.href} className="rounded-full px-4 py-2 text-sm font-bold text-white/75 transition hover:bg-white/8 hover:text-white">
                                {item.name}
                            </Link>
                        ))}
                        <Link href="/#courts" className="ml-3 rounded-full bg-[#f4c46b] px-5 py-2.5 text-sm font-extrabold text-[#11152f] transition hover:-translate-y-0.5 hover:bg-[#ffd98f]">
                            Book now
                        </Link>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsOpen((open) => !open)}
                        className="relative z-[1001] grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/8 text-white md:hidden"
                        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        aria-expanded={isOpen}
                    >
                        <span className="sr-only">Menu</span>
                        <span className="relative block h-4 w-5">
                            <span className={`absolute left-0 top-0.5 h-0.5 w-5 rounded bg-current transition ${isOpen ? 'translate-y-[6px] rotate-45' : ''}`} />
                            <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded bg-current transition ${isOpen ? 'opacity-0' : ''}`} />
                            <span className={`absolute bottom-0.5 left-0 h-0.5 w-5 rounded bg-current transition ${isOpen ? '-translate-y-[6px] -rotate-45' : ''}`} />
                        </span>
                    </button>
                </div>
            </nav>

            <div className={`fixed inset-0 z-[990] bg-[#080d34] px-6 pb-10 pt-28 transition md:hidden ${isOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                <div className="flex h-full flex-col">
                    <div className="flex flex-col">
                        {navItems.map((item, index) => (
                            <Link key={item.name} href={item.href} onClick={() => setIsOpen(false)} className="flex items-center justify-between border-b border-white/10 py-5 text-3xl font-black tracking-[-0.03em] text-white">
                                {item.name}<span className="text-sm font-medium text-[#f4c46b]">0{index + 1}</span>
                            </Link>
                        ))}
                    </div>
                    <Link href="/#courts" onClick={() => setIsOpen(false)} className="mt-auto flex min-h-14 items-center justify-center rounded-full bg-[#f4c46b] font-extrabold text-[#11152f]">
                        Choose a court
                    </Link>
                </div>
            </div>
        </>
    );
}
