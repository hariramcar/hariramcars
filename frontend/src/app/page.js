import { Suspense } from 'react';
export const revalidate = 60;
import dynamicNext from 'next/dynamic';

import HeroSection from '@/components/HeroSection';
// import DealershipServices from '@/components/static/DealershipServices';
import WhyChooseUs from '@/components/static/WhyChooseUs';
import FeaturedCarsServer from '@/components/server/FeaturedCarsServer';
import PromoBannersServer from '@/components/server/PromoBannersServer';
import TestimonialsServer from '@/components/server/TestimonialsServer';

import CarGridSkeleton from '@/components/skeletons/CarGridSkeleton';
import BannerSkeleton from '@/components/skeletons/BannerSkeleton';
import TestimonialSkeleton from '@/components/skeletons/TestimonialSkeleton';
import GoogleReviewsSkeleton from '@/components/skeletons/GoogleReviewsSkeleton';
import DynamicGoogleReviews from '@/components/client/DynamicGoogleReviews';
import CustomerReviewReels from '@/components/CustomerReviewReels';
import ShowroomVideo from '@/components/ShowroomVideo';
import LiveTicker from '@/components/LiveTicker';

export const metadata = {
  title: 'Hariram Cars | Top Car Dealer for Second-Hand Cars in Surat',
  description: 'Welcome to Hariram Motors (Hariram Cars). Buy or sell second-hand motors and certified pre-owned cars in Surat. Get the best deals from a trusted car dealer.',
  alternates: { canonical: 'https://www.hariramcars.com/' },
  openGraph: {
    title: 'Hariram Cars | Top Car Dealer for Second-Hand Cars in Surat',
    description: 'Welcome to Hariram Motors (Hariram Cars). Buy or sell second-hand motors and certified pre-owned cars in Surat.',
    url: 'https://www.hariramcars.com/',
    images: [{ url: '/logo-512.jpg', width: 1200, height: 630 }],
  },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />

      {/* MOBILE LIVE TICKER - ABOVE VIDEO */}
      <div className="block md:hidden">
        <LiveTicker />
      </div>

      {/* SHOWROOM VIDEO SECTION */}
      <ShowroomVideo />

      {/* DESKTOP LIVE TICKER - BELOW VIDEO, ABOVE INVENTORY */}
      <div className="hidden md:block">
        <LiveTicker />
      </div>

      {/* ════ UNIFIED SHOWROOM BACKGROUND (SECTIONS 3 & 4) ════ */}
      <div className="relative w-full overflow-hidden bg-[#f4f4f8] dark:bg-transparent transition-colors duration-500">
        <div className="absolute inset-0 dark:hidden pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#f4f4f8] via-white to-[#f4f4f8] opacity-80"></div>
          <div className="absolute inset-0 opacity-[0.03] blueprint-grid"></div>
          <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[400px] bg-gradient-to-r from-transparent via-white/80 to-transparent rotate-[35deg] transform-gpu opacity-90 z-0"></div>
          <div className="absolute top-[40%] -right-[30%] w-[160%] h-[300px] bg-gradient-to-r from-transparent via-white/60 to-transparent -rotate-[15deg] transform-gpu opacity-70 z-0"></div>
          <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(233,213,255,0.3) 0%, transparent 70%)' }}></div>
          <div className="absolute bottom-[10%] right-[-10%] w-[700px] h-[700px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(252,231,243,0.4) 0%, transparent 70%)' }}></div>
        </div>
        <div className="hidden dark:block absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[#0a0a12]"></div>
          <div className="absolute inset-0 opacity-[0.05] blueprint-grid"></div>
          <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[400px] bg-gradient-to-r from-transparent via-purple-900/10 to-transparent rotate-[35deg] transform-gpu z-0"></div>
          <div className="absolute top-[40%] -right-[30%] w-[160%] h-[300px] bg-gradient-to-r from-transparent via-blue-900/10 to-transparent -rotate-[15deg] transform-gpu z-0"></div>
          <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.1) 0%, transparent 70%)' }}></div>
          <div className="absolute bottom-[10%] right-[-10%] w-[700px] h-[700px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)' }}></div>
        </div>

        {/* <DealershipServices /> */}

        <section className="pt-4 md:pt-6 pb-10 md:pb-14 lg:pb-20 relative z-10 transition-colors duration-500 dark:bg-transparent">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 md:mb-12 gap-4">
              <div>
                <p className="text-purple-600 dark:text-purple-400 text-xs font-bold tracking-widest uppercase mb-3 transition-colors">OUR INVENTORY</p>
                <h2 className="text-3xl md:text-[40px] text-black dark:text-white font-bold leading-tight transition-colors" style={{ fontFamily: 'var(--font-outfit)' }}>
                  Featured Cars
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2 transition-colors">Handpicked vehicles at unbeatable prices</p>
              </div>
              <div>
                <a href="/catalog" className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm font-medium flex items-center gap-1 group transition-colors">
                  View All Cars
                </a>
              </div>
            </div>

            <Suspense fallback={<CarGridSkeleton />}>
              <FeaturedCarsServer />
            </Suspense>
          </div>
        </section>
      </div>

      <WhyChooseUs />

      {/* ════ UNIFIED SHOWROOM BACKGROUND (SECTIONS 6, 7 & 8) ════ */}
      <div className="relative w-full overflow-hidden bg-[#f4f4f8] dark:bg-transparent transition-colors duration-500">
        <div className="absolute inset-0 dark:hidden pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#f4f4f8] via-white to-[#f4f4f8] opacity-80"></div>
          <div className="absolute inset-0 opacity-[0.03] blueprint-grid"></div>
          <div className="absolute top-[10%] -right-[20%] w-[140%] h-[400px] bg-gradient-to-r from-transparent via-white/80 to-transparent -rotate-[25deg] transform-gpu opacity-90 z-0"></div>
          <div className="absolute top-[60%] -left-[30%] w-[160%] h-[300px] bg-gradient-to-r from-transparent via-white/60 to-transparent rotate-[15deg] transform-gpu opacity-70 z-0"></div>
          <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(191,219,254,0.3) 0%, transparent 70%)' }}></div>
          <div className="absolute bottom-[20%] left-[10%] w-[800px] h-[800px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(233,213,255,0.3) 0%, transparent 70%)' }}></div>
        </div>
        <div className="hidden dark:block absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[#0a0a12]"></div>
          <div className="absolute inset-0 opacity-[0.05] blueprint-grid"></div>
          <div className="absolute top-[10%] -right-[20%] w-[140%] h-[400px] bg-gradient-to-r from-transparent via-blue-900/10 to-transparent -rotate-[25deg] transform-gpu z-0"></div>
          <div className="absolute top-[60%] -left-[30%] w-[160%] h-[300px] bg-gradient-to-r from-transparent via-purple-900/10 to-transparent rotate-[15deg] transform-gpu z-0"></div>
          <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)' }}></div>
          <div className="absolute bottom-[20%] left-[10%] w-[800px] h-[800px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.1) 0%, transparent 70%)' }}></div>
        </div>

        <Suspense fallback={<BannerSkeleton />}>
          <PromoBannersServer />
        </Suspense>


        {/* CUSTOMER REVIEW REELS */}
        <CustomerReviewReels />

        <div className="relative z-10 dark:bg-transparent">
          <Suspense fallback={<GoogleReviewsSkeleton />}>
            <DynamicGoogleReviews />
          </Suspense>
        </div>

        <Suspense fallback={<TestimonialSkeleton />}>
          <TestimonialsServer />
        </Suspense>
      </div>
    </>
  );
}
