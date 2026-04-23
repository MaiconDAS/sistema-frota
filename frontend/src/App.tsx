import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Registros from './pages/Registros'
import Veiculos from './pages/Veiculos'

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
        <nav style={{ backgroundColor: 'white', padding: '12px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', gap: '32px' }}>
            <Link to="/" style={{ color: '#4b5563', textDecoration: 'none', fontWeight: 500 }}>📊 Dashboard</Link>
            <Link to="/registros" style={{ color: '#4b5563', textDecoration: 'none', fontWeight: 500 }}>📝 Registros</Link>
            <Link to="/veiculos" style={{ color: '#4b5563', textDecoration: 'none', fontWeight: 500 }}>🚛 Veículos</Link>
          </div>
        </nav>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/registros" element={<Registros />} />
            <Route path="/veiculos" element={<Veiculos />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App