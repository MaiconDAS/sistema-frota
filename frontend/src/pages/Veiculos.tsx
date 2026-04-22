import { useEffect, useState } from 'react'
import type { Veiculo, Categoria } from '../global'

export default function VeiculosPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [carregando, setCarregando] = useState(true)
  
  const [nome, setNome] = useState('')
  const [placa, setPlaca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const carregarDados = async () => {
    try {
      const [veiculosData, categoriasData] = await Promise.all([
        window.go.main.App.ListarVeiculos(),
        window.go.main.App.ListarCategorias()
      ])
      
      setVeiculos(veiculosData)
      setCategorias(categoriasData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setErro('Erro ao carregar dados')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (!nome.trim()) {
      setErro('Informe o nome do veículo')
      return
    }
    if (!placa.trim()) {
      setErro('Informe a placa do veículo')
      return
    }
    if (!categoria) {
      setErro('Selecione uma categoria')
      return
    }

    try {
      if (editandoId) {
        await window.go.main.App.AtualizarVeiculo(editandoId, nome, placa, categoria)
        setSucesso('Veículo atualizado com sucesso!')
      } else {
        await window.go.main.App.CriarVeiculo(nome, placa, categoria)
        setSucesso('Veículo criado com sucesso!')
      }
      
      setNome('')
      setPlaca('')
      setCategoria('')
      setEditandoId(null)
      await carregarDados()
      
      setTimeout(() => setSucesso(''), 3000)
      
    } catch (error: any) {
      setErro(error?.message || 'Erro ao salvar veículo')
    }
  }

  const handleEditar = (veiculo: Veiculo) => {
    setEditandoId(veiculo.id)
    setNome(veiculo.nome)
    setPlaca(veiculo.placa)
    setCategoria(veiculo.categoria)
    setErro('')
    setSucesso('')
  }

  const handleDeletar = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este veículo? Isso também excluirá todos os registros associados.')) return
    
    try {
      await window.go.main.App.ExcluirVeiculo(id)
      setSucesso('Veículo excluído com sucesso!')
      await carregarDados()
      setTimeout(() => setSucesso(''), 3000)
    } catch (error) {
      alert('Erro ao deletar veículo')
    }
  }

  const handleCancelar = () => {
    setEditandoId(null)
    setNome('')
    setPlaca('')
    setCategoria('')
    setErro('')
    setSucesso('')
  }

  const getPerformanceText = (categoriaId: string) => {
    const cat = categorias.find(c => c.id === categoriaId)
    if (!cat) return ''
    return `Baixo: ${cat.baixa_performance} | Normal: ${cat.normal} | Alto: ${cat.alta_performance}`
  }

  if (carregando) return <div style={{ padding: '32px', textAlign: 'center' }}>Carregando...</div>

  return (
    <div>
      <h1 className="page-title">🚛 Gerenciar Veículos</h1>

      {erro && <div className="alert alert-error">{erro}</div>}
      {sucesso && <div className="alert alert-success">{sucesso}</div>}

      <div className="card">
        <div className="card-title">
          {editandoId ? '✏️ Editar Veículo' : '➕ Novo Veículo'}
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Nome do Veículo *</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="form-input"
                placeholder="Ex: Carreta 01"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Placa *</label>
              <input
                type="text"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                className="form-input"
                placeholder="ABC1234"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Categoria *</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="form-select"
              required
            >
              <option value="">Selecione uma categoria</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
            {categoria && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                Parâmetros: {getPerformanceText(categoria)}
              </p>
            )}
          </div>

          <div className="button-group">
            <button type="submit" className="btn btn-primary">
              {editandoId ? 'Atualizar' : 'Salvar'}
            </button>
            
            {editandoId && (
              <button
                type="button"
                onClick={handleCancelar}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-title">📋 Veículos Cadastrados</div>
        
        {veiculos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
            Nenhum veículo cadastrado.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Placa</th>
                  <th>Categoria</th>
                  <th>Parâmetros</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {veiculos.map(veic => {
                  const cat = categorias.find(c => c.id === veic.categoria)
                  return (
                    <tr key={veic.id}>
                      <td><strong>{veic.nome}</strong></td>
                      <td>{veic.placa}</td>
                      <td>{veic.categoria_nome}</td>
                      <td>
                        {cat && (
                          <span style={{ fontSize: '12px' }}>
                            🔻 ≤{cat.baixa_performance} | ✅ {cat.normal} | ⭐ ≥{cat.alta_performance}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleEditar(veic)}
                          className="btn btn-warning btn-sm"
                          style={{ marginRight: '8px' }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDeletar(veic.id)}
                          className="btn btn-danger btn-sm"
                        >
                          🗑️ Excluir
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}