# Geo IP Utility

A comprehensive IP geolocation utility for Next.js applications that provides location data based on IP addresses. Supports both client-side and server-side usage with caching and fallback services.

## Features

- 🌍 **IP Geolocation**: Get detailed location information from IP addresses
- 🔄 **Fallback Services**: Multiple free geolocation services with automatic fallback
- 💾 **Caching**: Built-in caching to reduce API calls and improve performance
- 🎯 **Multiple Usage Patterns**: Client-side hooks, server actions, and REST API
- 🛡️ **Error Handling**: Comprehensive error handling with detailed error messages
- 📍 **Location Checks**: Check if users are in specific countries or continents
- 🗺️ **Distance Calculations**: Calculate distances between coordinates
- ⏰ **Timezone Support**: Get timezone information for IP addresses

## Installation

The utility is already included in the project. No additional dependencies are required.

## Quick Start

### Client-Side Usage

```tsx
import { useGeoIP } from '@/hooks/use-geo-ip';

function MyComponent() {
  const { data, isLoading, error, isUserInCountry } = useGeoIP();

  if (isLoading) return <div>Loading location...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <p>You are in: {data?.city}, {data?.country}</p>
      {isUserInCountry('US') && <p>Welcome US user!</p>}
    </div>
  );
}
```

### Server-Side Usage

```tsx
import { getGeoLocationFromRequest } from '@/utils/geo-ip';

export async function GET(request: Request) {
  const geoData = await getGeoLocationFromRequest(request.headers);
  
  if ('error' in geoData) {
    return Response.json({ error: geoData.message }, { status: 400 });
  }
  
  return Response.json({ location: geoData });
}
```

### Server Actions

```tsx
import { getGeoLocationAction } from '@/actions/geo/get-geo-location';

// In a server component or API route
const result = await getGeoLocationAction({ ip: '8.8.8.8' });

if (result.data) {
  console.log('Location:', result.data);
} else {
  console.error('Error:', result.serverError);
}
```

## API Reference

### Core Functions

#### `getGeoLocation(ip?: string): Promise<GeoIPResult>`

Get geo location for an IP address. If no IP is provided, it will attempt to detect the client's IP.

```tsx
import { getGeoLocation } from '@/utils/geo-ip';

const result = await getGeoLocation('8.8.8.8');
```

#### `getGeoLocationFromRequest(headers): Promise<GeoIPResult>`

Get geo location from request headers (server-side usage).

```tsx
import { getGeoLocationFromRequest } from '@/utils/geo-ip';

const result = await getGeoLocationFromRequest(request.headers);
```

#### `getClientIP(headers): string | null`

Extract client IP from request headers.

```tsx
import { getClientIP } from '@/utils/geo-ip';

const ip = getClientIP(request.headers);
```

### Utility Functions

#### `isGeoError(result): result is GeoIPError`

Type guard to check if a result is an error.

```tsx
import { isGeoError } from '@/utils/geo-ip';

if (isGeoError(result)) {
  console.error(result.message);
} else {
  console.log(result.city);
}
```

#### `getCountryCode(result): string | null`

Extract country code from geo location result.

```tsx
import { getCountryCode } from '@/utils/geo-ip';

const countryCode = getCountryCode(result);
```

#### `getTimezone(result): string | null`

Extract timezone from geo location result.

```tsx
import { getTimezone } from '@/utils/geo-ip';

const timezone = getTimezone(result);
```

#### `getCoordinates(result): { lat: number; lng: number } | null`

Extract coordinates from geo location result.

```tsx
import { getCoordinates } from '@/utils/geo-ip';

const coords = getCoordinates(result);
```

#### `getFormattedLocation(result): string`

Get a formatted location string.

```tsx
import { getFormattedLocation } from '@/utils/geo-ip';

const location = getFormattedLocation(result); // "New York, NY, United States"
```

#### `isUserInCountry(result, countryCode): boolean`

Check if user is in a specific country.

```tsx
import { isUserInCountry } from '@/utils/geo-ip';

const isInUS = isUserInCountry(result, 'US');
```

#### `isUserInContinent(result, continentCode): boolean`

Check if user is in a specific continent.

```tsx
import { isUserInContinent } from '@/utils/geo-ip';

const isInNorthAmerica = isUserInContinent(result, 'NA');
```

#### `getDistance(lat1, lng1, lat2, lng2): number`

Calculate distance between two coordinates in kilometers.

```tsx
import { getDistance } from '@/utils/geo-ip';

const distance = getDistance(40.7128, -74.0060, 34.0522, -118.2437); // NYC to LA
```

#### `isWithinDistance(result1, result2, maxDistanceKm): boolean`

Check if two locations are within a certain distance.

```tsx
import { isWithinDistance } from '@/utils/geo-ip';

const isNearby = isWithinDistance(location1, location2, 100); // Within 100km
```

### Cache Management

#### `clearGeoCache(): void`

Clear the geo location cache.

```tsx
import { clearGeoCache } from '@/utils/geo-ip';

clearGeoCache();
```

#### `getGeoCacheStats(): { size: number; entries: Array<{ ip: string; age: number }> }`

Get cache statistics.

```tsx
import { getGeoCacheStats } from '@/utils/geo-ip';

const stats = getGeoCacheStats();
console.log(`Cache has ${stats.size} entries`);
```

## React Hooks

### `useGeoIP(options?: UseGeoIPOptions)`

Main hook for geo IP functionality.

```tsx
import { useGeoIP } from '@/hooks/use-geo-ip';

const {
  data,
  error,
  isLoading,
  isSuccess,
  isError,
  refetch,
  getCountryCode,
  getTimezone,
  getCoordinates,
  getFormattedLocation,
  isUserInCountry,
  isUserInContinent
} = useGeoIP({
  autoFetch: true, // Auto-fetch on mount
  ip: '8.8.8.8',   // Optional custom IP
});
```

### `useGeoIPWithIP(ip?: string)`

Hook for getting geo location with automatic refetch on IP change.

```tsx
import { useGeoIPWithIP } from '@/hooks/use-geo-ip';

const { data, isLoading } = useGeoIPWithIP('8.8.8.8');
```

### `useGeoIPManual()`

Hook for manual geo location fetching.

```tsx
import { useGeoIPManual } from '@/hooks/use-geo-ip';

const { data, refetch } = useGeoIPManual();

// Call refetch() when you want to fetch location
```

## Server Actions

### `getGeoLocationAction({ ip?: string })`

Get geo location for an IP address.

```tsx
import { getGeoLocationAction } from '@/actions/geo/get-geo-location';

const result = await getGeoLocationAction({ ip: '8.8.8.8' });
```

### `isUserInCountryAction({ ip?: string, countryCode: string })`

Check if user is in a specific country.

```tsx
import { isUserInCountryAction } from '@/actions/geo/get-geo-location';

const result = await isUserInCountryAction({ 
  ip: '8.8.8.8', 
  countryCode: 'US' 
});
```

### `getTimezoneAction({ ip?: string })`

Get timezone for an IP address.

```tsx
import { getTimezoneAction } from '@/actions/geo/get-geo-location';

const result = await getTimezoneAction({ ip: '8.8.8.8' });
```

### `getCoordinatesAction({ ip?: string })`

Get coordinates for an IP address.

```tsx
import { getCoordinatesAction } from '@/actions/geo/get-geo-location';

const result = await getCoordinatesAction({ ip: '8.8.8.8' });
```

## REST API

### GET `/api/geo`

Get geo location for the requesting IP or a specified IP.

```bash
# Get current location
GET /api/geo

# Get location for specific IP
GET /api/geo?ip=8.8.8.8

# Get timezone only
GET /api/geo?action=timezone

# Check if in specific country
GET /api/geo?action=check-country&countryCode=US

# Get coordinates only
GET /api/geo?action=coordinates

# Get formatted location string
GET /api/geo?action=formatted-location

# Get cache statistics
GET /api/geo?action=cache-stats

# Clear cache
GET /api/geo?action=clear-cache
```

### POST `/api/geo`

Get geo location from request headers (server-side usage).

```bash
POST /api/geo
```

## Data Types

### `GeoLocation`

```tsx
interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionCode: string;
  city: string;
  timezone: string;
  latitude: number;
  longitude: number;
  isp?: string;
  org?: string;
  as?: string;
  asname?: string;
  zip?: string;
  continent?: string;
  continentCode?: string;
}
```

### `GeoIPError`

```tsx
interface GeoIPError {
  error: string;
  message: string;
  code?: string;
}
```

### `GeoIPResult`

```tsx
type GeoIPResult = GeoLocation | GeoIPError;
```

## Error Codes

- `IP_DETECTION_FAILED`: Unable to detect client IP address
- `IP_REQUIRED`: IP address is required for server-side usage
- `INVALID_IP`: Invalid IP address provided
- `GEO_LOOKUP_FAILED`: Unable to retrieve geo location data
- `IP_NOT_FOUND`: Could not extract IP address from request headers
- `UNKNOWN_ERROR`: An unexpected error occurred during geo lookup

## Geolocation Services

The utility uses multiple free geolocation services with automatic fallback:

1. **ipapi.co** (Primary service)
   - Free tier: 1,000 requests/day
   - HTTPS support
   - Detailed location data

2. **ip-api.com** (Fallback service)
   - Free tier: 45 requests/minute
   - HTTP only (for free tier)
   - Good coverage

## Caching

- **Cache Duration**: 24 hours by default
- **Cache Storage**: In-memory Map
- **Cache Key**: IP address
- **Cache Management**: Automatic cleanup and manual clearing

## Performance Considerations

- **Rate Limiting**: Respects service rate limits
- **Caching**: Reduces API calls for repeated lookups
- **Timeout**: 5-second timeout for API calls
- **Fallback**: Automatic fallback if primary service fails

## Security Considerations

- **IP Validation**: Validates IP address format
- **Private IP Detection**: Identifies private/local IP addresses
- **Error Handling**: Doesn't expose sensitive information in errors
- **Rate Limiting**: Built-in rate limiting to prevent abuse

## Examples

### Basic Usage

```tsx
import { useGeoIP } from '@/hooks/use-geo-ip';

function LocationDisplay() {
  const { data, isLoading, error } = useGeoIP();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No location data</div>;

  return (
    <div>
      <h2>Your Location</h2>
      <p>City: {data.city}</p>
      <p>Country: {data.country}</p>
      <p>Timezone: {data.timezone}</p>
    </div>
  );
}
```

### Conditional Rendering

```tsx
import { useGeoIP } from '@/hooks/use-geo-ip';

function RegionalContent() {
  const { data, isUserInCountry } = useGeoIP();

  return (
    <div>
      {isUserInCountry('US') && (
        <div>Welcome US users! Special content for you.</div>
      )}
      
      {isUserInCountry('CA') && (
        <div>Welcome Canadian users! Special content for you.</div>
      )}
      
      {!isUserInCountry('US') && !isUserInCountry('CA') && (
        <div>Welcome international users!</div>
      )}
    </div>
  );
}
```

### Server-Side Usage

```tsx
import { getGeoLocationFromRequest } from '@/utils/geo-ip';

export async function GET(request: Request) {
  const geoData = await getGeoLocationFromRequest(request.headers);
  
  if ('error' in geoData) {
    return Response.json({ 
      error: geoData.message 
    }, { status: 400 });
  }
  
  // Use geo data for server-side logic
  const isUSUser = geoData.countryCode === 'US';
  
  return Response.json({
    location: geoData,
    isUSUser,
    timezone: geoData.timezone
  });
}
```

### Custom IP Lookup

```tsx
import { getGeoLocation } from '@/utils/geo-ip';

async function lookupIP(ip: string) {
  const result = await getGeoLocation(ip);
  
  if ('error' in result) {
    console.error('Lookup failed:', result.message);
    return null;
  }
  
  return result;
}

// Usage
const location = await lookupIP('8.8.8.8');
if (location) {
  console.log(`${location.ip} is in ${location.city}, ${location.country}`);
}
```

## Demo Component

A demo component is available at `src/components/geo-ip-demo.tsx` that showcases all the functionality of the geo IP utility.

## Troubleshooting

### Common Issues

1. **"IP_DETECTION_FAILED" Error**
   - Check if the client has internet connectivity
   - Verify that the IP detection service is accessible

2. **"GEO_LOOKUP_FAILED" Error**
   - The IP address might be private/local
   - All geolocation services might be temporarily unavailable
   - Check rate limits for the services

3. **Slow Response Times**
   - Check cache statistics to see if caching is working
   - Consider increasing cache duration for frequently accessed IPs

4. **Inaccurate Location Data**
   - IP geolocation is not always 100% accurate
   - VPNs and proxies can affect location detection
   - Mobile networks may show different locations

### Debugging

Enable debug logging by checking the browser console for warnings and errors from the geo IP utility.

## Contributing

When contributing to the geo IP utility:

1. Follow the existing code style and patterns
2. Add comprehensive error handling
3. Include TypeScript types for all new functions
4. Update this documentation for any new features
5. Test with both IPv4 and IPv6 addresses
6. Verify fallback behavior works correctly

## License

This utility is part of the PSTV Web project and follows the same licensing terms.
