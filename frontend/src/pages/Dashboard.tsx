import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import type { DashboardData, VeiculoDashboard } from '../global'

export default function Dashboard() {
  const hoje = new Date()

  const [modo, setModo] = useState<'mensal' | 'diario'>('mensal')
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [dia, setDia] = useState(hoje.toISOString().split('T')[0])

  const [dados, setDados] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const carregar = async () => {
    setLoading(true)
    try {
      let result: DashboardData
      if (modo === 'mensal') {
        result = await window.go.main.App.DashboardMensal(ano, mes)
      } else {
        result = await window.go.main.App.DashboardDiario(dia)
      }
      setDados(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [modo, ano, mes, dia])

  const getBadgeClass = (performance: string) => {
    if (!performance) return 'badge'
    if (performance.includes('Baixa')) return 'badge badge-danger'
    if (performance.includes('Alta')) return 'badge badge-warning'
    return 'badge badge-success'
  }

  const getBadgeText = (performance: string) => {
    if (!performance) return 'Sem dados'
    return performance
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
  if (!dados) return <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>Erro ao carregar</div>

  const veiculos = (dados.veiculos || []).map((v: VeiculoDashboard) => ({
    id: v.id,
    nome: v.nome,
    placa: v.placa,
    total: v.total_atividades ?? 0,
    media: v.media_diaria ?? 0,
    performance: v.performance ?? 'Sem dados'
  }))

  const getBarColor = (performance: string) => {
    if (performance.includes('Baixa')) return '#ef4444'
    if (performance.includes('Alta')) return '#eab308'
    return '#22c55e'
  }

  return (
    <div>
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">Tipo de visualização</label>
          <div className="toggle-group">
            <button
              onClick={() => setModo('mensal')}
              className={modo === 'mensal' ? 'toggle-btn toggle-btn-active' : 'toggle-btn toggle-btn-inactive'}
            >
              📅 Mensal
            </button>
            <button
              onClick={() => setModo('diario')}
              className={modo === 'diario' ? 'toggle-btn toggle-btn-active' : 'toggle-btn toggle-btn-inactive'}
            >
              📆 Diário
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">
            {modo === 'mensal' ? 'Mês/Ano' : 'Data específica'}
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {modo === 'mensal' ? (
              <>
                <select
                  value={mes}
                  onChange={e => setMes(Number(e.target.value))}
                  className="form-input"
                  style={{ width: '80px' }}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={ano}
                  onChange={e => setAno(Number(e.target.value))}
                  className="form-input"
                  style={{ width: '100px' }}
                />
              </>
            ) : (
              <input
                type="date"
                value={dia}
                onChange={e => setDia(e.target.value)}
                className="form-input"
                style={{ width: '200px' }}
              />
            )}
          </div>
        </div>

        <button onClick={carregar} className="btn btn-primary">🔄 Atualizar</button>
      </div>

      <div className="grid-3">
        <div className="stat-card stat-card-blue">
          <div className="stat-label">Período</div>
          <div className="stat-value">{dados.periodo || '-'}</div>
        </div>
        <div className="stat-card stat-card-green">
          <div className="stat-label">Total de Atividades</div>
          <div className="stat-value">{dados.total ?? 0}</div>
        </div>
        <div className="stat-card stat-card-yellow">
          <div className="stat-label">Média Geral</div>
          <div className="stat-value">{(dados.media ?? 0).toFixed(2)}</div>
        </div>
      </div>

      <div className="chart-container">
        <div className="card-title">
          {modo === 'mensal' ? '📊 Média Diária por Veículo' : '📊 Total de Atividades por Veículo'}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={veiculos}>
            <XAxis dataKey="nome" />
            <YAxis />
            <Tooltip />
            <Bar dataKey={modo === 'mensal' ? 'media' : 'total'}>
              {veiculos.map((v, i) => (
                <Cell key={i} fill={getBarColor(v.performance)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-title">🚛 Desempenho dos Veículos</div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Veículo</th>
                <th style={{ textAlign: 'center' }}>Total</th>
                <th style={{ textAlign: 'center' }}>Média</th>
                <th style={{ textAlign: 'center' }}>Performance</th>
              </tr>
            </thead>
            <tbody>
              {veiculos.map((v) => (
                <tr key={v.id}>
                  <td>
                    <strong>{v.nome}</strong>
                    <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: '8px' }}>({v.placa})</span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{v.total}</td>
                  <td style={{ textAlign: 'center' }}>{v.media.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={getBadgeClass(v.performance)}>
                      {getBadgeText(v.performance)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}