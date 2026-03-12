import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getStatus = () => api.get('/status').then(r => r.data);
export const getElections = () => api.get('/elections').then(r => r.data);
export const getCargos = () => api.get('/elections/cargos').then(r => r.data);
export const getPartidos = () => api.get('/elections/partidos').then(r => r.data);
export const getMunicipios = () => api.get('/elections/municipios').then(r => r.data);
export const getZonas = (params) => api.get('/elections/zonas', { params }).then(r => r.data);
export const getLocais = (params) => api.get('/elections/locais', { params }).then(r => r.data);

export const getCandidates = (params) => api.get('/candidates', { params }).then(r => r.data);
export const getCandidateProfile = (id) => api.get(`/candidates/${id}`).then(r => r.data);

export const getDashboard = (params) => api.get('/votes/dashboard', { params }).then(r => r.data);
export const getMapLocais = (params) => api.get('/votes/map/locais', { params }).then(r => r.data);
export const getSecoes = (params) => api.get('/votes/secoes', { params }).then(r => r.data);

export const getComparison = (params) => api.get('/comparison', { params }).then(r => r.data);
export const getEstrategia = (id) => api.get(`/comparison/estrategia/${id}`).then(r => r.data);

export const importFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};
