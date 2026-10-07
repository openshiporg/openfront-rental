export const STAY_LISTING_SELECTION = `
  id
  title
  slug
  subtitle
  description
  status
  bookingMode
  instantBook
  isFeatured
  currencyCode
  baseNightlyRateCents
  securityDepositCents
  minimumStay
  maximumStay
  advanceNoticeHours
  bookingWindowDays
  reviewAverageHundredths
  reviewCount
  thumbnail
  hostOrganization { id name slug publicBio }
  property {
    id
    name
    propertyType
    timezone
    checkInFrom
    checkInUntil
    checkOutBy
    address {
      id
      addressLine1
      addressLine2
      city
      region
      postalCode
      countryCode
      latitude
      longitude
      publicLocationLabel
      showExactAddressPublicly
    }
  }
  accommodationUnit {
    id
    status
    name
    accommodationType
    maxGuests
    bedroomCount
    bedCount
    bathroomCountHalfUnits
    squareFeet
    bedrooms(orderBy: [{ order: asc }]) {
      id
      name
      order
      beds { id bedType quantity }
    }
  }
  media(orderBy: [{ order: asc }]) { id image { url } imagePath altText caption order }
  amenities(orderBy: [{ category: asc }, { name: asc }]) { id name slug category iconKey }
  collections { id name slug }
  houseRules(orderBy: [{ createdAt: asc }]) { id ruleType title description isAllowed isRequired }
  ratePlans(where: { status: { equals: "active" } }, orderBy: [{ isDefault: desc }, { createdAt: asc }]) {
    id
    name
    description
    currencyCode
    baseNightlyRateCents
    minimumStay
    maximumStay
    advanceNoticeHours
    bookingWindowDays
    isDefault
    cancellationPolicy { id name version policyType summary fullTerms freeCancellationHours rules }
    seasonalRates(where: { isActive: { equals: true } }, orderBy: [{ priority: desc }]) {
      id name startDate endDate nightlyRateCents adjustmentBasisPoints minimumStay priority
    }
  }
  feeDefinitions(where: { isActive: { equals: true } }, orderBy: [{ createdAt: asc }]) {
    id name feeType calculation amountCents percentageBasisPoints taxable required
  }
  taxRules(where: { isActive: { equals: true } }, orderBy: [{ createdAt: asc }]) {
    id name jurisdiction rateBasisPoints isInclusive
  }
`;

function coarseCoordinate(value: unknown) {
  return typeof value === 'number' ? Math.round(value * 1000) / 1000 : null;
}

function mediaUrl(media: any) {
  return media?.image?.url || media?.imagePath || null;
}

export function toPublicListing(listing: any) {
  const accommodation = listing.accommodationUnit ? { ...listing.accommodationUnit } : listing.accommodationUnit;
  if (accommodation && typeof accommodation === 'object') delete accommodation.status;
  const address = listing.property?.address;
  const showExact = Boolean(address?.showExactAddressPublicly);
  return {
    id: listing.id,
    title: listing.title,
    slug: listing.slug,
    subtitle: listing.subtitle,
    description: listing.description,
    bookingMode: listing.bookingMode,
    instantBook: listing.instantBook,
    isFeatured: listing.isFeatured,
    currencyCode: listing.currencyCode,
    baseNightlyRateCents: listing.baseNightlyRateCents,
    securityDepositCents: listing.securityDepositCents,
    minimumStay: listing.minimumStay,
    maximumStay: listing.maximumStay,
    reviewAverageHundredths: listing.reviewAverageHundredths,
    reviewCount: listing.reviewCount,
    thumbnail: listing.thumbnail || mediaUrl(listing.media?.[0]),
    host: listing.hostOrganization
      ? {
          id: listing.hostOrganization.id,
          name: listing.hostOrganization.name,
          slug: listing.hostOrganization.slug,
          publicBio: listing.hostOrganization.publicBio,
        }
      : null,
    property: listing.property
      ? {
          id: listing.property.id,
          name: listing.property.name,
          propertyType: listing.property.propertyType,
          timezone: listing.property.timezone,
          checkInFrom: listing.property.checkInFrom,
          checkInUntil: listing.property.checkInUntil,
          checkOutBy: listing.property.checkOutBy,
          location: address
            ? {
                publicLocationLabel: address.publicLocationLabel || [address.city, address.region].filter(Boolean).join(', '),
                city: address.city,
                region: address.region,
                countryCode: address.countryCode,
                latitude: coarseCoordinate(address.latitude),
                longitude: coarseCoordinate(address.longitude),
                addressLine1: showExact ? address.addressLine1 : null,
                addressLine2: showExact ? address.addressLine2 : null,
                postalCode: showExact ? address.postalCode : null,
              }
            : null,
        }
      : null,
    accommodation,
    media: (listing.media || []).map((item: any) => ({
      id: item.id,
      url: mediaUrl(item),
      altText: item.altText,
      caption: item.caption,
      order: item.order,
    })),
    amenities: listing.amenities || [],
    collections: listing.collections || [],
    houseRules: listing.houseRules || [],
    ratePlans: listing.ratePlans || [],
    feeDefinitions: listing.feeDefinitions || [],
    taxRules: listing.taxRules || [],
  };
}

export function listingBookingSnapshot(listing: any) {
  const publicListing = toPublicListing(listing);
  const address = listing.property?.address;
  return {
    ...publicListing,
    property: publicListing.property
      ? {
          ...publicListing.property,
          address: address
            ? {
                addressLine1: address.addressLine1,
                addressLine2: address.addressLine2,
                city: address.city,
                region: address.region,
                postalCode: address.postalCode,
                countryCode: address.countryCode,
                publicLocationLabel: address.publicLocationLabel,
              }
            : null,
        }
      : null,
  };
}
