'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    const controlNavbar = () => {
        if (typeof window !== 'undefined') {
            if (window.scrollY > lastScrollY) {
                // if scroll down hide the navbar
                setIsVisible(false);
            } else {
                // if scroll up show the navbar
                setIsVisible(true);
            }
            // remember current page location to use next time
            setLastScrollY(window.scrollY);
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.addEventListener('scroll', controlNavbar);

            // cleanup function
            return () => {
                window.removeEventListener('scroll', controlNavbar);
            };
        }
    }, [lastScrollY]);

    const navItems = [
        { name: 'Home', href: '/#hero' },
        { name: 'About', href: '/#about' },
        { name: 'Courts', href: '/#courts' },
        { name: 'Services', href: '/#why' },
        { name: 'Membership', href: '/#membership' },
        { name: 'Contact', href: '/#contact', highlight: true },
    ];

    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-5 py-4 transition-all duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`} style={{
                background: 'linear-gradient(to bottom, #08054C, rgba(8, 5, 76, 0.9), rgba(8, 5, 76, 0))',
                color: 'white'
            }}>
                {/* Logo */}
                <Link href="/" className="flex items-center">
                    <Image
                        src="/images/logo.png"
                        alt="GreatLife Fitness Logo"
                        width={60}
                        height={60}
                        className="h-[60px] w-auto"
                    />
                </Link>

                {/* Desktop Navigation */}
                <ul className="hidden md:flex md:items-center md:space-x-8">
                    {navItems.map((item) => (
                        <li key={item.name}>
                            <Link
                                href={item.href}
                                className={`${item.highlight ? 'text-yellow-400 hover:text-yellow-300' : 'text-white hover:text-yellow-400'} text-base transition-colors relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-yellow-400 after:transition-all after:duration-300 hover:after:w-full`}
                            >
                                {item.name}
                            </Link>
                        </li>
                    ))}
                </ul>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="md:hidden flex flex-col gap-[5px] cursor-pointer z-[1001]"
                >
                    <span className={`block w-[25px] h-[3px] bg-white rounded-sm transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                    <span className={`block w-[25px] h-[3px] bg-white rounded-sm transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
                    <span className={`block w-[25px] h-[3px] bg-white rounded-sm transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                </button>

                {/* Mobile Navigation Drawer */}
                <div className={`md:hidden fixed top-0 right-0 h-screen w-[220px] bg-[rgba(8,5,76,0.55)] backdrop-blur-md border-l border-white/15 p-10 flex flex-col gap-8 transition-all duration-300 z-[1000] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`${item.highlight ? 'text-yellow-400' : 'text-white'} text-xl font-medium`}
                            onClick={() => setIsOpen(false)}
                        >
                            {item.name}
                        </Link>
                    ))}
                </div>
            </nav>

            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 z-[900] transition-opacity duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setIsOpen(false)}
            ></div>
        </>
    );
}
