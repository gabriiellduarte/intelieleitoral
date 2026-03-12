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
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col fixed h-full shadow-sm">
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
      <main className="flex-1 ml-56 p-6 max-w-[1400px]">
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
