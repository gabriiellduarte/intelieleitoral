/**
 * ElectoralMap — usa react-leaflet (lazy para evitar SSR crash).
 * Requer: npm install leaflet react-leaflet @types/leaflet
 */
import { useEffect, lazy, Suspense } from 'react';

// ─── tipos ────────────────────────────────────────────────────────────────────
export type MapMarker = {
    id?: number;
    nome?: string;
    municipio_nome?: string;
    latitude?: number | null;
    longitude?: number | null;
    total_votos?: number;
    votos_a?: number;
    votos_b?: number;
    diferenca?: number;
    total_aptos?: number;
    vencedor?: 'A' | 'B' | 'EMPATE';
    [key: string]: unknown;
};

type Props = {
    data?: MapMarker[];
    colorField?: string;
    colorScheme?: 'blue' | 'green' | 'red' | 'purple';
    onClick?: (m: MapMarker) => void;
    comparison?: boolean;
};

// ─── inner map (só carrega no browser) ───────────────────────────────────────
const MapInner = lazy(() => import('./ElectoralMapInner'));

export default function ElectoralMap({ data = [], colorField = 'total_votos', colorScheme = 'blue', onClick, comparison = false }: Props) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl h-[500px] flex items-center justify-center text-gray-400">
                Selecione filtros para visualizar o mapa
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="bg-white border border-gray-200 rounded-xl h-[500px] flex items-center justify-center text-gray-400">
                Carregando mapa...
            </div>
        }>
            <MapInner
                data={data}
                colorField={colorField}
                colorScheme={colorScheme}
                onClick={onClick}
                comparison={comparison}
            />
        </Suspense>
    );
}
