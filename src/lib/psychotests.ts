export type PsychotestDefinition = {
  id: string;
  name: string;
  description: string;
  url: string;
};

export const PSYCHOTESTS: PsychotestDefinition[] = [
  { id: 'mbti', name: 'MBTI', description: 'Kenali preferensi kepribadian dan gaya kerja Anda.', url: 'https://forms.cloud.microsoft/r/tPREwK85Nv' },
  { id: 'disc', name: 'DISC', description: 'Pahami pola perilaku dan cara berkomunikasi di tempat kerja.', url: 'https://forms.cloud.microsoft/r/PybKLswGRD?origin=lprLink' },
  { id: 'ist', name: 'IST', description: 'Ukur kemampuan intelektual dan penalaran kandidat.', url: 'https://forms.cloud.microsoft/r/Fr77AeyF6M?origin=lprLink' },
  { id: 'papi_kostick', name: 'PAPI KOSTIK', description: 'Gambarkan kebutuhan, motivasi, dan preferensi kerja.', url: 'https://forms.cloud.microsoft/r/BBrn4TDx9S?origin=lprLink' },
  { id: 'cfit', name: 'CFIT', description: 'Ukur kemampuan penalaran umum dan kecerdasan nonverbal.', url: 'https://forms.cloud.microsoft/r/Jj3E34Ui8H?origin=lprLink' },
  { id: 'kraepelin_pauli', name: 'Kraepelin / Pauli', description: 'Evaluasi konsistensi, ketelitian, dan daya tahan kerja.', url: import.meta.env.VITE_PSYCHOTEST_KRAEPELIN_URL || '' },
  { id: 'logic', name: 'Tes Logika', description: 'Latihan penalaran umum untuk mendukung proses seleksi.', url: import.meta.env.VITE_PSYCHOTEST_LOGIC_URL || '' },
];

export function getPsychotestName(id: string) {
  return PSYCHOTESTS.find((test) => test.id === id)?.name || id;
}
