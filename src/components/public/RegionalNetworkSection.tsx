import { useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import { MapPin, Building2, ChevronRight, ExternalLink, Map as MapIcon } from 'lucide-react';
import {
  REGIONAL_NETWORK,
  getBsuCount,
  getRegionalBsuTotal,
  getGrandTotalBsu,
  googleMapsLinkUrl,
} from '@/lib/regionalNetwork';
import { getBsuLocations } from '@/lib/bsuLocations';
import MultiPointMap, { type MapPointMarker } from '@/components/public/MultiPointMap';

function handleSpotlight(e: MouseEvent<HTMLElement>) {
  const target = e.currentTarget;
  const rect = target.getBoundingClientRect();
  target.style.setProperty('--spot-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
  target.style.setProperty('--spot-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
}

// ---------------------------------------------------------------------------
// Bagian "Jaringan Regional & ASO" di Beranda.
// Menampilkan daftar Regional -> ASO/Area (sumber: COST_CENTER.pdf, lewat
// src/lib/costCenter.ts & src/lib/regionalNetwork.ts) plus peta Google Maps
// untuk ASO yang dipilih. Klik pill Regional untuk ganti regional, klik salah
// satu ASO di daftar untuk memindahkan peta ke lokasi tersebut.
// ---------------------------------------------------------------------------

export default function RegionalNetworkSection() {
  const [selectedRegional, setSelectedRegional] = useState(REGIONAL_NETWORK[0].regional);
  const [selectedArea, setSelectedArea] = useState(REGIONAL_NETWORK[0].areas[0]?.area || '');

  const activeRegional = REGIONAL_NETWORK.find((r) => r.regional === selectedRegional) || REGIONAL_NETWORK[0];
  const activeArea = activeRegional.areas.find((a) => a.area === selectedArea) || activeRegional.areas[0];

  function handleSelectRegional(regional: string) {
    const next = REGIONAL_NETWORK.find((r) => r.regional === regional);
    setSelectedRegional(regional);
    setSelectedArea(next?.areas[0]?.area || '');
  }

  const totalAreas = REGIONAL_NETWORK.reduce((sum, r) => sum + r.areas.length, 0);
  const totalBsu = getGrandTotalBsu();

  // Satu titik per sub-ASO (BSU) di area terpilih, plus satu titik utama
  // untuk pusat ASO-nya sendiri.
  const bsuLocations = activeArea
    ? getBsuLocations(activeRegional.regional, activeArea.area)
    : [];
  const bsuList = bsuLocations.map((b) => b.name);

  const mapMarkers: MapPointMarker[] = useMemo(() => {
    if (!activeArea) return [];
    const subAsoMarkers: MapPointMarker[] = bsuLocations.map((b, i) => ({
      id: `${activeArea.area}-${i}`,
      name: b.name,
      city: b.city,
      lat: b.lat,
      lng: b.lng,
    }));
    const primaryMarker: MapPointMarker = {
      id: `${activeArea.area}-pusat`,
      name: activeArea.area,
      city: activeArea.city,
      lat: activeArea.lat,
      lng: activeArea.lng,
      isPrimary: true,
    };
    return [primaryMarker, ...subAsoMarkers];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeArea, activeRegional.regional]);

  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue-dark">
            Sebaran Operasional
          </p>
          <h2 className="font-display mt-2 text-3xl font-bold text-slate-900">Jaringan Regional &amp; ASO</h2>
          <p className="mt-4 text-slate-500">
            PT Bintang Sayap Utama beroperasi lewat {REGIONAL_NETWORK.length} regional yang membawahi{' '}
            {totalAreas} ASO/area dan {totalBsu} unit BSU (cost center) di seluruh Indonesia.
          </p>
        </div>

        {/* Pilih Regional */}
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {REGIONAL_NETWORK.map((r) => {
            const active = r.regional === selectedRegional;
            return (
              <button
                key={r.regional}
                type="button"
                onClick={() => handleSelectRegional(r.regional)}
                className={`group flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? '-translate-y-0.5 border-transparent text-white shadow-lg'
                    : 'border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'
                }`}
                style={
                  active
                    ? {
                        background: `linear-gradient(135deg, ${r.color}, ${r.color}cc)`,
                        boxShadow: `0 10px 22px -8px ${r.color}99`,
                      }
                    : undefined
                }
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors"
                  style={
                    active
                      ? { backgroundColor: 'rgba(255,255,255,0.22)', color: '#fff' }
                      : { backgroundColor: `${r.color}1a`, color: r.color }
                  }
                >
                  <Building2 size={14} />
                </span>
                {r.regional}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {r.areas.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-[300px_1fr]">
            {/* Sidebar: daftar ASO/Area untuk regional terpilih */}
            <div className="border-b border-slate-200 p-4 lg:border-b-0 lg:border-r lg:p-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Building2 size={13} /> ASO / Area
                <span className="ml-auto normal-case tracking-normal text-slate-400">
                  {getRegionalBsuTotal(activeRegional.regional)} BSU
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">{activeRegional.regional}</p>

              <div className="mt-3 max-h-[15rem] space-y-2 overflow-y-auto pr-1 lg:max-h-[20rem]">
                {activeRegional.areas.map((a) => {
                  const isActive = a.area === activeArea?.area;
                  const count = getBsuCount(activeRegional.regional, a.area);
                  return (
                    <button
                      key={a.area}
                      type="button"
                      onClick={() => setSelectedArea(a.area)}
                      onMouseMove={handleSpotlight}
                      style={
                        {
                          '--accent': activeRegional.color,
                          '--tw-ring-color': activeRegional.color,
                          ...(isActive
                            ? { background: `linear-gradient(135deg, ${activeRegional.color}, ${activeRegional.color}cc)` }
                            : {}),
                        } as CSSProperties
                      }
                      className={`spotlight group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 ${
                        isActive
                          ? 'border-transparent text-white shadow-md'
                          : 'border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                          style={
                            isActive
                              ? { backgroundColor: 'rgba(255,255,255,0.22)', color: '#fff' }
                              : { backgroundColor: `${activeRegional.color}1a`, color: activeRegional.color }
                          }
                        >
                          <MapPin size={14} />
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`block truncate text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-900'}`}
                          >
                            {a.area}
                          </span>
                          <span className={`block truncate text-xs ${isActive ? 'text-white/75' : 'text-slate-400'}`}>
                            {a.city}
                          </span>
                        </span>
                      </span>
                      <span
                        className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}
                        <ChevronRight size={13} className={isActive ? 'text-white/80' : 'text-slate-300'} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Peta untuk ASO/Area terpilih — full-bleed, nempel langsung ke sidebar */}
            <div className="flex flex-col">
              {activeArea && (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-0 sm:p-5 sm:pb-0">
                    <div>
                      <p
                        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: activeRegional.color }}
                      >
                        <MapIcon size={13} /> {activeRegional.regional}
                      </p>
                      <h3 className="font-display mt-1 text-lg font-bold text-slate-900">{activeArea.area}</h3>
                      <p className="text-sm text-slate-400">{activeArea.city}</p>
                    </div>
                    <a
                      href={googleMapsLinkUrl(activeArea.lat, activeArea.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-teal/40 hover:text-brand-teal-dark"
                    >
                      Buka di Google Maps
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  <div className="mt-4 h-56 w-full sm:h-64 lg:h-72">
                    <MultiPointMap
                      key={activeArea.area}
                      markers={mapMarkers}
                      accentColor={activeRegional.color}
                    />
                  </div>

                  <div className="flex items-center gap-4 p-4 pt-3 text-[11px] text-slate-400 sm:px-5">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-3 w-3 rounded-full border-2 border-white shadow"
                        style={{ backgroundColor: activeRegional.color }}
                      />
                      Pusat {activeArea.area}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full border-2 bg-white shadow"
                        style={{ borderColor: activeRegional.color }}
                      />
                      Titik sub-ASO (BSU)
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Daftar unit BSU — full width di bawah sidebar+peta */}
          {activeArea && (
            <div className="border-t border-slate-200 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Unit BSU di {activeArea.area} ({bsuList.length})
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {bsuLocations.map((bsu) => (
                  <span
                    key={bsu.name}
                    title={bsu.city}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
                  >
                    {bsu.name}
                    <span className="ml-1 text-slate-400">· {bsu.city}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Titik besar menunjukkan pusat ASO, titik kecil menunjukkan lokasi tiap sub-ASO (BSU) —
          keduanya berupa titik kota/kabupaten, bukan alamat kantor presisi.
        </p>
      </div>
    </section>
  );
}