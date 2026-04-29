import { useMemo, useState } from 'react';

export type FilterState = {
    eleicao_id?: string | number;
    cargo_id?: string | number;
    partido_id?: string | number;
    municipio_id?: string | number;
    candidato_id?: string | number;
};

type Props = {
    filters: FilterState;
    onChange: (f: FilterState) => void;
    filtrosPopulados: {
        eleicoes?: { id: number; ano: number; descricao: string }[];
        cargos: { id: number; descricao: string }[];
        partidos: { id: number; sigla: string; nome?: string }[];
        municipios: { id: number; nome: string }[];
        candidatos: { id: number; nome: string; numero?: number; partido_sigla?: string }[];
    };
};

const sel = 'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent';

export default function Filters({ filters, onChange, filtrosPopulados }: Props) {
    const [search, setSearch] = useState('');

    const candidatosFiltrados = useMemo(() => {
        const termoBusca = search.trim().toLowerCase();
        if (!termoBusca) {
            return filtrosPopulados.candidatos.slice(0, 100);
        }

        return filtrosPopulados.candidatos
            .filter((candidato) => candidato.nome.toLowerCase().includes(termoBusca))
            .slice(0, 100);
    }, [filtrosPopulados.candidatos, search]);

    const set = (key: keyof FilterState, val: string) =>
        onChange({ ...filters, [key]: val || '' });

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Eleição</label>
                    <select value={filters.eleicao_id ?? ''} onChange={e => set('eleicao_id', e.target.value)} className={sel}>
                        <option value="">Todas</option>
                        {(filtrosPopulados.eleicoes ?? []).map(e => <option key={e.id} value={e.id}>{e.ano} – {e.descricao}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cargo</label>
                    <select value={filters.cargo_id ?? ''} onChange={e => set('cargo_id', e.target.value)} className={sel}>
                        <option value="">Todos</option>
                        {filtrosPopulados.cargos.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Partido</label>
                    <select value={filters.partido_id ?? ''} onChange={e => set('partido_id', e.target.value)} className={sel}>
                        <option value="">Todos</option>
                        {filtrosPopulados.partidos.map(p => <option key={p.id} value={p.id}>{p.sigla}{p.nome ? ` – ${p.nome}` : ''}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Município</label>
                    <select value={filters.municipio_id ?? ''} onChange={e => set('municipio_id', e.target.value)} className={sel}>
                        <option value="">Todos</option>
                        {filtrosPopulados.municipios.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Candidato</label>
                    <select value={filters.candidato_id ?? ''} onChange={e => set('candidato_id', e.target.value)} className={sel}>
                        <option value="">Todos</option>
                        {candidatosFiltrados.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.numero ? `${c.numero} – ` : ''}{c.nome}{c.partido_sigla ? ` (${c.partido_sigla})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Nome do candidato..."
                        className={sel}
                    />
                </div>
            </div>
        </div>
    );
}
