import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer id="contact" className="bg-[#070b2e] px-6 pb-7 pt-20 text-white md:px-10 lg:px-16">
            <div className="mx-auto max-w-[1152px]">
                <div className="grid gap-14 border-b border-white/10 pb-16 lg:grid-cols-[.8fr_1.2fr]">
                    <div>
                        <Link href="/" className="inline-flex items-center gap-3" aria-label="GreatLife Fitness home">
                            <Image src="/images/logo.png" alt="GreatLife Fitness" width={76} height={76} className="h-16 w-auto object-contain" />
                            <div>
                                <p className="font-black uppercase tracking-[0.12em]">GreatLife</p>
                                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f4c46b]">Fitness</p>
                            </div>
                        </Link>
                        <p className="mt-6 max-w-sm leading-7 text-white/55">Train, play, and feel your best in one complete fitness facility in Urdaneta City.</p>
                        <a href="https://www.facebook.com/GreatLifeFitness" target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80 transition hover:border-[#f4c46b] hover:text-[#f4c46b]">
                            Facebook <span aria-hidden="true">↗</span>
                        </a>
                    </div>

                    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_.8fr]">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f4c46b]">Visit us</p>
                            <address className="mt-5 not-italic leading-7 text-white/70">
                                GR8 Corporate Center, Bypass Road<br />
                                Brgy. Anonas, Urdaneta City, Pangasinan
                            </address>
                            <div className="mt-5 space-y-2 text-white/70">
                                <a href="tel:+639178504876" className="block transition hover:text-white">0917 850 4876</a>
                                <a href="mailto:greatlife@gmail.com" className="block transition hover:text-white">greatlife@gmail.com</a>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f4c46b]">Opening hours</p>
                            <div className="mt-5 space-y-4 text-sm text-white/70">
                                <p><strong className="block text-white">Monday–Friday</strong>6:00 AM–10:00 PM</p>
                                <p><strong className="block text-white">Saturday–Sunday</strong>9:00 AM–10:00 PM</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-5 pt-7 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
                    <p>© {new Date().getFullYear()} GreatLife Fitness. All rights reserved.</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                        <Link href="/faqs-developers" className="hover:text-white">FAQs</Link>
                        <Link href="/privacy" className="hover:text-white">Privacy</Link>
                        <Link href="/terms-conditions" className="hover:text-white">Terms</Link>
                        <Link href="/login" className="hover:text-white">Staff portal</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
