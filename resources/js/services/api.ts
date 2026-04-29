import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

function obterEleicaoIdDaUrlAtual(): string {
    if (typeof window === 'undefined') {
        return '';
    }

    // URL pattern: /app/{eleicao_id}/...
    const partes = window.location.pathname.split('/');
    if (partes[1] !== 'app' || !partes[2] || !/^\d+$/.test(partes[2])) {
        return '';
    }

    return partes[2];
}

// Injeta token Bearer do Laravel (cookie/session já é suficiente, mas mantemos compatibilidade)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const eleicaoId = obterEleicaoIdDaUrlAtual();
    if (!eleicaoId) {
        return config;
    }

    if (!config.params) {
        config.params = { eleicao_id: eleicaoId };
        return config;
    }

    const paramsComoObjeto = config.params as Record<string, unknown>;
    if (!paramsComoObjeto.eleicao_id) {
        paramsComoObjeto.eleicao_id = eleicaoId;
    }

    return config;
});

// 401 → redireciona para login do Laravel
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            window.location.href = '/login';
        }
        return Promise.reject(err);
    },
);

// ─── Status / Eleições ────────────────────────────────────────────────────────
export const getStatus      = ()       => api.get('/status').then(r => r.data);
export const getElections   = ()       => api.get('/elections').then(r => r.data);
export const getCargos      = ()       => api.get('/elections/cargos').then(r => r.data);
export const getPartidos    = ()       => api.get('/elections/partidos').then(r => r.data);
export const getMunicipios  = ()       => api.get('/elections/municipios').then(r => r.data);
export const getZonas       = (p?: object) => api.get('/elections/zonas', { params: p }).then(r => r.data);
export const getLocais      = (p?: object) => api.get('/elections/locais', { params: p }).then(r => r.data);

// ─── Candidatos ───────────────────────────────────────────────────────────────
export type PaginatedResponse<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
};

export const getCandidates = (p?: object): Promise<PaginatedResponse<Record<string, unknown>>> =>
    api.get('/candidates', { params: p }).then(r => r.data);

export const getCandidateProfile = (id: string | number) => api.get(`/candidates/${id}`).then(r => r.data);

// ─── Votos / Dashboard ────────────────────────────────────────────────────────
export const getDashboard  = (p?: object) => api.get('/votes/dashboard', { params: p }).then(r => r.data);
export const getMapLocais  = (p?: object) => api.get('/votes/map/locais', { params: p }).then(r => r.data);
export const getSecoes     = (p?: object) => api.get('/votes/secoes', { params: p }).then(r => r.data);

// ─── Comparação / Estratégia ──────────────────────────────────────────────────
export const getComparison = (p?: object) => api.get('/comparison', { params: p }).then(r => r.data);
export const getEstrategia = (id: string | number) => api.get(`/comparison/estrategia/${id}`).then(r => r.data);

// ─── Importação ───────────────────────────────────────────────────────────────
export type TipoImportacaoV3 = 'candidato_munzona' | 'votos_secao' | 'municipio_referencia' | 'boletim_urna';

export const importFile = (file: File, tipo: TipoImportacaoV3) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('tipo', tipo);

    const endpoint =
        tipo === 'candidato_munzona'    ? '/import/v4'       :
        tipo === 'municipio_referencia' ? '/import/v3'       :
        tipo === 'boletim_urna'         ? '/import/secoes/v1':
        /* votos_secao */                 '/import/secoes/v1';

    return api.post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};

export const getHistoricoImportacoes = () => api.get('/imports').then(r => r.data);
export const gerarImportacao = (id: number) => api.post(`/imports/${id}/gerar`).then(r => r.data);
export const excluirImportacao = (id: number) => api.delete(`/imports/${id}`).then(r => r.data);

// ─── Geocodificação ────────────────────────────────────────────────────────────
type ParametrosGeocodificacao = {
    cidade: string;
    uf?: string;
    endereco?: string;
    pais?: string;
};

export const obterCoordenadasGoogle = (dados: ParametrosGeocodificacao) =>
    api.post('/geocoding/coordenadas', dados).then(r => r.data);

export default api;
