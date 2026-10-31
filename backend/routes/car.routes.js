import express from 'express';
import Car from '../models/Car.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { upload, uploadToR2, deleteFromR2 } from '../config/r2.js';
import { validateCar } from '../middleware/validate.js';

import { cache, clearCache } from '../middleware/cache.js';
import webpush from 'web-push';
import { Subscription } from '../models/subscription.model.js';

// Setup Web Push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contact@hariramcars.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const router = express.Router();
// Trigger nodemon restart

// ── GET /api/cars — Public listing with filters ──
router.get('/', cache(5), async (req, res) => {
  try {
    const {
      search, make, fuelType, minPrice, maxPrice, minYear, maxYear,
      transmission, bodyType, status, sort, page = 1, limit = 1000,
      featured, condition,
    } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { make: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
      ];
    }
    if (make) {
      const makes = make.split(',');
      filter.make = { $in: makes.map(m => new RegExp(`^${m}$`, 'i')) };
    }
    if (condition) filter.condition = condition;
    if (fuelType) filter.fuelType = { $in: fuelType.split(',') };
    if (transmission) filter.transmission = transmission;
    if (bodyType) filter.bodyType = { $in: bodyType.split(',') };
    if (status) filter.status = status;
    else filter.status = { $ne: 'sold' }; // Default: hide sold cars
    if (featured === 'true') filter.isFeatured = true;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (minYear || maxYear) {
      filter.year = {};
      if (minYear) filter.year.$gte = Number(minYear);
      if (maxYear) filter.year.$lte = Number(maxYear);
    }

    let baseSort = { createdAt: -1 };
    if (sort === 'price_asc' || sort === 'price') {
      baseSort = { price: 1 };
    } else if (sort === 'price_desc' || sort === '-price') {
      baseSort = { price: -1 };
    } else if (sort === 'year_desc' || sort === '-year') {
      baseSort = { year: -1 };
    } else if (sort === 'year_asc' || sort === 'year') {
      baseSort = { year: 1 };
    } else if (sort === 'kms_asc' || sort === 'kms') {
      baseSort = { kms: 1 };
    } else if (sort === 'kms_desc' || sort === '-kms') {
      baseSort = { kms: -1 };
    } else if (sort === 'oldest' || sort === 'createdAt') {
      baseSort = { createdAt: 1 };
    } else {
      baseSort = { createdAt: -1 };
    }
    
    const sortOption = { ...baseSort, _id: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [cars, total] = await Promise.all([
      Car.find(filter).sort(sortOption).skip(skip).limit(Number(limit)).lean(),
      Car.countDocuments(filter),
    ]);

    res.json({
      cars,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/cars/filters — Get makes and brand-model map ──
router.get('/filters', cache(15), async (_req, res) => {
  try {
    const activeFilter = { status: { $ne: 'sold' } };
    const makes = await Car.distinct('make', activeFilter);
    const fuelTypes = await Car.distinct('fuelType', activeFilter);
    const bodyTypes = await Car.distinct('bodyType', activeFilter);
    
    // Aggregate to get unique models per make
    const brandModelMap = await Car.aggregate([
      { $match: activeFilter },
      { $group: { _id: '$make', models: { $addToSet: '$model' } } }
    ]);

    // Aggregate to get min and max price
    const priceRange = await Car.aggregate([
      { $match: activeFilter },
      { $group: { _id: null, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } }
    ]);
    
    res.json({
      data: {
        makes: makes.filter(Boolean).sort(),
        fuelTypes: fuelTypes.filter(Boolean).sort(),
        bodyTypes: bodyTypes.filter(Boolean).sort(),
        brandModelMap,
        minPrice: priceRange.length > 0 ? priceRange[0].minPrice : 100000,
        maxPrice: priceRange.length > 0 ? priceRange[0].maxPrice : 10000000
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/cars/brands — List unique brands ──
router.get('/brands', cache(60), async (_req, res) => {
  try {
    const brands = await Car.distinct('make');
    res.json(brands.sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/cars/:slug — Single car by slug or ID ──
router.get('/:slug', cache(5), async (req, res) => {
  try {
    const { slug } = req.params;
    let car;
    
    if (/^[0-9a-fA-F]{24}$/.test(slug)) {
      car = await Car.findById(slug).lean();
    }
    
    if (!car) {
      car = await Car.findOne({ slug }).lean();
    }
    
    if (!car) return res.status(404).json({ error: 'Car not found' });
    res.json(car);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/cars — Create car (admin) ──
router.post('/', protect, adminOnly, upload.array('images', 25), validateCar, async (req, res) => {
  try {
    const carData = { ...req.body };

    const isNowFeatured = carData.isFeatured === 'true' || carData.isFeatured === true;
    if (isNowFeatured) {
      const featuredCount = await Car.countDocuments({ isFeatured: true });
      if (featuredCount >= 8) {
        return res.status(400).json({ error: 'Maximum of 8 cars can be shown on home page' });
      }
    }

    // Parse features and badges if sent as JSON string
    if (typeof carData.features === 'string') {
      try { carData.features = JSON.parse(carData.features); } catch { /* keep as is */ }
    }
    if (typeof carData.badges === 'string') {
      try { carData.badges = JSON.parse(carData.badges); } catch { /* keep as is */ }
    }

    // Process and upload images sequentially to prevent RAM exhaustion
    if (req.files && req.files.length > 0) {
      const uploadedImages = [];
      for (const file of req.files) {
        // Sequentially pipe buffer to sharp, compress, and upload to Cloudflare R2
        const result = await uploadToR2(file.buffer, file.originalname);
        uploadedImages.push({ url: result.secure_url, publicId: result.public_id });
      }
      carData.images = uploadedImages;
    }

    const car = await Car.create(carData);

    // Generate slug with ID
    car.slug = `${car.year}-${car.make}-${car.model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${car._id.toString().slice(-6)}`;
    await car.save();

    clearCache('/api/cars');

    // Send Push Notification
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      try {
        const subscriptions = await Subscription.find().lean();
        const payload = JSON.stringify({
          title: 'New Car Listed!',
          body: `${car.make} ${car.model} just listed. Check it out now!`,
          url: `/catalog/${car.slug}`
        });

        const notifications = subscriptions.map(sub => 
          webpush.sendNotification(sub, payload).catch(err => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              // Subscription has expired or is no longer valid
              return Subscription.deleteOne({ _id: sub._id });
            }
            console.error('Error sending push notification:', err);
          })
        );
        
        // Await this to ensure it completes before serverless function exits
        await Promise.all(notifications);
      } catch (err) {
        console.error('Failed to send push notifications:', err);
      }
    }

    res.status(201).json(car);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper for deleting media (R2)
const deleteMediaSafe = async (publicId) => {
  if (!publicId) return;
  try {
    await deleteFromR2(publicId);
  } catch (e) {
    console.error('Delete media error:', e.message);
  }
};

// ── PUT /api/cars/:id — Update car (admin) ──
router.put('/:id', protect, adminOnly, upload.array('images', 25), async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ error: 'Car not found' });

    const updateData = { ...req.body };

    const isNowFeatured = updateData.isFeatured === 'true' || updateData.isFeatured === true;
    if (isNowFeatured && !car.isFeatured) {
      const featuredCount = await Car.countDocuments({ isFeatured: true });
      if (featuredCount >= 8) {
        return res.status(400).json({ error: 'Maximum of 8 cars can be shown on home page' });
      }
    }

    if (typeof updateData.features === 'string') {
      try { updateData.features = JSON.parse(updateData.features); } catch { /* keep as is */ }
    }
    if (typeof updateData.badges === 'string') {
      try { updateData.badges = JSON.parse(updateData.badges); } catch { /* keep as is */ }
    }

    // Handle existing images (kept)
    if (typeof updateData.existingImages === 'string') {
      try { updateData.images = JSON.parse(updateData.existingImages); } catch { /* keep as is */ }
      delete updateData.existingImages;
    }

    // Upload new images sequentially to protect RAM
    if (req.files && req.files.length > 0) {
      const uploadedImages = [];
      for (const file of req.files) {
        const result = await uploadToR2(file.buffer, file.originalname);
        uploadedImages.push({ url: result.secure_url, publicId: result.public_id });
      }
      updateData.images = [...(updateData.images || []), ...uploadedImages];
    }

    // Handle deleted images (sequential deletion for stability)
    if (updateData.deletedImages) {
      const deleted = typeof updateData.deletedImages === 'string'
        ? JSON.parse(updateData.deletedImages) : updateData.deletedImages;
      
      for (const publicId of deleted) {
        if (publicId) await deleteMediaSafe(publicId);
      }
      delete updateData.deletedImages;
    }

    Object.assign(car, updateData);
    await car.save();

    clearCache('/api/cars');

    res.json(car);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /api/cars/:id — Delete car (admin) ──
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ error: 'Car not found' });

    // Delete images sequentially to prevent rate limits
    if (car.images && car.images.length > 0) {
      for (const img of car.images) {
        if (img.publicId) {
          await deleteMediaSafe(img.publicId);
        }
      }
    }

    await Car.findByIdAndDelete(req.params.id);
    clearCache('/api/cars');
    res.json({ message: 'Car deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
