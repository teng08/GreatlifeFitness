'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef } from 'react';

export default function HomePage() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.js-animate-on-scroll');
    elements.forEach(el => observer.observe(el));

    return () => {
      elements.forEach(el => observer.unobserve(el));
    };
  }, []);

  const facilityImages = [
    'gym.jpg', 'cycling.jpg', 'zumba.jpg', 'locker.jpg', 'training.jpg',
    'weights.jpg', 'cr.jpg', 'bmcourt.jpg', 'ttcourt.jpg', 'muscle.jpg'
  ];

  return (
    <div className="bg-white font-[Alata] overflow-x-hidden">
      {/* Hero Section */}
      <header id="hero" className="relative h-screen flex justify-center items-center text-white text-center -mt-20 pt-20 overflow-hidden">
        <video className="absolute top-0 left-0 w-full h-full object-cover z-0 brightness-[60%]" autoPlay muted loop playsInline>
          <source src="/images/hero-bg-vid.mp4" type="video/mp4" />
        </video>
        <div className="relative z-10 hero-content px-5 max-w-2xl text-left md:ml-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-[#cdad7d]" style={{
            textShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}>
            WELCOME
          </h1>
          <p className="text-xl mb-8 leading-relaxed">
            Reserve our fully air-conditioned indoor court at GreatLife Fitness.
            Train, play, and perform better — with full gym facilities available for members.
          </p>
          <Link
            href="#courts"
            className="inline-block px-12 py-5 text-white font-bold rounded-full transition-all hover:-translate-y-1 hover:shadow-lg"
            style={{
              background: 'linear-gradient(to bottom, #15294f, #652f7c)'
            }}
          >
            Book a Court
          </Link>
        </div>
      </header>

      {/* About Section */}
      <section id="about" className="relative py-24 px-[8%] my-24 flex flex-col md:flex-row items-center justify-between gap-12 overflow-hidden min-h-[600px]">
        {/* Background Strip */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[55%] md:h-[65%] z-0">
          <div className="w-full h-full bg-[url('/images/sceneric.png')] bg-cover bg-center bg-no-repeat"></div>
          <div className="absolute inset-0 bg-blue-900/40"></div>
        </div>

        <div className="relative z-10 flex-1 text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">About Us</h2>
          <p className="text-lg leading-relaxed mb-8 max-w-lg">
            At GreatLife Fitness, we provide a complete training environment for players and fitness enthusiasts.
            Our indoor basketball court is supported by modern gym equipment designed for strength, conditioning,
            and recovery before and after every game. This combination allows athletes to train, play,
            and improve — all in one place.
          </p>
          <Link
            href="#contact"
            className="inline-block px-12 py-4 bg-white text-black font-medium rounded-full transition-all hover:scale-110"
            style={{ background: 'linear-gradient(to bottom, #396ed0, #b66ed4)' }}
          >
            Get in Touch
          </Link>
        </div>

        <div className="relative z-10 flex-1 flex justify-center">
          <div className="w-[80%] md:w-[70%] h-[400px] md:h-[600px] rounded-2xl overflow-hidden shadow-2xl">
            <video autoPlay loop muted playsInline className="w-full h-full object-cover">
              <source src="/images/video.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="why" className="relative pt-20 pb-32">
        <div className="relative py-20 px-8 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "linear-gradient(rgba(0, 0, 100, 0.5), rgba(0, 0, 100, 0.6)), url('/images/sceneric.png')" }}>
          <h3 className="text-center text-4xl mb-12 text-[#cdad7d] js-animate-on-scroll">More Than Just a Court</h3>
          <div className="flex flex-wrap justify-center gap-12 max-w-6xl mx-auto">
            <div className="border-2 border-[#cdad7d] p-6 w-72 h-80 transition-all js-animate-on-scroll why-us-card">
              <p className="text-white text-lg leading-relaxed">
                Train in a motivating environment.<br /><br />
                Our facility offers a scenic and comfortable space that keeps you focused, energized, and ready to perform at your best.
              </p>
            </div>
            <div className="border-2 border-[#cdad7d] p-6 w-72 h-80 transition-all js-animate-on-scroll why-us-card">
              <p className="text-white text-lg leading-relaxed">
                Support beyond the game.<br /><br />
                Our friendly staff is always available to assist you before and after your court sessions, ensuring a smooth and comfortable experience.
              </p>
            </div>
            <div className="border-2 border-[#cdad7d] p-6 w-72 h-80 transition-all js-animate-on-scroll why-us-card">
              <p className="text-white text-lg leading-relaxed">
                Complete training facilities.<br /><br />
                Strength, cardio, and conditioning equipment are available to support your preparation and recovery alongside court use.
              </p>
            </div>
          </div>
        </div>

        {/* Carousel Section */}
        <div className="mt-24 px-8">
          <h3 className="text-center text-3xl mb-12 text-gray-800 js-animate-on-scroll">What else we offer...</h3>
          <div className="carousel-container">
            <div className="carousel">
              <div className="carousel-track">
                {facilityImages.map((img, i) => (
                  <div key={`group1-${i}`} className="carousel-card relative">
                    <Image src={`/images/${img}`} alt={`Facility ${i}`} fill className="object-cover rounded-xl" />
                  </div>
                ))}
              </div>
              <div className="carousel-track" aria-hidden="true">
                {facilityImages.map((img, i) => (
                  <div key={`group2-${i}`} className="carousel-card relative">
                    <Image src={`/images/${img}`} alt={`Facility ${i}`} fill className="object-cover rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Membership & Rates Section */}
      <section id="membership" className="py-24 px-8 bg-[url('/images/wave-bg.jpg')] bg-cover bg-bottom bg-fixed">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-10 justify-center items-stretch">
          {/* Rates Text Box */}
          <div className="bg-white p-10 rounded-[20px] shadow-xl flex-1 max-w-lg js-animate-on-scroll slide-left">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800">Court Booking Rates & Discounts</h2>
            <ul className="space-y-4 text-lg text-gray-700">
              <li>🏀 Hourly court reservation available</li>
              <li>🎓 20% discount for students & senior citizens</li>
              <li>🏋️ Optional gym access for training & recovery</li>
              <li>📋 Booking and availability at the front desk</li>
            </ul>
          </div>

          {/* Price Image Box */}
          <div className="bg-white p-5 rounded-[20px] shadow-xl flex-1 max-w-lg js-animate-on-scroll slide-right flex items-center">
            <div className="relative w-full h-[300px] md:h-full min-h-[300px]">
              <Image src="/images/price.jpg" alt="Rates" fill className="object-cover rounded-xl" />
            </div>
          </div>
        </div>

        {/* Courts Section */}
        <section id="courts" className="mt-32 pb-16">
          <h2 className="text-center text-4xl mb-16 text-[#ffc587] js-animate-on-scroll">Choose your Court</h2>
          <div className="flex flex-wrap justify-center gap-6 max-w-7xl mx-auto">
            {[
              { name: 'Basketball Court', img: 'basketball.jpg', href: '/booking/basketball', desc: 'Nothing beats the energy of a strong basketball community!' },
              { name: 'Badminton Court', img: 'badminton.jpg', href: '/booking/badminton', desc: 'Smash. Drop. Repeat. Have a blast with friends!' },
              { name: 'Table Tennis', img: 'tabletennis.jpg', href: '/booking/table-tennis', desc: 'Serve up some fun while breaking a sweat!' }
            ].map((court) => (
              <div key={court.name} className="bg-[#e8e4e4] text-black p-6 rounded-xl transition-all hover:-translate-y-2 hover:shadow-[0px_0px_35px_rgba(0,0,0,0.5)] hover:bg-[#08054C] hover:text-white flex flex-col items-center text-center h-full group w-full md:w-[350px]">
                <div className="relative w-full h-48 mb-6">
                  <Image src={`/images/${court.img}`} alt={court.name} fill className="object-cover rounded-lg" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{court.name}</h3>
                <p className="flex-grow mb-6 opacity-90">{court.desc}</p>
                <Link
                  href={court.href}
                  className="inline-block px-8 py-3 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 w-3/5"
                  style={{ background: 'linear-gradient(to bottom, #1e3c72, #8e44ad)' }}
                >
                  Book now
                </Link>
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
