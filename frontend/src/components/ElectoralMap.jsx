import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function FitBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const lats = markers.filter(m => m.lat).map(m => m.lat);
      const lngs = markers.filter(m => m.lng).map(m => m.lng);
      if (lats.length > 0) {
        map.fitBounds([
          [Math.min(...lats) - 0.5, Math.min(...lngs) - 0.5],
          [Math.max(...lats) + 0.5, Math.max(...lngs) + 0.5],
        ]);
      }
    }
  }, [markers, map]);
  return null;
}

export default function ElectoralMap({ data = [], colorField = 'total_votos', colorScheme = 'blue', onClick, comparison = false }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl h-[500px] flex items-center justify-center text-gray-400">
        Selecione filtros para visualizar o mapa
      </div>
    );
  }

  const maxVotos = Math.max(...data.map(d => d[colorField] || d.total_votos || 0), 1);

  const getRadius = (votos) => Math.max(6, Math.min(40, (votos / maxVotos) * 40));

  const getColor = (item) => {
    if (comparison && item.vencedor) {
      return item.vencedor === 'A' ? '#2563eb' : item.vencedor === 'B' ? '#dc2626' : '#9ca3af';
    }
    const colors = {
      blue: ['#93c5fd', '#3b82f6', '#1d4ed8'],
      green: ['#86efac', '#22c55e', '#15803d'],
      red: ['#fca5a5', '#ef4444', '#b91c1c'],
      purple: ['#c4b5fd', '#8b5cf6', '#6d28d9'],
    };
    const ratio = (item[colorField] || item.total_votos || 0) / maxVotos;
    const c = colors[colorScheme] || colors.blue;
    return ratio > 0.6 ? c[2] : ratio > 0.3 ? c[1] : c[0];
  };

  const markers = data.filter(d => d.latitude && d.longitude).map(d => ({
    ...d,
    lat: d.latitude,
    lng: d.longitude,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <MapContainer
        center={[2.8, -60.7]}
        zoom={7}
        style={{ height: '500px', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds markers={markers} />
        {markers.map((m, i) => (
          <CircleMarker
            key={`${m.id || i}-${m.lat}-${m.lng}`}
            center={[m.lat, m.lng]}
            radius={getRadius(m[colorField] || m.total_votos || 0)}
            fillColor={getColor(m)}
            fillOpacity={0.65}
            color={getColor(m)}
            weight={2}
            opacity={0.9}
            eventHandlers={{
              click: () => onClick?.(m),
            }}
          >
            <Popup>
              <div className="text-gray-800 text-sm">
                <strong>{m.nome || m.municipio_nome || `Local ${m.numero}`}</strong>
                <br />
                Votos: {(m[colorField] || m.total_votos || 0).toLocaleString('pt-BR')}
                {m.votos_a !== undefined && (
                  <>
                    <br />Candidato A: {m.votos_a.toLocaleString('pt-BR')}
                    <br />Candidato B: {m.votos_b.toLocaleString('pt-BR')}
                    <br />Diferenca: {m.diferenca > 0 ? '+' : ''}{m.diferenca.toLocaleString('pt-BR')}
                  </>
                )}
                {m.total_aptos > 0 && (
                  <>
                    <br />Aptos: {m.total_aptos.toLocaleString('pt-BR')}
                  </>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
