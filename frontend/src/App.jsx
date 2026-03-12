import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CandidateProfile from './pages/CandidateProfile';
import Comparison from './pages/Comparison';
import Strategy from './pages/Strategy';
import Import from './pages/Import';

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'fa-solid fa-chart-pie' },
  { to: '/comparacao', label: 'Comparacao', icon: 'fa-solid fa-scale-balanced' },
  { to: '/estrategia', label: 'Estrategia', icon: 'fa-solid fa-bullseye' },
  /*{ to: '/importar', label: 'Importar', icon: 'fa-solid fa-file-import' },*/
];

function Layout({ children }) {
  const [menuAbertoMobile, setMenuAbertoMobile] = useState(false);

  const alternarMenuMobile = () => {
    setMenuAbertoMobile(valorAtual => !valorAtual);
  };

  const fecharMenuMobile = () => {
    setMenuAbertoMobile(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Topbar mobile */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
            IE
          </div>
          <div className="text-sm font-bold text-gray-900">Intel Eleitoral</div>
        </div>
        <button
          type="button"
          onClick={alternarMenuMobile}
          className="w-9 h-9 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100"
          aria-label={menuAbertoMobile ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAbertoMobile}
          aria-controls="menu-lateral"
        >
          <i className={`fa-solid ${menuAbertoMobile ? 'fa-xmark' : 'fa-bars'}`}></i>
        </button>
      </header>

      {/* Overlay mobile */}
      {menuAbertoMobile && (
        <button
          type="button"
          onClick={fecharMenuMobile}
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          aria-label="Fechar menu lateral"
        />
      )}

      {/* Sidebar */}
      <aside
        id="menu-lateral"
        className={`w-56 bg-white border-r border-gray-200 flex flex-col fixed h-full shadow-sm z-50 transform transition-transform duration-200
          ${menuAbertoMobile ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
              IE
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">Intel Eleitoral</div>
              <div className="text-[10px] text-gray-400">Roraima - TSE</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={fecharMenuMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                ${isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`
              }
            >
              <i className={`${item.icon} w-4 text-center`}></i>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="text-[10px] text-gray-400 text-center">
            Sistema de Inteligencia Eleitoral v1.0
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-56 p-4 md:p-6 max-w-[1400px] w-full mt-14 md:mt-0">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/candidato/:id" element={<CandidateProfile />} />
          <Route path="/comparacao" element={<Comparison />} />
          <Route path="/estrategia" element={<Strategy />} />
          <Route path="/importar" element={<Import />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
