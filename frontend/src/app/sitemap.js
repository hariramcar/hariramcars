export default async function sitemap() {
  const baseUrl = 'https://www.hariramcars.com';
  let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/catalog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/sell-your-car`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  try {
    const res = await fetch(`${apiUrl}/cars?limit=1000`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return staticRoutes;

    const data = await res.json();
    const carRoutes = (data.cars || [])
      .filter(car => car.slug && car.status !== 'sold')
      .map(car => ({
        url: `${baseUrl}/catalog/${car.slug}`,
        lastModified: new Date(car.updatedAt || car.createdAt || new Date()),
        changeFrequency: 'weekly',
        priority: car.isFeatured ? 0.8 : 0.6,
      }));

    return [...staticRoutes, ...carRoutes];
  } catch (err) {
    return staticRoutes;
  }
}
