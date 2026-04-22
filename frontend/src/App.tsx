import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Registros from './pages/Registros'
import Veiculos from './pages/Veiculos'

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <nav className="navbar">
          <div className="navbar-content">
            <Link to="/" className="nav-link">📊 Dashboard</Link>
            <Link to="/registros" className="nav-link">📝 Registros</Link>
            <Link to="/veiculos" className="nav-link">🚛 Veículos</Link>
          </div>
        </nav>
        <div className="main-container">
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