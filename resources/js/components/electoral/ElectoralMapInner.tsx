/**
 * Implementação real do mapa — importada de forma lazy para evitar
 * problemas de SSR com window/document do Leaflet.
 */
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapMarker } from './ElectoralMap';

type Props = {
    data: MapMarker[];
    colorField: string;
    colorScheme: 'blue' | 'green' | 'red' | 'purple';
    onClick?: (m: MapMarker) => void;
    comparison: boolean;
};

function FitBounds({ markers }: { markers: { lat: number; lng: number }[] }) {
    const map = useMap();
    useEffect(() => {
        if (markers.length > 0) {
            const lats = markers.map(m => m.lat);
            const lngs = markers.map(m => m.lng);
            map.fitBounds([
                [Math.min(...lats) - 0.5, Math.min(...lngs) - 0.5],
                [Math.max(...lats) + 0.5, Math.max(...lngs) + 0.5],
            ]);
        }
    }, [markers, map]);
    return null;
}

const palette: Record<string, string[]> = {
    blue:   ['#93c5fd', '#3b82f6', '#1d4ed8'],
    green:  ['#86efac', '#22c55e', '#15803d'],
    red:    ['#fca5a5', '#ef4444', '#b91c1c'],
    purple: ['#c4b5fd', '#8b5cf6', '#6d28d9'],
};

export default function ElectoralMapInner({ data, colorField, colorScheme, onClick, comparison }: Props) {
    const maxVotos = Math.max(...data.map(d => Number(d[colorField] ?? d.total_votos ?? 0)), 1);

    const getRadius = (votos: number) => Math.max(6, Math.min(40, (votos / maxVotos) * 40));

    const getColor = (item: MapMarker) => {
        if (comparison && item.vencedor) {
            return item.vencedor === 'A' ? '#2563eb' : item.vencedor === 'B' ? '#dc2626' : '#9ca3af';
        }
        const ratio = Number(item[colorField] ?? item.total_votos ?? 0) / maxVotos;
        const c = palette[colorScheme] ?? palette.blue;
        return ratio > 0.6 ? c[2] : ratio > 0.3 ? c[1] : c[0];
    };

    const markers = data
        .filter(d => d.latitude && d.longitude)
        .map(d => ({ ...d, lat: d.latitude as number, lng: d.longitude as number }));

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <MapContainer center={[2.8, -60.7]} zoom={7} style={{ height: '500px', width: '100%' }} scrollWheelZoom>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitBounds markers={markers} />
                {markers.map((m, i) => {
                    const votos = Number(m[colorField] ?? m.total_votos ?? 0);
                    return (
                        <CircleMarker
                            key={`${m.id ?? i}-${m.lat}-${m.lng}`}
                            center={[m.lat, m.lng]}
                            radius={getRadius(votos)}
                            fillColor={getColor(m)}
                            fillOpacity={0.65}
                            color={getColor(m)}
                            weight={2}
                            opacity={0.9}
                            eventHandlers={{ click: () => onClick?.(m) }}
                        >
                            <Popup>
                                <div className="text-gray-800 text-sm">
                                    <strong>{m.nome ?? m.municipio_nome ?? `Local ${m.numero as string}`}</strong>
                                    <br />Votos: {votos.toLocaleString('pt-BR')}
                                    {m.votos_a !== undefined && (
                                        <>
                                            <br />Candidato A: {Number(m.votos_a).toLocaleString('pt-BR')}
                                            <br />Candidato B: {Number(m.votos_b).toLocaleString('pt-BR')}
                                            <br />Diferença: {Number(m.diferenca) > 0 ? '+' : ''}{Number(m.diferenca).toLocaleString('pt-BR')}
                                        </>
                                    )}
                                    {m.total_aptos && Number(m.total_aptos) > 0 && (
                                        <><br />Aptos: {Number(m.total_aptos).toLocaleString('pt-BR')}</>
                                    )}
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
