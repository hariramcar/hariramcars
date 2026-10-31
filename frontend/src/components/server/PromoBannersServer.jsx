import React from 'react';
import PromoBannersClient from '@/components/client/PromoBannersClient';

async function getBanners() {
  let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  
  try {
    const res = await fetch(`${baseUrl}/promo-banners?active=true`, {
      next: { revalidate: 15 }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch banners:", error);
    return [];
  }
}

export default async function PromoBannersServer() {
  let banners = await getBanners();

  // Defensive check: ensure it's an array
  if (!Array.isArray(banners)) {
    if (banners && Array.isArray(banners.data)) {
      banners = banners.data;
    } else if (banners && Array.isArray(banners.banners)) {
      banners = banners.banners;
    } else {
      banners = [];
    }
  }

  if (!banners || banners.length === 0) return null;

  return (
    <section className="py-8 md:py-12 relative z-10 transition-colors duration-500 dark:bg-transparent">
      <PromoBannersClient banners={banners} />
    </section>
  );
}
