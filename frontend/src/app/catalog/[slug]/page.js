import { notFound } from 'next/navigation';
import CarDetailPageClient from '@/components/CarDetailPageClient';
import { extractImageUrl } from '@/lib/utils';


export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';


  try {
    const res = await fetch(`${baseUrl}/cars/${slug}`, {
      next: { revalidate: 15 }
    });
    if (!res.ok) return { title: 'Car Not Found' };

    const responseData = await res.json();
    const car = responseData.data || responseData; 
    
    if (!car || !car.title) {
       return { title: 'Car Not Found' };
    }

    const name = car.title || `${car.year} ${car.make} ${car.model}`;
    const price = car.price
      ? `₹${(car.price / 100000).toFixed(1)} Lakh`
      : '';
    const km = car.kms
      ? `${car.kms.toLocaleString('en-IN')} km`
      : '';

    const title = `${name} for Sale in Surat`;
    const description = car.description
      || `Buy ${name}${price ? ` at ${price}` : ''}${km ? `, ${km} driven` : ''}, ${car.fuelType || ''} at Hariram Motors, Surat. Certified, documented, best price.`;
    const extractedImg = car.images?.[0] ? extractImageUrl(car.images[0]) : null;
    const image = extractedImg
      ? extractedImg.replace(
          '/upload/',
          '/upload/w_1200,h_630,c_fill,q_auto,f_auto/'
        )
      : '/logo-512.jpg';

    return {
      title,
      description,
      alternates: {
        canonical: `https://www.hariramcars.com/catalog/${slug}`,
      },
      openGraph: {
        title,
        description,
        url: `https://www.hariramcars.com/catalog/${slug}`,
        type: 'website',
        images: [{
          url: image,
          alt: name,
        }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
    };
  } catch (error) {
    return { title: 'Car | Hariram Motors' };
  }
}

async function getCarData(slug) {
  let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  try {
    const res = await fetch(`${baseUrl}/cars/${slug}`, { next: { revalidate: 15 } });
    if (!res.ok) return { car: null, similarCars: [] };
    
    const responseData = await res.json();
    const car = responseData.data || responseData;
    
    // Fetch similar cars
    let similarRes = await fetch(`${baseUrl}/cars?make=${car.make}&status=available&limit=4`, { next: { revalidate: 15 } });
    let similarData = similarRes.ok ? await similarRes.json() : { cars: [] };
    let filtered = (similarData.cars || []).filter(c => c._id !== car._id);
    
    if (filtered.length === 0) {
      similarRes = await fetch(`${baseUrl}/cars?status=available&limit=4`, { next: { revalidate: 15 } });
      similarData = similarRes.ok ? await similarRes.json() : { cars: [] };
      filtered = (similarData.cars || []).filter(c => c._id !== car._id);
    }
    
    return { car, similarCars: filtered.slice(0, 3) };
  } catch (error) {
    console.error("Failed to fetch car data server-side:", error);
    return { car: null, similarCars: [] };
  }
}

export default async function CarDetailPageServer({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  const { car, similarCars } = await getCarData(slug);
  
  if (!car) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: car.title || `${car.year} ${car.make} ${car.model}`,
    image: (car.images?.[0] ? extractImageUrl(car.images[0]) : null) || 'https://www.hariramcars.com/logo.jpeg',
    description: car.description || `Buy ${car.year} ${car.make} ${car.model} at Hariram Motors.`,
    brand: {
      '@type': 'Brand',
      name: car.make,
    },
    model: car.model,
    vehicleConfiguration: car.variant,
    modelDate: car.year,
    mileageFromOdometer: {
      '@type': 'QuantitativeValue',
      value: car.kms,
      unitCode: 'KMT'
    },
    fuelType: car.fuelType,
    vehicleEngine: car.engineCC ? {
      '@type': 'EngineSpecification',
      engineDisplacement: {
        '@type': 'QuantitativeValue',
        value: car.engineCC,
        unitCode: 'CMQ'
      }
    } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: car.price,
      itemCondition: 'https://schema.org/UsedCondition',
      availability: car.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'AutoDealer',
        name: 'Hariram Motors',
      }
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CarDetailPageClient initialCar={car} initialSimilarCars={similarCars} />
    </>
  );
}
