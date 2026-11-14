// ---------------------------------------------------------------------------
// Data Regional -> Area -> Deskripsi (Cost Center)
// Sumber: COST_CENTER.pdf
//
// Dipakai di form "Pengajuan Karyawan Baru" supaya field Div / Job Site diisi
// lewat 3 dropdown bertingkat: pilih Regional dulu, lalu Area, lalu Deskripsi
// (nama BSU / cost center) -- bukan diketik manual, supaya konsisten dengan
// daftar cost center resmi perusahaan.
// ---------------------------------------------------------------------------

export type CostCenterData = Record<string, Record<string, string[]>>;

export const REGIONAL_AREA_DATA: CostCenterData = {
  'KANTOR PUSAT': {
    'PUSAT': [
      'BSU FINANCE',
      'BSU HRD',
      'BSU LEGAL',
      'BSU MANAJEMEN INFORMASI SISTEM',
      'BSU MARKETING PROMOSI',
      'BSU PENGADAAN',
      'BSU PENGEMBANGAN USAHA',
      'BSU PERPAJAKAN',
      'BSU PUSAT ACCOUNTING',
      'BSU SALES & DISTRIBUTION',
      'BSU SATUAN PENGAWAS INTERNAL',
    ],
    'KEPANJEN': ['KEPANJEN'],
  },
  'REGIONAL 1 - JAWA TIMUR': {
    'ASO BOJONEGORO': [
      'BSU JAWA TIMUR BOJONEGORO',
      'BSU JAWA TIMUR LAMONGAN',
      'BSU JAWA TIMUR SUB ASO TUBAN',
      'BSU JAWA TIMUR SUB DEPO BLORA',
    ],
    'ASO JEMBER': [
      'BSU JAWA TIMUR JEMBER',
      'BSU JAWA TIMUR LUMAJANG',
      'BSU JAWA TIMUR SUB DEPO BANYUWANGI',
      'BSU JAWA TIMUR SUB DEPO SITUBONDO',
    ],
    'ASO MALANG RAYA': [
      'BSU JAWA TIMUR KEPANJEN',
      'BSU JAWA TIMUR MALANG',
      'BSU JAWA TIMUR PASURUAN',
      'BSU JAWA TIMUR PROBOLINGGO',
    ],
    'ASO MOJOKERTO': [
      'BSU JAWA TIMUR JOMBANG',
      'BSU JAWA TIMUR MOJOKERTO',
      'BSU JAWA TIMUR NGANJUK',
      'BSU JAWA TIMUR SUB DEPO NGAWI',
    ],
    'ASO PONOROGO': [
      'BSU JAWA TIMUR PACITAN',
      'BSU JAWA TIMUR PONOROGO',
      'BSU JAWA TIMUR SUB DEPO MADIUN',
      'BSU JAWA TIMUR SUB DEPO MAGETAN',
      'BSU JAWA TIMUR WONOGIRI',
    ],
    'ASO TULUNGAGUNG': [
      'BSU JAWA TIMUR BLITAR',
      'BSU JAWA TIMUR KEDIRI',
      'BSU JAWA TIMUR TRENGGALEK',
      'BSU JAWA TIMUR TULUNGAGUNG',
    ],
  },
  'REGIONAL 2 - JAWA TENGAH & DIY': {
    'ASO MAGELANG': [
      'BSU SUB ASO BANJARNEGARA',
      'BSU SUB ASO MAGELANG',
      'BSU SUB ASO PURWOREJO',
      'BSU SUB ASO WONOSOBO',
    ],
    'ASO PATI': [
      'BSU JAWA TIMUR SUB DEPO GROBOGAN',
      'BSU JAWA TIMUR SUB DEPO JEPARA',
      'BSU JAWA TIMUR SUB DEPO PATI',
      'BSU JAWA TIMUR SUB DEPO REMBANG',
    ],
    'ASO PURWOKERTO': [
      'BSU PURWOKERTO',
      'BSU SUB ASO BATANG',
      'BSU SUB ASO BREBES',
      'BSU SUB ASO CILACAP',
      'BSU SUB ASO KEBUMEN',
      'BSU SUB ASO PEKALONGAN',
      'BSU SUB ASO PEMALANG',
      'BSU SUB ASO PURBALINGGA',
      'BSU SUB ASO TEGAL',
    ],
    'ASO SEMARANG': [
      'BSU SEMARANG',
      'BSU SUB ASO DEMAK',
      'BSU SUB ASO KENDAL',
      'BSU SUB ASO SALATIGA',
    ],
    'ASO SOLO RAYA': [
      'BSU SOLO RAYA',
      'BSU SUB ASO BOYOLALI',
      'BSU SUB ASO KARANGANYAR',
      'BSU SUB ASO KLATEN',
      'BSU SUB ASO SRAGEN',
    ],
    'ASO YOGYAKARTA': [
      'BSU SUB ASO BANTUL',
      'BSU SUB ASO GUNUNG KIDUL',
      'BSU SUB ASO KULON PROGO',
      'BSU SUB ASO SLEMAN',
      'BSU YOGYAKARTA',
    ],
  },
  'REGIONAL 3 - LAMPUNG & JABAR': {
    'ASO BANDUNG': ['BSU BANDUNG'],
    'ASO BANTEN': ['BSU BANTEN'],
    'ASO BOGOR': ['BSU BOGOR'],
    'ASO TASIKMALAYA': ['BSU TASIKMALAYA'],
    'LAMPUNG': ['BSU LAMPUNG'],
  },
  'REGIONAL 4 - INDONESIA TIMUR': {
    'ASO BANJARMASIN': ['BSU KALIMANTAN BANJARMASIN'],
    'ASO PALANGKA RAYA': ['BSU KALIMANTAN PALANGKA RAYA'],
    'ASO SURABAYA': [
      'BSU JAWA TIMUR GRESIK',
      'BSU JAWA TIMUR SIDOARJO',
      'BSU JAWA TIMUR SURABAYA',
      'BSU JAWA TIMUR SURABAYA RUNGKUT',
    ],
    'MANADO': ['BSU MANADO'],
  },
};

export const REGIONAL_OPTIONS = Object.keys(REGIONAL_AREA_DATA);

export function getAreaOptions(regional: string): string[] {
  if (!regional || !REGIONAL_AREA_DATA[regional]) return [];
  return Object.keys(REGIONAL_AREA_DATA[regional]);
}

export function getDescriptionOptions(regional: string, area: string): string[] {
  if (!regional || !area) return [];
  return REGIONAL_AREA_DATA[regional]?.[area] || [];
}

// Dipakai saat membuka mode edit: dari nilai `div_job_site` yang tersimpan
// (berupa Deskripsi/cost center), cari balik Regional & Area-nya supaya
// ketiga dropdown otomatis terisi. Kalau tidak ditemukan (misal data lama
// yang diisi manual sebelum fitur ini ada), kembalikan null.
export function findLocationByDescription(description: string): { regional: string; area: string } | null {
  if (!description) return null;
  for (const regional of Object.keys(REGIONAL_AREA_DATA)) {
    for (const area of Object.keys(REGIONAL_AREA_DATA[regional])) {
      if (REGIONAL_AREA_DATA[regional][area].includes(description)) {
        return { regional, area };
      }
    }
  }
  return null;
}