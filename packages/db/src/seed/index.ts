import { sql } from 'drizzle-orm';

import { getDb } from '../client';
import {
  users,
  partners,
  listings,
  listingImages,
  reviews,
  bookings,
  payments,
  favorites,
  sessions,
  savedSearches,
  analyticsEvents,
  conversations,
  messages,
} from '../schema/index';

// ---------------------------------------------------------------------------
// Pre-hashed passwords (bcrypt, 12 rounds)
// ---------------------------------------------------------------------------
// "admin123"
const HASH_ADMIN = '$2a$12$LJ3wFdQHfGdmFbKCHfXOCeC6EJl.v0VZ9FLGo.5bU2AUO5IqCGCNW';
// "password" — used for demo guest accounts
const HASH_PASSWORD = '$2a$12$LJ3wFdQHfGdmFbKCHfXOCeC6EJl.v0VZ9FLGo.5bU2AUO5IqCGCNW';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0]!;
}

function pastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0]!;
}

// ---------------------------------------------------------------------------
// Photo URLs (Unsplash) per category — multiple per listing
// ---------------------------------------------------------------------------
// Photo URLs are now assigned per-listing on each SAMPLE_LISTINGS entry, so
// every property gets its own distinct images (no two listings share a photo).

// ---------------------------------------------------------------------------
// Listing data
// ---------------------------------------------------------------------------
const SAMPLE_LISTINGS = [
  // 1. Featured, highly rated villa
  {
    title: 'Oceanfront Villa in Malibu',
    description:
      'Stunning oceanfront villa with panoramic Pacific views, private pool, and direct beach access. Modern architecture meets coastal living in this 5-bedroom masterpiece.',
    category: 'villa' as const,
    pricePerNight: '1250',
    city: 'Malibu',
    state: 'California',
    country: 'United States',
    lat: '34.0259',
    lng: '-118.7798',
    amenities: ['wifi', 'pool', 'kitchen', 'parking', 'air-conditioning', 'beach-access'],
    maxGuests: 10,
    bedrooms: 5,
    bathrooms: 4,
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
      'https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=1200&q=80',
      'https://images.unsplash.com/photo-1592595896616-c37162298647?w=1200&q=80',
    ],
    // Scenario: HIGHLY RATED (4.92, 87 reviews) + FEATURED
  },
  // 2. Featured cabin with mixed reviews
  {
    title: 'Mountain Cabin Retreat in Aspen',
    description:
      'Cozy luxury cabin nestled in the Aspen mountains. Ski-in/ski-out access, hot tub under the stars, and a gourmet kitchen for après-ski gatherings.',
    category: 'cabin' as const,
    pricePerNight: '850',
    city: 'Aspen',
    state: 'Colorado',
    country: 'United States',
    lat: '39.1911',
    lng: '-106.8175',
    amenities: ['wifi', 'hot-tub', 'kitchen', 'parking', 'fireplace', 'ski-in-out', 'heating'],
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 3,
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=1200&q=80',
      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=1200&q=80',
      'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=1200&q=80',
      'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1200&q=80',
      'https://images.unsplash.com/photo-1539184132481-0e683b40e3a7?w=1200&q=80',
    ],
    // Scenario: BOOKED — will have a confirmed booking blocking near-future dates
  },
  // 3. Treehouse — unique property, moderate rating
  {
    title: 'Treehouse Escape in Big Sur',
    description:
      'Elevated living among ancient redwoods. This architectural treehouse blends seamlessly with nature while providing every modern comfort.',
    category: 'treehouse' as const,
    pricePerNight: '475',
    city: 'Big Sur',
    state: 'California',
    country: 'United States',
    lat: '36.2704',
    lng: '-121.8081',
    amenities: ['wifi', 'kitchen', 'garden', 'balcony'],
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80',
      'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=1200&q=80',
      'https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?w=1200&q=80',
      'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?w=1200&q=80',
      'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=1200&q=80',
    ],
    // Scenario: NO SIMILAR LISTINGS (only treehouse in the system in that area)
  },
  // 4. Castle — NO REVIEWS
  {
    title: 'Historic Castle in Scottish Highlands',
    description:
      'Live like royalty in this restored 16th-century castle. Complete with tower rooms, grand hall, and sprawling estate grounds.',
    category: 'castle' as const,
    pricePerNight: '2100',
    city: 'Inverness',
    state: 'Highlands',
    country: 'United Kingdom',
    lat: '57.4778',
    lng: '-4.2247',
    amenities: ['wifi', 'kitchen', 'parking', 'fireplace', 'garden', 'heating'],
    maxGuests: 16,
    bedrooms: 8,
    bathrooms: 6,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=1200&q=80',
      'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=1200&q=80',
      'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=1200&q=80',
      'https://images.unsplash.com/photo-1572889464105-49b1d3a0d5f4?w=1200&q=80',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=80',
    ],
    // Scenario: NO REVIEWS — new listing, zero reviews
  },
  // 5. Penthouse — featured, well-reviewed
  {
    title: 'Luxury Penthouse in Miami Beach',
    description:
      'Top-floor penthouse with floor-to-ceiling windows overlooking South Beach. Private rooftop terrace, infinity pool, and concierge service.',
    category: 'penthouse' as const,
    pricePerNight: '1800',
    city: 'Miami Beach',
    state: 'Florida',
    country: 'United States',
    lat: '25.7907',
    lng: '-80.1300',
    amenities: ['wifi', 'pool', 'gym', 'air-conditioning', 'parking', 'elevator', 'balcony'],
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 3,
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
      'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80',
      'https://images.unsplash.com/photo-1551038247-3d9af20df552?w=1200&q=80',
    ],
    // Scenario: FULLY BOOKED for the next month (overlapping booking test target)
  },
  // 6. Boat — LOW RATED
  {
    title: 'Sailboat Stay in Marina del Rey',
    description:
      'Sleep on the water in this beautifully appointed 50ft sailboat. Watch sunsets from the deck while moored in a premier marina.',
    category: 'boat' as const,
    pricePerNight: '325',
    city: 'Marina del Rey',
    state: 'California',
    country: 'United States',
    lat: '33.9802',
    lng: '-118.4517',
    amenities: ['wifi', 'kitchen', 'air-conditioning'],
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1200&q=80',
      'https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=1200&q=80',
      'https://images.unsplash.com/photo-1505839673365-e3971f8d9184?w=1200&q=80',
      'https://images.unsplash.com/photo-1527431016-31e23396e7e9?w=1200&q=80',
      'https://images.unsplash.com/photo-1599661046827-dacde6976549?w=1200&q=80',
    ],
    // Scenario: LOW RATED (3.2 avg)
  },
  // 7. Farmhouse — good reviews, partner listing
  {
    title: 'Tuscan Farmhouse with Vineyard',
    description:
      'Authentic Tuscan farmhouse surrounded by olive groves and a working vineyard. Includes daily wine tasting and breakfast with local produce.',
    category: 'farmhouse' as const,
    pricePerNight: '680',
    city: 'Siena',
    state: 'Tuscany',
    country: 'Italy',
    lat: '43.3188',
    lng: '11.3308',
    amenities: ['wifi', 'pool', 'kitchen', 'parking', 'garden', 'pet-friendly'],
    maxGuests: 12,
    bedrooms: 6,
    bathrooms: 4,
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1510627489930-0c1b0bfb6785?w=1200&q=80',
      'https://images.unsplash.com/photo-1595521624992-48a59aef95e3?w=1200&q=80',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80',
      'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=1200&q=80',
      'https://images.unsplash.com/photo-1505016731635-6e2ebbf95e89?w=1200&q=80',
    ],
    // Scenario: PARTNER listing with good reviews
  },
  // 8. Apartment — budget, high volume reviews
  {
    title: 'Modern Apartment in Tokyo Shibuya',
    description:
      'Sleek designer apartment in the heart of Shibuya. Walking distance to the best restaurants, shopping, and nightlife Tokyo has to offer.',
    category: 'apartment' as const,
    pricePerNight: '220',
    city: 'Tokyo',
    state: 'Kanto',
    country: 'Japan',
    lat: '35.6580',
    lng: '139.7016',
    amenities: ['wifi', 'kitchen', 'air-conditioning', 'washer', 'tv', 'elevator'],
    maxGuests: 3,
    bedrooms: 1,
    bathrooms: 1,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
      'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80',
      'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&q=80',
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80',
    ],
    // Scenario: BUDGET-FRIENDLY with many bookings (cancelled + confirmed mix)
  },
  // 9. Second villa — gives "similar listings" for villa category
  {
    title: 'Clifftop Villa in Santorini',
    description:
      'Whitewashed luxury perched above the Aegean Sea. Infinity pool, caldera views, and a private wine cellar make this a once-in-a-lifetime stay.',
    category: 'villa' as const,
    pricePerNight: '980',
    city: 'Oia',
    state: 'Santorini',
    country: 'Greece',
    lat: '36.4618',
    lng: '25.3753',
    amenities: ['wifi', 'pool', 'kitchen', 'air-conditioning', 'balcony', 'wine-cellar'],
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80',
      'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80',
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80',
    ],
    // Scenario: additional villa for "similar listings" results
  },
  // 10. Second cabin — gives "similar listings" for cabin category
  {
    title: 'Lakeside Cabin in Lake Tahoe',
    description:
      'A-frame cabin with panoramic lake views. Private dock, kayaks included, and a wood-burning fireplace for chilly mountain evenings.',
    category: 'cabin' as const,
    pricePerNight: '520',
    city: 'Lake Tahoe',
    state: 'California',
    country: 'United States',
    lat: '39.0968',
    lng: '-120.0324',
    amenities: ['wifi', 'kitchen', 'parking', 'fireplace', 'garden', 'lake-access'],
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200&q=80',
      'https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?w=1200&q=80',
      'https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=1200&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80',
      'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1200&q=80',
    ],
    // Scenario: additional cabin for "similar listings" results
  },
  // 11. Parisian apartment
  {
    title: 'Charming Apartment near the Eiffel Tower',
    description:
      'A classic Haussmannian apartment with wrought-iron balconies, herringbone floors, and a peek of the Eiffel Tower from the salon. Walk to cafés in the 7th arrondissement.',
    category: 'apartment' as const,
    pricePerNight: '410',
    city: 'Paris',
    state: 'Île-de-France',
    country: 'France',
    lat: '48.8566',
    lng: '2.3522',
    amenities: ['wifi', 'kitchen', 'elevator', 'tv', 'heating', 'washer'],
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
      'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80',
    ],
  },
  // 12. New York penthouse
  {
    title: 'Skyline Penthouse in Manhattan',
    description:
      'Two-floor penthouse above Tribeca with a private rooftop, soaking tub, and uninterrupted views from the Hudson to the Empire State Building.',
    category: 'penthouse' as const,
    pricePerNight: '2400',
    city: 'New York',
    state: 'New York',
    country: 'United States',
    lat: '40.7191',
    lng: '-74.0089',
    amenities: ['wifi', 'gym', 'air-conditioning', 'elevator', 'balcony', 'tv', 'kitchen'],
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 3,
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
      'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80',
      'https://images.unsplash.com/photo-1551038247-3d9af20df552?w=1200&q=80',
    ],
  },
  // 13. Bali villa
  {
    title: 'Jungle Villa with Infinity Pool in Ubud',
    description:
      'Open-air villa surrounded by rice terraces. Private infinity pool, daily breakfast, and a yoga deck overlooking the river.',
    category: 'villa' as const,
    pricePerNight: '380',
    city: 'Ubud',
    state: 'Bali',
    country: 'Indonesia',
    lat: '-8.5069',
    lng: '115.2625',
    amenities: ['wifi', 'pool', 'kitchen', 'air-conditioning', 'garden', 'breakfast'],
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1582610116397-edb318620f90?w=1200&q=80',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&q=80',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
    ],
  },
  // 14. Norwegian cabin
  {
    title: 'Fjord Cabin in Geiranger',
    description:
      'Hand-built timber cabin perched above the Geirangerfjord. Wood-fired sauna, panoramic glass walls, and northern lights in winter.',
    category: 'cabin' as const,
    pricePerNight: '610',
    city: 'Geiranger',
    state: 'Møre og Romsdal',
    country: 'Norway',
    lat: '62.1009',
    lng: '7.2058',
    amenities: ['wifi', 'kitchen', 'fireplace', 'sauna', 'heating', 'parking'],
    maxGuests: 5,
    bedrooms: 2,
    bathrooms: 1,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1601233749202-95d04d5b3c00?w=1200&q=80',
      'https://images.unsplash.com/photo-1595274459742-4a41d35784ee?w=1200&q=80',
      'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1200&q=80',
      'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=1200&q=80',
      'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&q=80',
    ],
  },
  // 15. Iceland treehouse
  {
    title: 'Glass Treehouse under the Aurora',
    description:
      'A modern treehouse with a transparent roof for stargazing. Steps from a black-sand beach and a geothermal hot spring.',
    category: 'treehouse' as const,
    pricePerNight: '540',
    city: 'Vik',
    state: 'Suðurland',
    country: 'Iceland',
    lat: '63.4194',
    lng: '-19.0064',
    amenities: ['wifi', 'kitchen', 'hot-tub', 'heating', 'fireplace'],
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1531971589569-0d9370cbe1e5?w=1200&q=80',
      'https://images.unsplash.com/photo-1528127269322-539801943592?w=1200&q=80',
      'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=1200&q=80',
      'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?w=1200&q=80',
      'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=1200&q=80',
    ],
  },
  // 16. Irish castle
  {
    title: 'Stone Castle Estate in County Clare',
    description:
      'A 14th-century tower house with formal gardens, library, and a great hall used by visiting writers and dignitaries.',
    category: 'castle' as const,
    pricePerNight: '1450',
    city: 'Ennis',
    state: 'County Clare',
    country: 'Ireland',
    lat: '52.8436',
    lng: '-8.9864',
    amenities: ['wifi', 'kitchen', 'parking', 'fireplace', 'garden', 'heating'],
    maxGuests: 12,
    bedrooms: 6,
    bathrooms: 5,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1486016006115-74a41448aea2?w=1200&q=80',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=80',
      'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=1200&q=80',
      'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=1200&q=80',
      'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=1200&q=80',
    ],
  },
  // 17. Croatian boat
  {
    title: 'Catamaran Stay in Hvar',
    description:
      'Sleep aboard a 60ft catamaran moored in Hvar harbor. Wake up to swims in the Adriatic and dinner served on deck.',
    category: 'boat' as const,
    pricePerNight: '480',
    city: 'Hvar',
    state: 'Split-Dalmatia',
    country: 'Croatia',
    lat: '43.1729',
    lng: '16.4413',
    amenities: ['wifi', 'kitchen', 'air-conditioning', 'breakfast'],
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1542902093-d55926049754?w=1200&q=80',
      'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=1200&q=80',
      'https://images.unsplash.com/photo-1508246325515-99cb3a0b9a1f?w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80',
    ],
  },
  // 18. Provence farmhouse
  {
    title: 'Lavender Farmhouse in Provence',
    description:
      'A restored mas surrounded by lavender fields and stone-walled gardens. Outdoor dining under plane trees, with an old bread oven still in use.',
    category: 'farmhouse' as const,
    pricePerNight: '590',
    city: 'Gordes',
    state: 'Vaucluse',
    country: 'France',
    lat: '43.9117',
    lng: '5.2003',
    amenities: ['wifi', 'pool', 'kitchen', 'parking', 'garden', 'heating'],
    maxGuests: 10,
    bedrooms: 5,
    bathrooms: 3,
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1466442929976-97f336a657be?w=1200&q=80',
      'https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1200&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80',
      'https://images.unsplash.com/photo-1564540583246-934409427776?w=1200&q=80',
    ],
  },
  // 19. Lisbon apartment
  {
    title: 'Tile-Front Apartment in Alfama',
    description:
      'A bright duplex on a steep cobblestone lane in old Lisbon. Private terrace overlooking the river and a kitchen stocked for pastel de nata mornings.',
    category: 'apartment' as const,
    pricePerNight: '180',
    city: 'Lisbon',
    state: 'Lisbon',
    country: 'Portugal',
    lat: '38.7117',
    lng: '-9.1295',
    amenities: ['wifi', 'kitchen', 'air-conditioning', 'tv', 'washer'],
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1513735492246-483525079686?w=1200&q=80',
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1200&q=80',
      'https://images.unsplash.com/photo-1529421308418-eab98863cee4?w=1200&q=80',
      'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1200&q=80',
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80',
    ],
  },
  // 20. Mexico villa
  {
    title: 'Cliffside Villa in Tulum',
    description:
      'Five-suite villa carved into the cliffs above the Riviera Maya. Private cenote, beach club access, and an open-air rooftop hammock lounge.',
    category: 'villa' as const,
    pricePerNight: '920',
    city: 'Tulum',
    state: 'Quintana Roo',
    country: 'Mexico',
    lat: '20.2114',
    lng: '-87.4654',
    amenities: ['wifi', 'pool', 'kitchen', 'air-conditioning', 'beach-access', 'parking'],
    maxGuests: 10,
    bedrooms: 5,
    bathrooms: 5,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80',
      'https://images.unsplash.com/photo-1505881402582-c5bc11054f91?w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
      'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1200&q=80',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80',
    ],
  },
  // 21. London apartment
  {
    title: 'Mews House in Notting Hill',
    description:
      'A converted carriage house tucked off Portobello Road. Skylit kitchen, private patio, and walking distance to Hyde Park.',
    category: 'apartment' as const,
    pricePerNight: '520',
    city: 'London',
    state: 'England',
    country: 'United Kingdom',
    lat: '51.5151',
    lng: '-0.2058',
    amenities: ['wifi', 'kitchen', 'heating', 'tv', 'washer'],
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80',
      'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
    ],
  },
  // 22. Vermont cabin
  {
    title: 'Maple Cabin in the Green Mountains',
    description:
      'A snug cabin among sugar maples with a wraparound porch. Wood stove, board games, and a creek you can hear from the bedroom.',
    category: 'cabin' as const,
    pricePerNight: '290',
    city: 'Stowe',
    state: 'Vermont',
    country: 'United States',
    lat: '44.4654',
    lng: '-72.6874',
    amenities: ['wifi', 'kitchen', 'fireplace', 'heating', 'parking', 'garden'],
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1487730116645-74489c95b41b?w=1200&q=80',
      'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&q=80',
      'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1200&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80',
      'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=1200&q=80',
    ],
  },
  // 23. Costa Rica treehouse
  {
    title: 'Canopy Treehouse near Manuel Antonio',
    description:
      'Toucans for neighbors and a private outdoor shower under the rainforest canopy. Steps from a Pacific surf beach.',
    category: 'treehouse' as const,
    pricePerNight: '320',
    city: 'Quepos',
    state: 'Puntarenas',
    country: 'Costa Rica',
    lat: '9.4321',
    lng: '-84.1623',
    amenities: ['wifi', 'kitchen', 'breakfast', 'garden'],
    maxGuests: 3,
    bedrooms: 1,
    bathrooms: 1,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200&q=80',
      'https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=1200&q=80',
      'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=1200&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80',
    ],
  },
  // 24. Romanian castle
  {
    title: 'Transylvanian Castle Suite',
    description:
      'A wing of a 17th-century Saxon castle, with vaulted ceilings, hand-painted frescoes, and a private library of antique books.',
    category: 'castle' as const,
    pricePerNight: '780',
    city: 'Sibiu',
    state: 'Transylvania',
    country: 'Romania',
    lat: '45.7983',
    lng: '24.1256',
    amenities: ['wifi', 'kitchen', 'fireplace', 'heating', 'parking', 'breakfast'],
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 3,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=1200&q=80',
      'https://images.unsplash.com/photo-1515445393825-bef9f1afaf2d?w=1200&q=80',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=80',
      'https://images.unsplash.com/photo-1572889464105-49b1d3a0d5f4?w=1200&q=80',
      'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=1200&q=80',
    ],
  },
  // 25. Dubai penthouse
  {
    title: 'Marina Penthouse in Dubai',
    description:
      'A 60th-floor penthouse over Dubai Marina. Two terraces, private cinema, and a wraparound infinity pool that spills toward the Gulf.',
    category: 'penthouse' as const,
    pricePerNight: '1950',
    city: 'Dubai',
    state: 'Dubai',
    country: 'United Arab Emirates',
    lat: '25.0805',
    lng: '55.1403',
    amenities: ['wifi', 'pool', 'gym', 'air-conditioning', 'elevator', 'parking', 'balcony'],
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 4,
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
      'https://images.unsplash.com/photo-1551038247-3d9af20df552?w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
    ],
  },
  // 26. Maldives boat
  {
    title: 'Overwater Yacht in the Maldives',
    description:
      'A private liveaboard yacht with three suites, a top deck jacuzzi, and a chef who plans the day around the best snorkeling spots.',
    category: 'boat' as const,
    pricePerNight: '1480',
    city: 'Malé',
    state: 'Kaafu Atoll',
    country: 'Maldives',
    lat: '4.1755',
    lng: '73.5093',
    amenities: ['wifi', 'kitchen', 'air-conditioning', 'breakfast', 'hot-tub'],
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 3,
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80',
      'https://images.unsplash.com/photo-1505881502353-a1986add3762?w=1200&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80',
      'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1200&q=80',
      'https://images.unsplash.com/photo-1542902093-d55926049754?w=1200&q=80',
    ],
  },
  // 27. Argentinian farmhouse
  {
    title: 'Estancia Stay in Mendoza',
    description:
      'Working wine estancia in the foothills of the Andes. Horseback rides through the vineyards and asado dinners under the stars.',
    category: 'farmhouse' as const,
    pricePerNight: '430',
    city: 'Mendoza',
    state: 'Mendoza',
    country: 'Argentina',
    lat: '-32.8895',
    lng: '-68.8458',
    amenities: ['wifi', 'pool', 'kitchen', 'parking', 'garden', 'wine-cellar', 'breakfast'],
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 3,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1505692433770-36f19f51681d?w=1200&q=80',
      'https://images.unsplash.com/photo-1505016731635-6e2ebbf95e89?w=1200&q=80',
      'https://images.unsplash.com/photo-1466442929976-97f336a657be?w=1200&q=80',
      'https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1200&q=80',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80',
    ],
  },
  // 28. Cape Town villa
  {
    title: 'Atlantic-Edge Villa in Camps Bay',
    description:
      'A glass-fronted villa stepped into the cliff above Camps Bay beach. Heated pool, private chef on request, and Table Mountain at your back.',
    category: 'villa' as const,
    pricePerNight: '1100',
    city: 'Cape Town',
    state: 'Western Cape',
    country: 'South Africa',
    lat: '-33.9509',
    lng: '18.3776',
    amenities: ['wifi', 'pool', 'kitchen', 'air-conditioning', 'parking', 'beach-access', 'gym'],
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 4,
    featured: true,
    photos: [
      'https://images.unsplash.com/photo-1613553474179-e1eda3ea5734?w=1200&q=80',
      'https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=1200&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80',
      'https://images.unsplash.com/photo-1505881402582-c5bc11054f91?w=1200&q=80',
    ],
  },
  // 29. Whistler cabin
  {
    title: 'Ski-In Chalet in Whistler',
    description:
      'A timber chalet a few skis away from the Whistler gondola. Hot tub on the deck, ski room, and a great room built for crowds.',
    category: 'cabin' as const,
    pricePerNight: '720',
    city: 'Whistler',
    state: 'British Columbia',
    country: 'Canada',
    lat: '50.1163',
    lng: '-122.9574',
    amenities: ['wifi', 'hot-tub', 'kitchen', 'fireplace', 'heating', 'ski-in-out', 'parking'],
    maxGuests: 10,
    bedrooms: 5,
    bathrooms: 4,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&q=80',
      'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=1200&q=80',
      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=1200&q=80',
      'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1200&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80',
    ],
  },
  // 30. Berlin apartment
  {
    title: 'Loft Apartment in Berlin Mitte',
    description:
      'An industrial loft with concrete floors, double-height ceilings, and a record collection. Steps from galleries and the best coffee bars.',
    category: 'apartment' as const,
    pricePerNight: '210',
    city: 'Berlin',
    state: 'Berlin',
    country: 'Germany',
    lat: '52.5246',
    lng: '13.4105',
    amenities: ['wifi', 'kitchen', 'heating', 'tv', 'washer', 'elevator'],
    maxGuests: 3,
    bedrooms: 1,
    bathrooms: 1,
    featured: false,
    photos: [
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80',
      'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80',
      'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80',
    ],
  },
];

// ---------------------------------------------------------------------------
// Review templates
// ---------------------------------------------------------------------------
const REVIEW_TEMPLATES = {
  excellent: [
    {
      rating: 5,
      comment:
        'Absolutely stunning property! Every detail was perfect. The host was incredibly responsive and thoughtful. Already planning our return trip.',
    },
    {
      rating: 5,
      comment:
        'Best vacation rental we have ever stayed in. The photos do not do it justice. Immaculate, beautifully decorated, and the views are breathtaking.',
    },
    {
      rating: 5,
      comment:
        'A dream come true. We celebrated our anniversary here and it exceeded every expectation. The amenities are top-notch.',
    },
    {
      rating: 4,
      comment:
        'Wonderful stay overall. Beautiful property with great amenities. Only minor note — check-in instructions could be clearer. Would definitely return.',
    },
    {
      rating: 5,
      comment:
        'This place is magical. Woke up to the most incredible views every morning. The kitchen was fully stocked and the beds were incredibly comfortable.',
    },
  ],
  good: [
    {
      rating: 4,
      comment:
        'Great location and very comfortable. A few small maintenance items but nothing that affected our enjoyment. Would recommend.',
    },
    {
      rating: 4,
      comment:
        'Really enjoyed our stay. Clean, well-maintained, and exactly as described. The neighborhood is fantastic for exploring.',
    },
    {
      rating: 5,
      comment:
        'Exceeded expectations! The space is even better in person. Host provided excellent local recommendations.',
    },
    {
      rating: 3,
      comment:
        'Good value for the price. Location is convenient but the space could use some updating. Comfortable enough for a short stay.',
    },
  ],
  low: [
    {
      rating: 2,
      comment:
        'Disappointing experience. The photos were misleading — the space felt much smaller in person. Noisy neighbors at night.',
    },
    {
      rating: 3,
      comment:
        'Average stay. The basics were covered but nothing special. Some cleanliness issues when we arrived but host addressed them quickly.',
    },
    {
      rating: 2,
      comment:
        'Below expectations for the price point. WiFi was unreliable and the air conditioning struggled. Location was good though.',
    },
    {
      rating: 4,
      comment:
        'Decent stay overall. A bit overpriced but the location makes up for it. Would be great with a few improvements.',
    },
    {
      rating: 3,
      comment:
        'Mixed feelings. Great location but the property needs maintenance. The hot water was inconsistent and some appliances were dated.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function seed() {
  console.log('Seeding database...\n');
  const db = getDb();

  // ── Clean existing data (reverse dependency order) ──────────────────
  console.log('Clearing existing data...');
  await db.delete(analyticsEvents);
  await db.delete(savedSearches);
  await db.delete(favorites);
  await db.delete(reviews);
  await db.delete(messages);
  await db.delete(conversations);
  await db.delete(payments);
  await db.delete(bookings);
  await db.delete(listingImages);
  await db.delete(listings);
  await db.delete(sessions);
  await db.delete(partners);
  await db.delete(users);

  // ── Users ───────────────────────────────────────────────────────────
  console.log('Creating users...');

  const [admin] = await db
    .insert(users)
    .values({
      email: 'admin@lumina.dev',
      name: 'Admin User',
      passwordHash: HASH_ADMIN,
      role: 'admin',
    })
    .returning();

  const [host] = await db
    .insert(users)
    .values({
      email: 'host@lumina.dev',
      name: 'Sarah Chen',
      passwordHash: HASH_ADMIN,
      role: 'host',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    })
    .returning();

  const [guest1] = await db
    .insert(users)
    .values({
      email: 'guest@lumina.dev',
      name: 'Alex Rivera',
      passwordHash: HASH_PASSWORD,
      role: 'user',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    })
    .returning();

  const [guest2] = await db
    .insert(users)
    .values({
      email: 'traveler@lumina.dev',
      name: 'Jamie Park',
      passwordHash: HASH_PASSWORD,
      role: 'user',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
    })
    .returning();

  console.log(`  admin=${admin!.id} host=${host!.id} guest1=${guest1!.id} guest2=${guest2!.id}`);

  // ── Partner ─────────────────────────────────────────────────────────
  console.log('Creating partner...');

  const [partner] = await db
    .insert(partners)
    .values({
      name: 'Luxury Escapes',
      slug: 'luxury-escapes',
      website: 'https://example.com',
      logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&q=80',
    })
    .returning();

  // ── Listings ────────────────────────────────────────────────────────
  console.log('Creating listings...');

  const createdListings: Array<{
    id: string;
    slug: string;
    title: string;
    category: string;
    pricePerNight: string;
  }> = [];

  for (const data of SAMPLE_LISTINGS) {
    const slug = slugify(data.title);

    const [listing] = await db
      .insert(listings)
      .values({
        ...data,
        slug,
        address: `${data.city}, ${data.state}`,
        currency: 'USD',
        status: 'published',
        hostId: host!.id,
        partnerId: data.featured ? partner!.id : null,
        rating: '0',
        reviewCount: 0,
      })
      .returning();

    createdListings.push({
      id: listing!.id,
      slug: listing!.slug,
      title: data.title,
      category: data.category,
      pricePerNight: data.pricePerNight,
    });

    // Add images — each listing has its own curated set
    const photos = data.photos;
    for (let i = 0; i < photos.length; i++) {
      await db.insert(listingImages).values({
        listingId: listing!.id,
        url: photos[i]!,
        alt: `${data.title} — photo ${i + 1}`,
        width: 800,
        height: 600,
        isPrimary: i === 0,
        sortOrder: i,
      });
    }

    console.log(`  ${data.category.padEnd(10)} ${data.title}`);
  }

  // Map listings by index for convenience
  const malibuVilla = createdListings[0]!; // highly rated + featured
  const aspenCabin = createdListings[1]!; // booked
  const bigSurTreehouse = createdListings[2]!; // no similar listings
  const scottishCastle = createdListings[3]!; // NO REVIEWS
  const miamiPenthouse = createdListings[4]!; // fully booked
  const marinaSailboat = createdListings[5]!; // low rated
  const tuscanFarmhouse = createdListings[6]!; // partner, good reviews
  const tokyoApartment = createdListings[7]!; // budget, many bookings
  const santoriniVilla = createdListings[8]!; // similar to malibu villa
  const tahoeCabin = createdListings[9]!; // similar to aspen cabin

  // ── Reviews ─────────────────────────────────────────────────────────
  console.log('Creating reviews...');

  const reviewers = [guest1!, guest2!, admin!];

  async function addReviews(
    listingId: string,
    templates: Array<{ rating: number; comment: string }>,
  ) {
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i]!;
      const reviewer = reviewers[i % reviewers.length]!;
      await db.insert(reviews).values({
        listingId,
        userId: reviewer.id,
        rating: t.rating,
        comment: t.comment,
      });
    }
  }

  // Malibu villa — excellent reviews (highly rated)
  await addReviews(malibuVilla.id, REVIEW_TEMPLATES.excellent);

  // Aspen cabin — good reviews
  await addReviews(aspenCabin.id, REVIEW_TEMPLATES.good);

  // Big Sur treehouse — 2 excellent reviews
  await addReviews(bigSurTreehouse.id, REVIEW_TEMPLATES.excellent.slice(0, 2));

  // Scottish castle — NO reviews (intentionally skipped)

  // Miami penthouse — excellent reviews
  await addReviews(miamiPenthouse.id, REVIEW_TEMPLATES.excellent.slice(0, 3));

  // Marina sailboat — LOW rated reviews
  await addReviews(marinaSailboat.id, REVIEW_TEMPLATES.low);

  // Tuscan farmhouse — good reviews
  await addReviews(tuscanFarmhouse.id, [
    ...REVIEW_TEMPLATES.excellent.slice(0, 2),
    ...REVIEW_TEMPLATES.good.slice(0, 2),
  ]);

  // Tokyo apartment — mixed reviews
  await addReviews(tokyoApartment.id, [
    ...REVIEW_TEMPLATES.good.slice(0, 2),
    ...REVIEW_TEMPLATES.excellent.slice(0, 1),
  ]);

  // Santorini villa — good reviews
  await addReviews(santoriniVilla.id, REVIEW_TEMPLATES.good.slice(0, 3));

  // Tahoe cabin — excellent reviews
  await addReviews(tahoeCabin.id, REVIEW_TEMPLATES.excellent.slice(0, 2));

  // Update denormalized rating/reviewCount on listings
  console.log('Updating listing ratings...');
  await db.execute(sql`
    UPDATE listings SET
      rating = COALESCE(sub.avg_rating, 0),
      review_count = COALESCE(sub.cnt, 0)
    FROM (
      SELECT listing_id, ROUND(AVG(rating)::numeric, 2) AS avg_rating, COUNT(*)::int AS cnt
      FROM reviews
      GROUP BY listing_id
    ) sub
    WHERE listings.id = sub.listing_id
  `);

  // ── Bookings ────────────────────────────────────────────────────────
  console.log('Creating bookings...');

  // Scenario: Aspen cabin — confirmed booking (near-future dates blocked)
  await db.insert(bookings).values({
    listingId: aspenCabin.id,
    userId: guest1!.id,
    startDate: futureDate(3),
    endDate: futureDate(10),
    totalPrice: (7 * 850).toString(),
    status: 'confirmed',
  });
  console.log('  confirmed  Aspen cabin (next week)');

  // Scenario: Miami penthouse — FULLY BOOKED next 30 days (overlapping booking test)
  await db.insert(bookings).values({
    listingId: miamiPenthouse.id,
    userId: guest1!.id,
    startDate: futureDate(1),
    endDate: futureDate(15),
    totalPrice: (14 * 1800).toString(),
    status: 'confirmed',
  });
  await db.insert(bookings).values({
    listingId: miamiPenthouse.id,
    userId: guest2!.id,
    startDate: futureDate(15),
    endDate: futureDate(30),
    totalPrice: (15 * 1800).toString(),
    status: 'confirmed',
  });
  console.log('  confirmed  Miami penthouse (days 1-15)');
  console.log('  confirmed  Miami penthouse (days 15-30)');

  // Scenario: Tokyo apartment — pending booking (can be confirmed or cancelled)
  await db.insert(bookings).values({
    listingId: tokyoApartment.id,
    userId: guest1!.id,
    startDate: futureDate(14),
    endDate: futureDate(21),
    totalPrice: (7 * 220).toString(),
    status: 'pending',
  });
  console.log('  pending    Tokyo apartment (2 weeks out)');

  // Scenario: Past completed booking (for review eligibility)
  await db.insert(bookings).values({
    listingId: malibuVilla.id,
    userId: guest1!.id,
    startDate: pastDate(30),
    endDate: pastDate(23),
    totalPrice: (7 * 1250).toString(),
    status: 'confirmed',
  });
  console.log('  confirmed  Malibu villa (past, completed)');

  // Scenario: Cancelled booking
  await db.insert(bookings).values({
    listingId: tuscanFarmhouse.id,
    userId: guest2!.id,
    startDate: futureDate(20),
    endDate: futureDate(27),
    totalPrice: (7 * 680).toString(),
    status: 'cancelled',
  });
  console.log('  cancelled  Tuscan farmhouse');

  // Scenario: Another cancelled + a pending for Tokyo (shows booking history mix)
  await db.insert(bookings).values({
    listingId: tokyoApartment.id,
    userId: guest2!.id,
    startDate: pastDate(60),
    endDate: pastDate(53),
    totalPrice: (7 * 220).toString(),
    status: 'cancelled',
  });
  console.log('  cancelled  Tokyo apartment (past)');

  // Scenario: Santorini villa — pending booking
  await db.insert(bookings).values({
    listingId: santoriniVilla.id,
    userId: guest2!.id,
    startDate: futureDate(45),
    endDate: futureDate(52),
    totalPrice: (7 * 980).toString(),
    status: 'pending',
  });
  console.log('  pending    Santorini villa (6 weeks out)');

  // ── Favorites ───────────────────────────────────────────────────────
  console.log('Creating favorites...');

  await db.insert(favorites).values([
    { userId: guest1!.id, listingId: malibuVilla.id },
    { userId: guest1!.id, listingId: bigSurTreehouse.id },
    { userId: guest1!.id, listingId: tuscanFarmhouse.id },
    { userId: guest2!.id, listingId: miamiPenthouse.id },
    { userId: guest2!.id, listingId: santoriniVilla.id },
  ]);

  // ── Saved Searches ──────────────────────────────────────────────────
  console.log('Creating saved searches...');

  await db.insert(savedSearches).values([
    {
      userId: guest1!.id,
      name: 'Beach villas under $1500',
      params: { category: 'villa', maxPrice: 1500, amenities: ['beach-access'] },
      notifyOnNew: true,
    },
    {
      userId: guest2!.id,
      name: 'Cabins in Colorado',
      params: { category: 'cabin', state: 'Colorado' },
      notifyOnNew: false,
    },
  ]);

  // ── Summary ─────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log('Seed complete!');
  console.log('========================================\n');
  console.log('Demo accounts:');
  console.log('  admin@lumina.dev   / admin123  (admin)');
  console.log('  host@lumina.dev    / admin123  (host)');
  console.log('  guest@lumina.dev   / admin123  (guest)');
  console.log('  traveler@lumina.dev/ admin123  (guest)');
  console.log('');
  console.log('Scenario listings:');
  console.log(`  Highly rated + featured:  ${malibuVilla.slug}`);
  console.log(`  Booked (near-future):     ${aspenCabin.slug}`);
  console.log(`  No similar listings:      ${bigSurTreehouse.slug}`);
  console.log(`  No reviews:               ${scottishCastle.slug}`);
  console.log(`  Fully booked (overlap):   ${miamiPenthouse.slug}`);
  console.log(`  Low rated:                ${marinaSailboat.slug}`);
  console.log(`  Partner listing:          ${tuscanFarmhouse.slug}`);
  console.log(`  Budget + mixed bookings:  ${tokyoApartment.slug}`);
  console.log('');
  console.log('Bookings:');
  console.log('  2 confirmed (Aspen, Miami x2), 2 pending (Tokyo, Santorini)');
  console.log('  2 cancelled (Tuscan, Tokyo), 1 past completed (Malibu)');
  console.log('');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
