"use client";

// Leafletマップコンポーネント（SSR無効で使う）
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

type Property = {
  id: string;
  title: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

type Props = {
  properties: Property[];
  onSelectProperty: (id: string) => void;
};

export default function PropertyMap({ properties, onSelectProperty }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    if (!containerRef.current) return;
    initializedRef.current = true;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // デフォルトアイコン修正
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!containerRef.current) return;

      // 地図の初期中心（東京）
      const map = L.map(containerRef.current).setView([35.6762, 139.6503], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;

      // ピンを追加
      const validProperties = properties.filter((p) => p.lat && p.lng);
      validProperties.forEach((p) => {
        const marker = L.marker([p.lat!, p.lng!]).addTo(map);
        marker.bindPopup(`
          <div style="min-width:140px">
            <div style="font-weight:600;font-size:13px;margin-bottom:4px">${p.title}</div>
            <div style="font-size:11px;color:#888;margin-bottom:8px">${p.address}</div>
            <button
              onclick="window._selectProperty('${p.id}')"
              style="font-size:12px;color:#34d399;cursor:pointer;background:none;border:none;padding:0"
            >詳細を見る →</button>
          </div>
        `);
      });

      // ポップアップのボタン用グローバル関数
      (window as unknown as Record<string, unknown>)._selectProperty = (id: string) => {
        onSelectProperty(id);
      };

      // 全ピンが見えるようにズーム調整
      if (validProperties.length > 0) {
        const bounds = L.latLngBounds(validProperties.map((p) => [p.lat!, p.lng!]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
