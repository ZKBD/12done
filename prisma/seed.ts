import { PrismaClient, ListingType, PropertyStatus, UserStatus, EnergyEfficiencyRating } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test user
  const passwordHash = await bcrypt.hash('Test123!', 10);

  const testUser = await prisma.user.upsert({
    where: { email: 'demo@12done.com' },
    update: {},
    create: {
      email: 'demo@12done.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'User',
      phone: '+36201234567',
      city: 'Budapest',
      country: 'HU',
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Created user: ${testUser.email}`);

  // Sample properties data
  const propertiesData = [
    {
      title: 'Modern Downtown Apartment',
      description: 'Stunning 2-bedroom apartment in the heart of Budapest with panoramic city views. Recently renovated with high-end finishes.',
      address: 'Andrássy út 45',
      postalCode: '1061',
      city: 'Budapest',
      country: 'HU',
      latitude: 47.5025,
      longitude: 19.0553,
      listingTypes: [ListingType.FOR_SALE],
      basePrice: 185000,
      squareMeters: 85,
      bedrooms: 2,
      bathrooms: 1,
      floors: 1,
      yearBuilt: 2018,
      status: PropertyStatus.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
      ],
    },
    {
      title: 'Cozy Studio near Parliament',
      description: 'Perfect starter home or investment property. Walking distance to all major attractions and public transport.',
      address: 'Kossuth Lajos tér 12',
      postalCode: '1055',
      city: 'Budapest',
      country: 'HU',
      latitude: 47.5073,
      longitude: 19.0455,
      listingTypes: [ListingType.FOR_SALE, ListingType.LONG_TERM_RENT],
      basePrice: 95000,
      squareMeters: 42,
      bedrooms: 1,
      bathrooms: 1,
      floors: 1,
      yearBuilt: 1925,
      status: PropertyStatus.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
        'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800',
      ],
    },
    {
      title: 'Luxury Penthouse with Terrace',
      description: 'Exclusive penthouse offering 360-degree views of the Danube and Castle District. Features private rooftop terrace and premium amenities.',
      address: 'Váci utca 78',
      postalCode: '1056',
      city: 'Budapest',
      country: 'HU',
      latitude: 47.4925,
      longitude: 19.0549,
      listingTypes: [ListingType.FOR_SALE],
      basePrice: 750000,
      squareMeters: 180,
      bedrooms: 4,
      bathrooms: 3,
      floors: 2,
      yearBuilt: 2020,
      status: PropertyStatus.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
        'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
      ],
    },
    {
      title: 'Charming Villa in Buda Hills',
      description: 'Beautiful family villa with garden and pool. Quiet neighborhood with excellent schools nearby. Perfect for families.',
      address: 'Rózsadomb utca 23',
      postalCode: '1026',
      city: 'Budapest',
      country: 'HU',
      latitude: 47.5198,
      longitude: 19.0267,
      listingTypes: [ListingType.FOR_SALE],
      basePrice: 520000,
      squareMeters: 250,
      lotSize: 800,
      bedrooms: 5,
      bathrooms: 3,
      floors: 2,
      yearBuilt: 2005,
      petFriendly: true,
      status: PropertyStatus.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800',
      ],
    },
    {
      title: 'Short-term Rental near Basilica',
      description: 'Fully furnished apartment ideal for tourists or business travelers. All utilities included. Minimum 3-night stay.',
      address: 'Szent István tér 5',
      postalCode: '1051',
      city: 'Budapest',
      country: 'HU',
      latitude: 47.5008,
      longitude: 19.0539,
      listingTypes: [ListingType.SHORT_TERM_RENT],
      basePrice: 85,
      squareMeters: 55,
      bedrooms: 1,
      bathrooms: 1,
      floors: 1,
      yearBuilt: 2015,
      status: PropertyStatus.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
        'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800',
      ],
    },
    {
      title: 'Riverside Loft Apartment',
      description: 'Industrial-style loft with exposed brick and high ceilings. Direct views of the Danube River. Open floor plan.',
      address: 'Petőfi rakpart 18',
      postalCode: '1052',
      city: 'Budapest',
      country: 'HU',
      latitude: 47.4933,
      longitude: 19.0520,
      listingTypes: [ListingType.LONG_TERM_RENT],
      basePrice: 1800,
      squareMeters: 95,
      bedrooms: 2,
      bathrooms: 1,
      floors: 1,
      yearBuilt: 2019,
      status: PropertyStatus.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800',
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800',
      ],
    },
    {
      title: 'Renovated Apartment in Jewish Quarter',
      description: 'Beautifully renovated apartment in the vibrant ruin bar district. Walking distance to restaurants, cafes, and nightlife.',
      address: 'Kazinczy utca 34',
      postalCode: '1075',
      city: 'Budapest',
      country: 'HU',
      latitude: 47.4961,
      longitude: 19.0612,
      listingTypes: [ListingType.FOR_SALE, ListingType.SHORT_TERM_RENT],
      basePrice: 145000,
      squareMeters: 68,
      bedrooms: 2,
      bathrooms: 1,
      floors: 1,
      yearBuilt: 1890,
      status: PropertyStatus.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800',
        'https://images.unsplash.com/photo-1560448075-cbc16bb4af8e?w=800',
      ],
    },
    {
      title: 'Family Home with Garden',
      description: 'Spacious family home in a quiet suburb. Large garden, garage for 2 cars, and modern kitchen. Near international school.',
      address: 'Budakeszi út 88',
      postalCode: '1121',
      city: 'Budapest',
      country: 'HU',
      latitude: 47.5089,
      longitude: 18.9723,
      listingTypes: [ListingType.FOR_SALE],
      basePrice: 380000,
      squareMeters: 200,
      lotSize: 600,
      bedrooms: 4,
      bathrooms: 2,
      floors: 2,
      yearBuilt: 2010,
      petFriendly: true,
      newlyBuilt: false,
      status: PropertyStatus.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
      ],
    },
    {
      title: 'New Build Smart Apartment',
      description: 'Brand new smart home with integrated technology. Energy efficient with A+ rating. Underground parking included.',
      address: 'Váci út 156',
      postalCode: '1138',
      city: 'Budapest',
      country: 'HU',
      latitude: 47.5301,
      longitude: 19.0612,
      listingTypes: [ListingType.FOR_SALE],
      basePrice: 220000,
      squareMeters: 78,
      bedrooms: 2,
      bathrooms: 2,
      floors: 1,
      yearBuilt: 2024,
      newlyBuilt: true,
      energyEfficiency: EnergyEfficiencyRating.A_PLUS,
      status: PropertyStatus.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800',
        'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800',
      ],
    },
    {
      title: 'Historic Building Office Space',
      description: 'Converted historic building perfect for creative offices or events. High ceilings, original features preserved.',
      address: 'Ferenciek tere 2',
      postalCode: '1053',
      city: 'Budapest',
      country: 'HU',
      latitude: 47.4920,
      longitude: 19.0560,
      listingTypes: [ListingType.LONG_TERM_RENT, ListingType.EVENTS],
      basePrice: 3500,
      squareMeters: 150,
      bedrooms: 0,
      bathrooms: 2,
      floors: 1,
      yearBuilt: 1895,
      accessible: true,
      status: PropertyStatus.ACTIVE,
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
        'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800',
      ],
    },
  ];

  // Create properties with media
  for (const propertyData of propertiesData) {
    const { images, ...data } = propertyData;

    const property = await prisma.property.create({
      data: {
        ...data,
        ownerId: testUser.id,
        currency: 'EUR',
        publishedAt: new Date(),
      },
    });

    // Create media for each property
    for (let i = 0; i < images.length; i++) {
      await prisma.propertyMedia.create({
        data: {
          propertyId: property.id,
          type: 'photo',
          url: images[i],
          thumbnailUrl: images[i].replace('w=800', 'w=400'),
          sortOrder: i,
          isPrimary: i === 0,
        },
      });
    }

    console.log(`Created property: ${property.title}`);
  }

  // Create some countries for reference
  const countries = [
    { code: 'HU', name: 'Hungary', nativeName: 'Magyarország', phonePrefix: '+36', currency: 'HUF' },
    { code: 'AT', name: 'Austria', nativeName: 'Österreich', phonePrefix: '+43', currency: 'EUR' },
    { code: 'DE', name: 'Germany', nativeName: 'Deutschland', phonePrefix: '+49', currency: 'EUR' },
    { code: 'SK', name: 'Slovakia', nativeName: 'Slovensko', phonePrefix: '+421', currency: 'EUR' },
    { code: 'RO', name: 'Romania', nativeName: 'România', phonePrefix: '+40', currency: 'RON' },
  ];

  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {},
      create: country,
    });
  }

  console.log('Created countries');
  console.log('Seeding completed!');
  console.log('\nDemo credentials:');
  console.log('  Email: demo@12done.com');
  console.log('  Password: Test123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
