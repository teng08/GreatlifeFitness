'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

const courts = [
  {
    name: 'Basketball',
    eyebrow: 'Full indoor court',
    image: '/images/basketball.jpg',
    href: '/booking/basketball',
    price: 'From ₱800/hr',
    description: 'A bright, air-conditioned court built for team runs, training, and competitive play.',
  },
  {
    name: 'Badminton',
    eyebrow: 'Fast-paced sessions',
    image: '/images/badminton.jpg',
    href: '/booking/badminton',
    price: 'From ₱600/hr',
    description: 'A comfortable indoor setup for casual matches, drills, and your next friendly tournament.',
  },
  {
    name: 'Table tennis',
    eyebrow: 'Quick games, big energy',
    image: '/images/tabletennis.jpg',
    href: '/booking/table-tennis',
    price: 'From ₱400/hr',
    description: 'A dedicated play area for sharp rallies, focused practice, and easy games with friends.',
  },
];

const amenities = [
  { number: '01', title: 'Train', text: 'Strength, cardio, and conditioning equipment in one complete fitness space.' },
  { number: '02', title: 'Play', text: 'Well-maintained indoor courts with options for lighting and air conditioning.' },
  { number: '03', title: 'Recover', text: 'Locker rooms and a comfortable facility to reset before or after your session.' },
];

const gallery = [
  { src: '/images/gym.jpg', alt: 'GreatLife gym floor' },
  { src: '/images/cycling.jpg', alt: 'Indoor cycling area' },
  { src: '/images/zumba.jpg', alt: 'Group fitness studio' },
  { src: '/images/weights.jpg', alt: 'Strength training area' },
  { src: '/images/locker.jpg', alt: 'Locker room' },
  { src: '/images/training.jpg', alt: 'Training equipment' },
];

export default function HomePage() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="overflow-hidden bg-[#f7f8fb] text-[#111827]">
      <header id="hero" className="relative -mt-20 h-[100svh] min-h-[760px] overflow-hidden bg-[#070b2e]">
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline poster="/images/hero-bg.jpg" aria-hidden="true">
          <source src="/images/hero-bg-vid.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,34,.96)_0%,rgba(5,8,34,.78)_42%,rgba(5,8,34,.24)_75%,rgba(5,8,34,.54)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(239,182,75,.18),transparent_28%)]" />

        <div className="relative z-10 mx-auto flex h-full max-w-[1280px] items-center px-6 pt-24 md:px-10 lg:px-16">
          <div className="max-w-3xl pb-24" data-reveal>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#f4c46b] backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#f4c46b] shadow-[0_0_18px_#f4c46b]" />
              Indoor courts · Urdaneta City
            </div>
            <h1 className="max-w-3xl text-balance text-5xl font-black leading-[0.96] tracking-[-0.055em] text-white sm:text-6xl md:text-7xl lg:text-[5.7rem]">
              Your game starts <span className="text-[#f4c46b]">here.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/72 md:text-xl">
              Reserve your court in minutes, train in a complete fitness facility, and show up ready to play.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="#courts" className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#f4c46b] px-7 font-extrabold text-[#10142f] transition hover:-translate-y-0.5 hover:bg-[#ffd889] hover:shadow-[0_16px_45px_rgba(244,196,107,.25)]">
                Choose a court <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </Link>
              <Link href="#about" className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/20 bg-white/8 px-7 font-bold text-white backdrop-blur-md transition hover:bg-white/15">
                Explore the facility
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[#080d34]/75 backdrop-blur-xl">
          <div className="mx-auto grid max-w-[1280px] grid-cols-1 divide-y divide-white/10 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0 md:px-10 lg:px-16">
            {[
              ['Open daily', 'Weekdays from 6:00 AM'],
              ['Simple booking', 'Request a slot in minutes'],
              ['Pay at the venue', 'Convenient cash payment'],
            ].map(([title, detail]) => (
              <div key={title} className="py-4 sm:px-7 sm:py-5 first:pl-0">
                <p className="font-bold text-white">{title}</p>
                <p className="mt-1 text-sm text-white/55">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main>
        <section id="about" className="mx-auto grid max-w-[1280px] gap-14 px-6 py-24 md:px-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-16 lg:py-32">
          <div className="relative min-h-[520px]" data-reveal>
            <div className="absolute left-0 top-0 h-[86%] w-[78%] overflow-hidden rounded-[2rem]">
              <Image src="/images/gym.jpg" alt="GreatLife Fitness gym facility" fill className="object-cover" sizes="(max-width: 1024px) 75vw, 38vw" />
            </div>
            <div className="absolute bottom-0 right-0 h-[48%] w-[53%] overflow-hidden rounded-[1.6rem] border-[8px] border-[#f7f8fb] shadow-2xl">
              <Image src="/images/bbcourt.jpg" alt="GreatLife indoor court" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 28vw" />
            </div>
            <div className="absolute bottom-5 left-5 rounded-2xl bg-[#101641] px-5 py-4 text-white shadow-xl">
              <p className="text-2xl font-black text-[#f4c46b]">3 courts</p>
              <p className="text-sm text-white/60">One complete facility</p>
            </div>
          </div>

          <div data-reveal>
            <p className="section-kicker">About GreatLife</p>
            <h2 className="section-title mt-4">More than a place to work out.</h2>
            <p className="mt-7 text-lg leading-8 text-slate-600">
              GreatLife Fitness brings indoor court sports and full gym training together under one roof. Build strength, run a game, and recover without having to move between facilities.
            </p>
            <div className="mt-9 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-2xl font-black text-[#171d53]">Air-conditioned</p>
                <p className="mt-1 text-sm text-slate-500">Comfort in every session</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-2xl font-black text-[#171d53]">All-in-one</p>
                <p className="mt-1 text-sm text-slate-500">Train, play, and recover</p>
              </div>
            </div>
            <Link href="#contact" className="mt-9 inline-flex items-center gap-2 font-extrabold text-[#171d53] hover:text-[#7551bd]">
              Visit GreatLife <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>

        <section id="courts" className="bg-[#0a1038] px-6 py-24 text-white md:px-10 lg:py-32">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end" data-reveal>
              <div>
                <p className="section-kicker text-[#f4c46b]">Book your session</p>
                <h2 className="mt-4 max-w-2xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">Pick your court. Bring your game.</h2>
              </div>
              <p className="max-w-md text-base leading-7 text-white/58">Choose a sport, select an available date and time, then receive your booking status by email.</p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {courts.map((court, index) => (
                <article key={court.name} className="group overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/6" data-reveal style={{ transitionDelay: `${index * 90}ms` }}>
                  <div className="relative h-64 overflow-hidden">
                    <Image src={court.image} alt={`${court.name} court`} fill className="object-cover transition duration-700 group-hover:scale-105" sizes="(max-width: 1024px) 100vw, 33vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a1038] via-transparent to-transparent" />
                    <span className="absolute left-5 top-5 rounded-full bg-[#f4c46b] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#11152f]">{court.price}</span>
                  </div>
                  <div className="p-7">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f4c46b]">{court.eyebrow}</p>
                    <h3 className="mt-3 text-3xl font-black">{court.name}</h3>
                    <p className="mt-4 min-h-20 leading-7 text-white/58">{court.description}</p>
                    <Link href={court.href} className="mt-7 flex min-h-13 items-center justify-between rounded-full bg-white px-6 font-extrabold text-[#11152f] transition hover:bg-[#f4c46b]">
                      Reserve this court <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="why" className="mx-auto max-w-[1280px] px-6 py-24 md:px-10 lg:px-16 lg:py-32">
          <div className="max-w-2xl" data-reveal>
            <p className="section-kicker">The GreatLife rhythm</p>
            <h2 className="section-title mt-4">Everything you need for a better session.</h2>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[1.7rem] border border-slate-200 bg-slate-200 md:grid-cols-3" data-reveal>
            {amenities.map((item) => (
              <div key={item.number} className="bg-white p-8 lg:p-10">
                <p className="text-sm font-black text-[#8260c7]">{item.number}</p>
                <h3 className="mt-10 text-3xl font-black text-[#11172f]">{item.title}</h3>
                <p className="mt-4 leading-7 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-24 lg:pb-32" aria-label="Facility gallery">
          <div className="mb-10 px-6 text-center md:px-10" data-reveal>
            <p className="section-kicker">Inside GreatLife</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#11172f] sm:text-4xl">A space built to keep you moving.</h2>
          </div>
          <div className="gallery-rail">
            {[...gallery, ...gallery].map((item, index) => (
              <div key={`${item.src}-${index}`} className="relative h-72 w-[min(78vw,420px)] shrink-0 overflow-hidden rounded-[1.5rem]">
                <Image src={item.src} alt={index < gallery.length ? item.alt : ''} fill className="object-cover" sizes="420px" />
              </div>
            ))}
          </div>
        </section>

        <section id="membership" className="px-6 pb-24 md:px-10 lg:px-16 lg:pb-32">
          <div className="relative mx-auto max-w-[1152px] overflow-hidden rounded-[2rem] bg-[#6d4ab1] px-7 py-14 text-center text-white shadow-[0_30px_80px_rgba(64,42,118,.25)] sm:px-12 lg:py-20" data-reveal>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,.18),transparent_28%),radial-gradient(circle_at_90%_90%,rgba(244,196,107,.22),transparent_30%)]" />
            <div className="relative z-10 mx-auto max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffe09e]">Ready when you are</p>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.045em] sm:text-5xl">Make your next session count.</h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/75">Select a court now and we’ll keep the booking process simple from request to approval.</p>
              <Link href="#courts" className="mt-9 inline-flex min-h-14 items-center justify-center rounded-full bg-[#f4c46b] px-8 font-extrabold text-[#11152f] transition hover:-translate-y-0.5 hover:bg-[#ffdda0]">
                Book a court
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
