import { extractImageUrl } from '@/lib/utils';

export default async function CarDetailLayout({ children, params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  
  let car = null;
  try {
    const res = await fetch(`${baseUrl}/cars/${slug}`, { cache: 'no-store' });
    if (res.ok) {
      const responseData = await res.json();
      car = responseData.data || responseData;
    }
  } catch(e) {}

  return (
    <>
      {car && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Car",
              "name": car.title || `${car.year} ${car.make} ${car.model}`,
              "description": car.description,
              "brand": {
                "@type": "Brand",
                "name": car.make
              },
              "model": car.model,
              "modelDate": car.year?.toString(),
              "mileageFromOdometer": {
                "@type": "QuantitativeValue",
                "value": car.kms,
                "unitCode": "KMT"
              },
              "fuelType": car.fuelType,
              "vehicleTransmission": car.transmission,
              "color": car.color,
              "numberOfDoors": 4,
              "vehicleCondition": car.condition === 'new'
                ? "https://schema.org/NewCondition"
                : "https://schema.org/UsedCondition",
              "offers": {
                "@type": "Offer",
                "price": car.price,
                "priceCurrency": "INR",
                "availability": car.status === 'available'
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
                "itemCondition": car.condition === 'new' 
                  ? "https://schema.org/NewCondition" 
                  : "https://schema.org/UsedCondition",
                "url": `https://www.hariramcars.com/catalog/${slug}`,
                "seller": {
                  "@type": "AutoDealer",
                  "name": "Hariram Motors"
                }
              },
              "image": car.images?.[0] ? extractImageUrl(car.images[0]) : '',
              "url": `https://www.hariramcars.com/catalog/${slug}`
            }).replace(/</g, '\\u003c')
          }}
        />
      )}
      {children}
    </>
  );
}
