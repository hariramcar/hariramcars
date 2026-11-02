import React from 'react';
import Link from 'next/link';
import { IconArrowRight } from '@tabler/icons-react';
import CarCard from '@/components/CarCard';

async function getFeaturedCars() {
  let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';


  try {
    const res = await fetch(`${baseUrl}/cars?limit=8&status=available&featured=true`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.cars || [];
  } catch (error) {
    console.error("Failed to fetch featured cars:", error);
    return [];
  }
}

export default async function FeaturedCarsServer() {
  let cars = await getFeaturedCars();

  // Defensive check: ensure it's an array
  if (!Array.isArray(cars)) {
    if (cars && Array.isArray(cars.data)) {
      cars = cars.data;
    } else if (cars && Array.isArray(cars.cars)) {
      cars = cars.cars;
    } else {
      cars = [];
    }
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
      {cars.length > 0 ? (
        cars.slice(0, 6).map((car, i) => (
          <CarCard key={car._id} car={car} index={i} priority={i < 2} />
        ))
      ) : (
        <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 dark:bg-[#12121f] rounded-2xl border border-gray-200 dark:border-white/10">
          No cars currently featured. Browse our catalog for more.
        </div>
      )}
    </div>
  );
}
