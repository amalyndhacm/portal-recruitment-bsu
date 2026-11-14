import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ---------------------------------------------------------------------------
// Peta multi-titik berbasis Leaflet + OpenStreetMap (gratis, tanpa API key).
// Dipakai untuk menampilkan satu titik per sub-ASO (BSU) sekaligus di dalam
// satu ASO/area yang sedang dipilih — beda dengan iframe Google Maps embed
// sebelumnya yang cuma bisa menampilkan satu pin.
// ---------------------------------------------------------------------------

export type MapPointMarker = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  /** Titik utama (pusat ASO) digambar lebih besar & warna aksen regional */
  isPrimary?: boolean;
};

type MultiPointMapProps = {
  markers: MapPointMarker[];
  accentColor: string;
};

export default function MultiPointMap({ markers, accentColor }: MultiPointMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LeafletMarker[]>([]);

  // Inisialisasi peta sekali saat komponen mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([-7.5, 111.5], 8);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render ulang marker tiap kali daftar titik berubah (ganti ASO / regional)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      const map = mapRef.current;
      if (cancelled || !map) return;

      // Bersihkan marker lama
      markersLayerRef.current.forEach((m) => m.remove());
      markersLayerRef.current = [];

      if (markers.length === 0) return;

      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));

      markers.forEach((point) => {
        const size = point.isPrimary ? 30 : 20;
        const color = point.isPrimary ? accentColor : '#ffffff';
        const border = point.isPrimary ? '#ffffff' : accentColor;

        const icon = L.divIcon({
          className: '',
          html: `<div style="
              width:${size}px;height:${size}px;border-radius:9999px;
              background:${color};border:3px solid ${border};
              box-shadow:0 1px 4px rgba(0,0,0,.35);
              display:flex;align-items:center;justify-content:center;
            "></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([point.lat, point.lng], { icon }).addTo(map);
        marker.bindPopup(
          `<div style="font-family:Inter,sans-serif;font-size:13px;">
             <strong>${point.name}</strong><br/>
             <span style="color:#64748b;">${point.city}</span><br/>
             <a href="https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}"
                target="_blank" rel="noreferrer" style="color:${accentColor};">
               Buka di Google Maps
             </a>
           </div>`
        );
        if (point.isPrimary) marker.openPopup();

        markersLayerRef.current.push(marker);
      });

      if (markers.length === 1) {
        map.setView([markers[0].lat, markers[0].lng], 10);
      } else {
        map.fitBounds(bounds, { padding: [32, 32] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [markers, accentColor]);

  // Leaflet memakai z-index internal yang cukup tinggi untuk pane dan kontrol.
  // `isolate` membuat seluruh layer peta tetap berada di bawah navbar sticky.
  return <div ref={containerRef} className="relative z-0 isolate h-full w-full" />;
}
