// ---------------------------------------------------------------------------
// Data lokasi jaringan Regional -> ASO/Area, dipakai untuk fitur "Jaringan
// Regional & ASO" di Beranda (daftar + peta).
//
// Nama Regional & Area di sini HARUS persis sama dengan kunci di
// REGIONAL_AREA_DATA (src/lib/costCenter.ts, sumber: COST_CENTER.pdf) supaya
// daftar unit BSU per area bisa diambil otomatis dari sana — jadi kalau
// costCenter.ts diupdate (ada ASO/BSU baru), cukup tambahkan koordinatnya di
// AREA_LOCATIONS di bawah ini.
//
// Koordinat berupa titik kota/kabupaten pusat tiap ASO (bukan alamat kantor
// presisi), cukup untuk keperluan visualisasi sebaran jaringan di peta.
// ---------------------------------------------------------------------------

import { REGIONAL_AREA_DATA } from '@/lib/costCenter';

export type AreaLocation = {
  area: string;
  city: string;
  lat: number;
  lng: number;
};

export type RegionalNetwork = {
  regional: string;
  color: string;
  areas: AreaLocation[];
};

// Warna per regional, selaras dengan lima warna "sayap" logo BSU.
const REGIONAL_COLOR: Record<string, string> = {
  'KANTOR PUSAT': '#2E7FBF',
  'REGIONAL 1 - JAWA TIMUR': '#2FB4C4',
  'REGIONAL 2 - JAWA TENGAH & DIY': '#3AA65B',
  'REGIONAL 3 - LAMPUNG & JABAR': '#F0B429',
  'REGIONAL 4 - INDONESIA TIMUR': '#E8543E',
};

const AREA_LOCATIONS: Record<string, { city: string; lat: number; lng: number }> = {
  PUSAT: { city: 'Kepanjen, Kabupaten Malang', lat: -8.1333, lng: 112.5667 },
  KEPANJEN: { city: 'Kepanjen, Kabupaten Malang', lat: -8.1333, lng: 112.5667 },

  'ASO BOJONEGORO': { city: 'Bojonegoro', lat: -7.15, lng: 111.8818 },
  'ASO JEMBER': { city: 'Jember', lat: -8.1731, lng: 113.7002 },
  'ASO MALANG RAYA': { city: 'Malang', lat: -7.9666, lng: 112.6326 },
  'ASO MOJOKERTO': { city: 'Mojokerto', lat: -7.4664, lng: 112.4341 },
  'ASO PONOROGO': { city: 'Ponorogo', lat: -7.865, lng: 111.4636 },
  'ASO TULUNGAGUNG': { city: 'Tulungagung', lat: -8.0646, lng: 111.902 },

  'ASO MAGELANG': { city: 'Magelang', lat: -7.4707, lng: 110.2178 },
  'ASO PATI': { city: 'Pati', lat: -6.7565, lng: 111.0382 },
  'ASO PURWOKERTO': { city: 'Purwokerto, Banyumas', lat: -7.4218, lng: 109.2337 },
  'ASO SEMARANG': { city: 'Semarang', lat: -6.9932, lng: 110.4203 },
  'ASO SOLO RAYA': { city: 'Surakarta (Solo)', lat: -7.5755, lng: 110.8243 },
  'ASO YOGYAKARTA': { city: 'Yogyakarta', lat: -7.7972, lng: 110.3688 },

  'ASO BANDUNG': { city: 'Bandung', lat: -6.9175, lng: 107.6191 },
  'ASO BANTEN': { city: 'Serang, Banten', lat: -6.1149, lng: 106.1503 },
  'ASO BOGOR': { city: 'Bogor', lat: -6.5971, lng: 106.806 },
  'ASO TASIKMALAYA': { city: 'Tasikmalaya', lat: -7.3506, lng: 108.2172 },
  LAMPUNG: { city: 'Bandar Lampung', lat: -5.3971, lng: 105.2668 },

  'ASO BANJARMASIN': { city: 'Banjarmasin', lat: -3.3186, lng: 114.5944 },
  'ASO PALANGKA RAYA': { city: 'Palangka Raya', lat: -2.2096, lng: 113.9213 },
  'ASO SURABAYA': { city: 'Surabaya', lat: -7.2575, lng: 112.7521 },
  MANADO: { city: 'Manado', lat: 1.4748, lng: 124.8421 },
};

export const REGIONAL_NETWORK: RegionalNetwork[] = Object.keys(REGIONAL_AREA_DATA).map((regional) => ({
  regional,
  color: REGIONAL_COLOR[regional] || '#2FB4C4',
  areas: Object.keys(REGIONAL_AREA_DATA[regional]).map((area) => ({
    area,
    city: AREA_LOCATIONS[area]?.city || area,
    // Default ke kira-kira tengah Indonesia kalau suatu saat ada area baru
    // yang belum sempat diberi koordinat di AREA_LOCATIONS.
    lat: AREA_LOCATIONS[area]?.lat ?? -2.5,
    lng: AREA_LOCATIONS[area]?.lng ?? 118,
  })),
}));

export function getBsuCount(regional: string, area: string): number {
  return REGIONAL_AREA_DATA[regional]?.[area]?.length || 0;
}

export function getRegionalBsuTotal(regional: string): number {
  const areas = REGIONAL_AREA_DATA[regional];
  if (!areas) return 0;
  return Object.values(areas).reduce((sum, list) => sum + list.length, 0);
}

export function getGrandTotalBsu(): number {
  return Object.keys(REGIONAL_AREA_DATA).reduce((sum, regional) => sum + getRegionalBsuTotal(regional), 0);
}

export function googleMapsEmbedUrl(lat: number, lng: number, zoom = 10): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
}

export function googleMapsLinkUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}