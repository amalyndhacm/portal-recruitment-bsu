// ---------------------------------------------------------------------------
// Data lokasi (kota/kabupaten + koordinat) untuk tiap unit BSU (sub-ASO),
// dipakai untuk menampilkan titik per bagian sub-ASO di peta "Jaringan
// Regional & ASO" (lihat MultiPointMap.tsx & RegionalNetworkSection.tsx).
//
// Nama BSU di sini HARUS persis sama dengan string di REGIONAL_AREA_DATA
// (src/lib/costCenter.ts) supaya bisa dicocokkan otomatis. Kalau ada BSU baru
// yang belum terdaftar di sini, koordinatnya akan fallback ke titik pusat
// ASO induknya (lihat getBsuLocations di bawah).
//
// Koordinat berupa titik kota/kabupaten (bukan alamat kantor presisi), cukup
// untuk keperluan visualisasi sebaran per sub-ASO.
// ---------------------------------------------------------------------------

import { REGIONAL_AREA_DATA } from '@/lib/costCenter';
import { REGIONAL_NETWORK } from '@/lib/regionalNetwork';

export type BsuLocation = {
  name: string;
  city: string;
  lat: number;
  lng: number;
  /** true kalau koordinat asli BSU tidak terdaftar & fallback ke titik ASO induk */
  isFallback?: boolean;
};

const KEPANJEN = { city: 'Kepanjen, Kabupaten Malang', lat: -8.1333, lng: 112.5667 };

export const BSU_LOCATIONS: Record<string, { city: string; lat: number; lng: number }> = {
  // KANTOR PUSAT / PUSAT — semua BSU departemen berkantor di lokasi yang sama
  'BSU FINANCE': KEPANJEN,
  'BSU HRD': KEPANJEN,
  'BSU LEGAL': KEPANJEN,
  'BSU MANAJEMEN INFORMASI SISTEM': KEPANJEN,
  'BSU MARKETING PROMOSI': KEPANJEN,
  'BSU PENGADAAN': KEPANJEN,
  'BSU PENGEMBANGAN USAHA': KEPANJEN,
  'BSU PERPAJAKAN': KEPANJEN,
  'BSU PUSAT ACCOUNTING': KEPANJEN,
  'BSU SALES & DISTRIBUTION': KEPANJEN,
  'BSU SATUAN PENGAWAS INTERNAL': KEPANJEN,
  KEPANJEN: KEPANJEN,

  // REGIONAL 1 - JAWA TIMUR
  'BSU JAWA TIMUR BOJONEGORO': { city: 'Bojonegoro', lat: -7.15, lng: 111.8818 },
  'BSU JAWA TIMUR LAMONGAN': { city: 'Lamongan', lat: -7.1194, lng: 112.4114 },
  'BSU JAWA TIMUR SUB ASO TUBAN': { city: 'Tuban', lat: -6.8974, lng: 112.0649 },
  'BSU JAWA TIMUR SUB DEPO BLORA': { city: 'Blora', lat: -6.97, lng: 111.4162 },

  'BSU JAWA TIMUR JEMBER': { city: 'Jember', lat: -8.1731, lng: 113.7002 },
  'BSU JAWA TIMUR LUMAJANG': { city: 'Lumajang', lat: -8.1345, lng: 113.2246 },
  'BSU JAWA TIMUR SUB DEPO BANYUWANGI': { city: 'Banyuwangi', lat: -8.2192, lng: 114.3691 },
  'BSU JAWA TIMUR SUB DEPO SITUBONDO': { city: 'Situbondo', lat: -7.7069, lng: 114.0083 },

  'BSU JAWA TIMUR KEPANJEN': KEPANJEN,
  'BSU JAWA TIMUR MALANG': { city: 'Malang', lat: -7.9666, lng: 112.6326 },
  'BSU JAWA TIMUR PASURUAN': { city: 'Pasuruan', lat: -7.6453, lng: 112.9075 },
  'BSU JAWA TIMUR PROBOLINGGO': { city: 'Probolinggo', lat: -7.7543, lng: 113.2159 },

  'BSU JAWA TIMUR JOMBANG': { city: 'Jombang', lat: -7.546, lng: 112.2384 },
  'BSU JAWA TIMUR MOJOKERTO': { city: 'Mojokerto', lat: -7.4664, lng: 112.4341 },
  'BSU JAWA TIMUR NGANJUK': { city: 'Nganjuk', lat: -7.6053, lng: 111.9036 },
  'BSU JAWA TIMUR SUB DEPO NGAWI': { city: 'Ngawi', lat: -7.4034, lng: 111.4464 },

  'BSU JAWA TIMUR PACITAN': { city: 'Pacitan', lat: -8.1959, lng: 111.1 },
  'BSU JAWA TIMUR PONOROGO': { city: 'Ponorogo', lat: -7.865, lng: 111.4636 },
  'BSU JAWA TIMUR SUB DEPO MADIUN': { city: 'Madiun', lat: -7.6298, lng: 111.5239 },
  'BSU JAWA TIMUR SUB DEPO MAGETAN': { city: 'Magetan', lat: -7.6501, lng: 111.33 },
  'BSU JAWA TIMUR WONOGIRI': { city: 'Wonogiri', lat: -7.816, lng: 110.9241 },

  'BSU JAWA TIMUR BLITAR': { city: 'Blitar', lat: -8.0954, lng: 112.1609 },
  'BSU JAWA TIMUR KEDIRI': { city: 'Kediri', lat: -7.848, lng: 112.0178 },
  'BSU JAWA TIMUR TRENGGALEK': { city: 'Trenggalek', lat: -8.0503, lng: 111.7096 },
  'BSU JAWA TIMUR TULUNGAGUNG': { city: 'Tulungagung', lat: -8.0646, lng: 111.902 },

  // REGIONAL 2 - JAWA TENGAH & DIY
  'BSU SUB ASO BANJARNEGARA': { city: 'Banjarnegara', lat: -7.3915, lng: 109.6935 },
  'BSU SUB ASO MAGELANG': { city: 'Magelang', lat: -7.4707, lng: 110.2178 },
  'BSU SUB ASO PURWOREJO': { city: 'Purworejo', lat: -7.7191, lng: 110.0125 },
  'BSU SUB ASO WONOSOBO': { city: 'Wonosobo', lat: -7.3616, lng: 109.9004 },

  'BSU JAWA TIMUR SUB DEPO GROBOGAN': { city: 'Purwodadi, Grobogan', lat: -7.0908, lng: 110.9188 },
  'BSU JAWA TIMUR SUB DEPO JEPARA': { city: 'Jepara', lat: -6.5822, lng: 110.6708 },
  'BSU JAWA TIMUR SUB DEPO PATI': { city: 'Pati', lat: -6.7565, lng: 111.0382 },
  'BSU JAWA TIMUR SUB DEPO REMBANG': { city: 'Rembang', lat: -6.7096, lng: 111.3467 },

  'BSU PURWOKERTO': { city: 'Purwokerto, Banyumas', lat: -7.4218, lng: 109.2337 },
  'BSU SUB ASO BATANG': { city: 'Batang', lat: -6.9066, lng: 109.7312 },
  'BSU SUB ASO BREBES': { city: 'Brebes', lat: -6.8724, lng: 109.0405 },
  'BSU SUB ASO CILACAP': { city: 'Cilacap', lat: -7.7261, lng: 109.0071 },
  'BSU SUB ASO KEBUMEN': { city: 'Kebumen', lat: -7.6708, lng: 109.6532 },
  'BSU SUB ASO PEKALONGAN': { city: 'Pekalongan', lat: -6.8898, lng: 109.6753 },
  'BSU SUB ASO PEMALANG': { city: 'Pemalang', lat: -6.8899, lng: 109.3814 },
  'BSU SUB ASO PURBALINGGA': { city: 'Purbalingga', lat: -7.3886, lng: 109.3406 },
  'BSU SUB ASO TEGAL': { city: 'Tegal', lat: -6.8694, lng: 109.1402 },

  'BSU SEMARANG': { city: 'Semarang', lat: -6.9932, lng: 110.4203 },
  'BSU SUB ASO DEMAK': { city: 'Demak', lat: -6.8899, lng: 110.6392 },
  'BSU SUB ASO KENDAL': { city: 'Kendal', lat: -6.9199, lng: 110.2054 },
  'BSU SUB ASO SALATIGA': { city: 'Salatiga', lat: -7.3305, lng: 110.5084 },

  'BSU SOLO RAYA': { city: 'Surakarta (Solo)', lat: -7.5755, lng: 110.8243 },
  'BSU SUB ASO BOYOLALI': { city: 'Boyolali', lat: -7.5361, lng: 110.5949 },
  'BSU SUB ASO KARANGANYAR': { city: 'Karanganyar', lat: -7.6003, lng: 111.0164 },
  'BSU SUB ASO KLATEN': { city: 'Klaten', lat: -7.706, lng: 110.606 },
  'BSU SUB ASO SRAGEN': { city: 'Sragen', lat: -7.4262, lng: 111.0227 },

  'BSU SUB ASO BANTUL': { city: 'Bantul', lat: -7.8878, lng: 110.3288 },
  'BSU SUB ASO GUNUNG KIDUL': { city: 'Wonosari, Gunung Kidul', lat: -7.9672, lng: 110.6178 },
  'BSU SUB ASO KULON PROGO': { city: 'Wates, Kulon Progo', lat: -7.8494, lng: 110.1636 },
  'BSU SUB ASO SLEMAN': { city: 'Sleman', lat: -7.7167, lng: 110.3572 },
  'BSU YOGYAKARTA': { city: 'Yogyakarta', lat: -7.7972, lng: 110.3688 },

  // REGIONAL 3 - LAMPUNG & JABAR (satu BSU per ASO — titik sama dengan pusat ASO)
  'BSU BANDUNG': { city: 'Bandung', lat: -6.9175, lng: 107.6191 },
  'BSU BANTEN': { city: 'Serang, Banten', lat: -6.1149, lng: 106.1503 },
  'BSU BOGOR': { city: 'Bogor', lat: -6.5971, lng: 106.806 },
  'BSU TASIKMALAYA': { city: 'Tasikmalaya', lat: -7.3506, lng: 108.2172 },
  'BSU LAMPUNG': { city: 'Bandar Lampung', lat: -5.3971, lng: 105.2668 },

  // REGIONAL 4 - INDONESIA TIMUR
  'BSU KALIMANTAN BANJARMASIN': { city: 'Banjarmasin', lat: -3.3186, lng: 114.5944 },
  'BSU KALIMANTAN PALANGKA RAYA': { city: 'Palangka Raya', lat: -2.2096, lng: 113.9213 },
  'BSU JAWA TIMUR GRESIK': { city: 'Gresik', lat: -7.1547, lng: 112.6529 },
  'BSU JAWA TIMUR SIDOARJO': { city: 'Sidoarjo', lat: -7.4478, lng: 112.7183 },
  'BSU JAWA TIMUR SURABAYA': { city: 'Surabaya', lat: -7.2575, lng: 112.7521 },
  'BSU JAWA TIMUR SURABAYA RUNGKUT': { city: 'Surabaya (Rungkut)', lat: -7.3296, lng: 112.7688 },
  'BSU MANADO': { city: 'Manado', lat: 1.4748, lng: 124.8421 },
};

/**
 * Ambil daftar titik lokasi tiap BSU (sub-ASO) untuk satu Regional + Area.
 * Kalau nama BSU belum terdaftar di BSU_LOCATIONS, fallback ke titik pusat
 * ASO induknya (dari REGIONAL_NETWORK) supaya tetap tampil di peta.
 */
export function getBsuLocations(regional: string, area: string): BsuLocation[] {
  const names = REGIONAL_AREA_DATA[regional]?.[area] || [];
  const parentArea = REGIONAL_NETWORK.find((r) => r.regional === regional)?.areas.find(
    (a) => a.area === area
  );

  return names.map((name) => {
    const known = BSU_LOCATIONS[name];
    if (known) {
      return { name, ...known };
    }
    return {
      name,
      city: parentArea?.city || area,
      lat: parentArea?.lat ?? -2.5,
      lng: parentArea?.lng ?? 118,
      isFallback: true,
    };
  });
}