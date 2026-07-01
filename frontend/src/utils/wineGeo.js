// Wine geography — coordinates for the 3D Wine Passport globe.
// Famous regions get their own pin; anything else falls back to its country
// centroid (via regionFlags). [lat, lng].
import { regionFlag } from './regionFlags.js';

// Famous wine regions (key = lowercase substring to match in a location string).
export const REGIONS = {
  'bordeaux': [44.84, -0.58, 'Bordeaux', 'France'],
  'burgundy': [47.05, 4.85, 'Burgundy', 'France'],
  'bourgogne': [47.05, 4.85, 'Burgundy', 'France'],
  'champagne': [49.05, 4.0, 'Champagne', 'France'],
  'rhône': [44.9, 4.8, 'Rhône', 'France'],
  'rhone': [44.9, 4.8, 'Rhône', 'France'],
  'loire': [47.33, 1.5, 'Loire', 'France'],
  'sancerre': [47.33, 2.83, 'Sancerre', 'France'],
  'alsace': [48.3, 7.4, 'Alsace', 'France'],
  'provence': [43.5, 6.0, 'Provence', 'France'],
  'beaujolais': [46.1, 4.7, 'Beaujolais', 'France'],
  'tuscany': [43.4, 11.2, 'Tuscany', 'Italy'],
  'toscana': [43.4, 11.2, 'Tuscany', 'Italy'],
  'chianti': [43.5, 11.3, 'Chianti', 'Italy'],
  'piedmont': [44.7, 8.0, 'Piedmont', 'Italy'],
  'piemonte': [44.7, 8.0, 'Piedmont', 'Italy'],
  'barolo': [44.6, 7.94, 'Barolo', 'Italy'],
  'veneto': [45.5, 11.5, 'Veneto', 'Italy'],
  'prosecco': [45.9, 12.2, 'Prosecco', 'Italy'],
  'sicily': [37.6, 14.0, 'Sicily', 'Italy'],
  'rioja': [42.4, -2.7, 'Rioja', 'Spain'],
  'ribera del duero': [41.6, -3.7, 'Ribera del Duero', 'Spain'],
  'priorat': [41.2, 0.8, 'Priorat', 'Spain'],
  'rías baixas': [42.4, -8.7, 'Rías Baixas', 'Spain'],
  'douro': [41.2, -7.8, 'Douro', 'Portugal'],
  'porto': [41.15, -8.6, 'Porto', 'Portugal'],
  'port': [41.15, -8.6, 'Porto', 'Portugal'],
  'mosel': [49.9, 7.0, 'Mosel', 'Germany'],
  'rheingau': [50.0, 8.0, 'Rheingau', 'Germany'],
  'pfalz': [49.3, 8.2, 'Pfalz', 'Germany'],
  'napa': [38.5, -122.3, 'Napa Valley', 'United States'],
  'sonoma': [38.5, -122.8, 'Sonoma', 'United States'],
  'willamette': [45.2, -123.1, 'Willamette Valley', 'United States'],
  'finger lakes': [42.6, -76.9, 'Finger Lakes', 'United States'],
  'paso robles': [35.6, -120.7, 'Paso Robles', 'United States'],
  'mendoza': [-33.0, -68.8, 'Mendoza', 'Argentina'],
  'maipo': [-33.7, -70.7, 'Maipo Valley', 'Chile'],
  'colchagua': [-34.6, -71.4, 'Colchagua', 'Chile'],
  'casablanca': [-33.3, -71.4, 'Casablanca', 'Chile'],
  'barossa': [-34.5, 138.95, 'Barossa Valley', 'Australia'],
  'mclaren vale': [-35.2, 138.5, 'McLaren Vale', 'Australia'],
  'margaret river': [-33.95, 115.07, 'Margaret River', 'Australia'],
  'yarra': [-37.65, 145.5, 'Yarra Valley', 'Australia'],
  'tasmania': [-42.0, 147.0, 'Tasmania', 'Australia'],
  'coal river': [-42.8, 147.4, 'Coal River Valley', 'Australia'],
  'marlborough': [-41.5, 173.9, 'Marlborough', 'New Zealand'],
  'central otago': [-45.0, 169.2, 'Central Otago', 'New Zealand'],
  'hawke': [-39.6, 176.8, "Hawke's Bay", 'New Zealand'],
  'stellenbosch': [-33.9, 18.85, 'Stellenbosch', 'South Africa'],
  'swartland': [-33.4, 18.7, 'Swartland', 'South Africa'],
  'tokaj': [48.1, 21.4, 'Tokaj', 'Hungary'],
  'santorini': [36.4, 25.4, 'Santorini', 'Greece'],
  'wachau': [48.4, 15.4, 'Wachau', 'Austria'],
  'okanagan': [49.8, -119.6, 'Okanagan', 'Canada'],
  'niagara': [43.2, -79.2, 'Niagara', 'Canada'],
};

// Country centroids (fallback when no specific region matched).
export const COUNTRIES = {
  France: [46.6, 2.5], Italy: [42.8, 12.6], Spain: [40.2, -3.7], Portugal: [39.5, -8.0],
  Germany: [51.0, 10.0], 'United States': [39.5, -98.0], Argentina: [-35.0, -65.0],
  Chile: [-35.5, -71.3], Australia: [-25.0, 134.0], 'New Zealand': [-41.5, 173.0],
  'South Africa': [-30.0, 24.0], Austria: [47.6, 14.1], Hungary: [47.2, 19.5],
  Greece: [39.0, 22.0], 'United Kingdom': [53.0, -1.5], Canada: [56.0, -106.0],
  Switzerland: [46.8, 8.2], Romania: [45.9, 24.9], Georgia: [42.0, 43.5],
  Lebanon: [33.9, 35.9], China: [35.0, 104.0], Japan: [36.0, 138.0], Mexico: [23.0, -102.0],
  Brazil: [-14.0, -52.0], Uruguay: [-32.8, -56.0], Croatia: [45.1, 15.2], Slovenia: [46.1, 14.8],
};

// Resolve a wine's location string → a globe point, or null if unknown.
export function resolveLocation(location) {
  if (!location) return null;
  const lc = location.toLowerCase();
  for (const key in REGIONS) {
    if (lc.includes(key)) {
      const [lat, lng, name, country] = REGIONS[key];
      return { lat, lng, name, country, kind: 'region' };
    }
  }
  // Fall back to the country (via the flag/region helper, then centroid).
  const rf = regionFlag(location);
  const country = rf?.country;
  if (country && COUNTRIES[country]) {
    const [lat, lng] = COUNTRIES[country];
    return { lat, lng, name: country, country, kind: 'country' };
  }
  return null;
}
