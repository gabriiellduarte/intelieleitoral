import { useState, useEffect } from 'react';
import * as api from '../services/api';

export default function Import() {
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getStatus().then(setStatus);
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.importFile(file);
      setResult(res);
      api.getStatus().then(setStatus);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Importar Dados do TSE</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Status do Banco de Dados</h2>
        {status ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase">Eleicoes</div>
              <div className="text-2xl font-bold text-blue-700">{status.eleicoes}</div>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase">Candidatos</div>
              <div className="text-2xl font-bold text-purple-700">{status.candidatos}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase">Registros de Votos</div>
              <div className="text-2xl font-bold text-emerald-700">{status.votos.toLocaleString('pt-BR')}</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase">Municipios</div>
              <div className="text-2xl font-bold text-amber-700">{status.municipios}</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Carregando...</p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Upload de CSV</h2>
        <p className="text-sm text-gray-500 mb-4">
          Faca upload de arquivos CSV oficiais do TSE (Boletim de Urna). O sistema ira processar e normalizar os dados automaticamente.
        </p>

        <label className="block">
          <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${uploading ? 'border-amber-400 bg-amber-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}
          >
            {uploading ? (
              <div className="text-amber-600">
                <i className="fa-solid fa-spinner fa-spin text-4xl mb-3 block"></i>
                <p className="font-medium">Processando arquivo...</p>
                <p className="text-xs text-gray-400 mt-1">Isso pode levar alguns segundos</p>
              </div>
            ) : (
              <div className="text-gray-500">
                <i className="fa-solid fa-cloud-arrow-up text-4xl mb-3 block"></i>
                <p className="font-medium">Clique para selecionar arquivo CSV</p>
                <p className="text-xs text-gray-400 mt-1">Formato: CSV do TSE com delimitador ;</p>
              </div>
            )}
          </div>
          <input type="file" accept=".csv" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>

        {result && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-emerald-700 font-medium">Importacao concluida com sucesso!</p>
            <p className="text-sm text-gray-500">{result.records.toLocaleString('pt-BR')} registros processados</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">Erro na importacao</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Como obter os dados</h2>
        <ol className="space-y-3 text-sm text-gray-600">
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">1.</span>
            Acesse o portal de dados abertos do TSE
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">2.</span>
            Selecione "Resultados" e o ano da eleicao desejada
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">3.</span>
            Baixe o arquivo de Boletim de Urna (formato CSV)
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 font-bold">4.</span>
            Faca upload do arquivo nesta pagina
          </li>
        </ol>
      </div>
    </div>
  );
}
