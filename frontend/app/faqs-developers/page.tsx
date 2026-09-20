'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function FAQsPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const faqs = [
        { q: "How can I book a court?", a: "You can book through our website by clicking the 'Book Now' button in the courts section." },
        { q: "Can I cancel or reschedule my booking?", a: "Yes, you can reschedule or cancel at least 12 hours before your booked time by contacting our front desk or messaging us on Facebook." },
        { q: "Where are you located?", a: "We are located at GR8 Corporate Center, Bypass Road, Brgy. Anonas, Urdaneta City, Pangasinan." },
        { q: "What are your operating hours?", a: "We are open from 6:00 AM – 10:00 PM on weekdays, and 9:00 AM – 10:00 PM on weekends." },
        { q: "Do you have fitness trainers available?", a: "Yes! We have professional trainers who can help you with personalized fitness programs and guidance." },
        { q: "Can I walk in without booking?", a: "Walk-ins are welcome, but we highly recommend booking in advance to ensure court availability." },
        { q: "Do you offer trial sessions?", a: "Yes! First-time visitors can enjoy a one-day free trial to experience our courts and gym facilities before signing up." },
        { q: "What payment methods do you accept?", a: "We accept cash upon arrival for court bookings." },
    ];

    const developers = [
        { name: "Peter Quirimit", role: "The Project Manager", desc: "Hi I'm Peter. I am the Project Manager of this smart web reservation system.", image: "https://i.pinimg.com/1200x/f9/b6/ee/f9b6ee085996dee0e22ddc52dda03ac2.jpg" },
        { name: "Ella Grace Estimada", role: "The front-end developer", desc: "Hi im Ella I am one of the front-end developers of this smart web reservation system.", image: "https://i.pinimg.com/736x/f5/ef/69/f5ef690b6e4ecf123b5302914df2e81f.jpg" },
        { name: "Kate Margierette T. Gopez", role: "The front-end developer", desc: "Hi im Kate I am one of the front-end developers of this smart web reservation system.", image: "https://i.pinimg.com/736x/b1/35/f1/b135f1a335353c3f3ec528d68c759db4.jpg" },
        { name: "Joanna Marie Andrada", role: "Researcher", desc: "Hello I'm Joanna. I'm one of the researchers behind this smart web reservation system", image: "https://i.pinimg.com/736x/3c/72/85/3c7285f171ad300081b4ba665522c4cb.jpg" },
        { name: "Carmela Saldivar", role: "Researcher", desc: "Hello I'm Carmela. I'm one of the Researchers behind this smart web reservation system.", image: "https://i.pinimg.com/736x/0f/6c/3e/0f6c3e4ade014bbb84d0d9a4251f3800.jpg" },
        { name: "Davidson Briones", role: "Senior Developer", desc: "Hello I'm Davidson. I am one of the Developers behind this smart web reservation system.", image: "https://i.pinimg.com/1200x/ef/11/17/ef1117832e90f93f5c403cdea6d77f2d.jpg" },
        { name: "John Reynald Damias", role: "Junior Developer", desc: "Hello I'm Reynald. I am one of the Researchers behind this smart web reservation system.", image: "https://i.pinimg.com/736x/e0/df/2e/e0df2e89ed46a16d6f317e4590ee0ced.jpg" },
        { name: "Ralph Raniel Munar", role: "Researcher", desc: "Hello I'm Ralph. I am one of the Researchers behind this smart web reservation system.", image: "https://i.pinimg.com/736x/c8/f5/a9/c8f5a905d349aebbc29804f76413a6d6.jpg" },
        { name: "Justin Dave Benavidez", role: "Researcher", desc: "Hello I'm Dave. I am one of the Researchers behind this smart web reservation system.", image: "https://i.kym-cdn.com/editorials/icons/original/000/013/755/mon.jpg" },
    ];

    return (
        <div className="faqs-page min-h-screen pt-32 pb-20 font-[Alata]">
            <section className="faqs-bg">
                <div className="faq-container">
                    <h2 className="faq-title">Frequently Asked Questions</h2>
                    {faqs.map((faq, i) => {
                        const isOpen = openIndex === i;
                        return (
                            <div key={i} className="faq-item">
                                <h3
                                    onClick={() => setOpenIndex(isOpen ? null : i)}
                                    className="faq-question"
                                >
                                    {faq.q}
                                </h3>
                                <p className={`faq-answer ${isOpen ? 'open' : ''}`}>
                                    {faq.a}
                                </p>
                            </div>
                        );
                    })}
                </div>

                <div className="faq-container-kate">
                    <h2 className="faq-title-kate">About the Developers</h2>

                    <div className="abt-developer-all">
                        {/* Developer Cards (Grid) */}
                        <div className="abt-developer-body">
                            <div className="abt-developer-container">
                                {developers.map((dev, i) => (
                                    <div key={i} className="developer-card-wrapper-bg">
                                        <div className="developer-card-wrapper">
                                            <div className="developer-card">
                                                <Image
                                                    src={dev.image}
                                                    alt={dev.name}
                                                    fill
                                                    sizes="112px"
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="developer-card-texts">
                                                <h2>{dev.name.split(' ')[0]}</h2>
                                                <p>{dev.role}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Introduction Cards (Carousel/Row) */}
                        <div className="introduction-body">
                            <div
                                className="introduction-container js-flickity"
                                data-flickity-options='{ "wrapAround": true, "pageDots": false, "contain": true}'
                            >
                                {developers.map((dev, i) => (
                                    <div key={i} className="introduction-card">
                                        <div className="intro-image">
                                            <Image
                                                src={dev.image}
                                                alt={dev.name}
                                                fill
                                                sizes="160px"
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="intro-texts">
                                            <h1>{dev.name}</h1>
                                            <h3>{dev.role}</h3>
                                            <p>{dev.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
