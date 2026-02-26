import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="w-full text-white font-[Alata] pt-15 pb-5 px-10" style={{
            background: 'linear-gradient(to top, #08054C 80%, rgba(8, 5, 76, 0.9) 95%, rgba(8, 5, 76, 0) 100%)'
        }}>
            <section id="contact" className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                {/* Left Column */}
                <div className="flex flex-col gap-6">
                    <h3 className="text-2xl font-bold">Contact Us</h3>

                    <div className="flex gap-4 items-center">
                        <i className="fa-solid fa-location-dot text-yellow-400 text-xl"></i>
                        <p className="text-base">GR8 Corporate Center, Bypass Road, Brgy.<br />Anonas, Urdaneta City, Pangasinan</p>
                    </div>

                    <div className="flex gap-4 items-center">
                        <i className="fa-solid fa-phone text-yellow-400 text-xl"></i>
                        <p className="text-base">0917 850 4876</p>
                    </div>

                    <div className="flex gap-4 items-center">
                        <i className="fa-solid fa-envelope text-yellow-400 text-xl"></i>
                        <p className="text-base">greatlife@gmail.com</p>
                    </div>

                    <div>
                        <h3 className="text-xl font-bold mt-4 mb-2">Opening Hours</h3>
                        <p className="text-base"><strong>Monday to Friday</strong><br />6:00 am to 10:00 pm</p>
                        <p className="text-base"><strong>Saturday to Sunday</strong><br />9:00 am to 10:00 pm</p>
                    </div>

                    <div>
                        <h3 className="text-xl font-bold mt-4 mb-2">Follow us online</h3>
                        <div className="flex gap-4">
                            <a href="https://www.facebook.com/GreatLifeFitness" target="_blank" rel="noopener noreferrer" className="text-white text-3xl hover:text-yellow-400 transition-colors">
                                <i className="fa-brands fa-facebook"></i>
                            </a>
                        </div>
                    </div>

                    <p className="text-base leading-relaxed mt-4 opacity-80">
                        Whether you&apos;re an early bird or a night owl,<br />
                        enjoy the serene mornings or beautifully lit<br />
                        evenings with <span className="font-bold text-yellow-400">GreatLife Fitness</span>
                    </p>
                </div>

                {/* Right Column (Map) */}
                <div className="w-full">
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3835.4354922522443!2d120.57022247490235!3d15.990829684677427!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33913f0040788f6b%3A0xef4f73ec3c2074ef!2sGreatLife%20Fitness!5e0!3m2!1sen!2sph!4v1757682228875!5m2!1sen!2sph"
                        width="100%"
                        height="400"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        className="rounded-2xl shadow-xl"
                    ></iframe>
                </div>
            </section>

            {/* Bottom Bar */}
            <div className="max-w-[1200px] mx-auto mt-15 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex gap-4 text-sm font-medium">
                    <Link href="/faqs-developers" className="hover:text-yellow-400 transition-colors">FAQs & About Developers</Link>
                    <span className="opacity-30">|</span>
                    <Link href="/privacy" className="hover:text-yellow-400 transition-colors">Privacy Policy</Link>
                    <span className="opacity-30">|</span>
                    <Link href="/terms-conditions" className="hover:text-yellow-400 transition-colors">Terms & Conditions</Link>
                </div>

                <div className="relative w-[150px] h-[60px]">
                    <Image
                        src="/images/logo.png"
                        alt="GreatLife Logo"
                        fill
                        className="object-contain"
                    />
                </div>
            </div>
        </footer>
    );
}
