import { useEffect, useState } from 'react'

export default function VeiculosPage() {
  const [veiculos, setVeiculos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')
  const [placa, setPlaca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [mensagem, setMensagem] = useState('')

  const carregarDados = async () => {
    try {
      const [v, c] = await Promise.all([
        window.go.main.App.ListarVeiculos(),
        window.go.main.App.ListarCategorias()
      ])
      setVeiculos(v)
      setCategorias(c)
    } catch (err) {
      console.error(err)
      setMensagem('Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome || !placa || !categoria) {
      setMensagem('Preencha todos os campos')
      return
    }
    
    try {
      if (editandoId) {
        await window.go.main.App.AtualizarVeiculo(editandoId, nome, placa, categoria)
        setMensagem('Veículo atualizado!')
      } else {
        await window.go.main.App.CriarVeiculo(nome, placa, categoria)
        setMensagem('Veículo criado!')
      }
      setNome('')
      setPlaca('')
      setCategoria('')
      setEditandoId(null)
      await carregarDados()
      setTimeout(() => setMensagem(''), 3000)
    } catch (err: any) {
      setMensagem('Erro: ' + err.message)
    }
  }

  const handleEditar = (v: any) => {
    setEditandoId(v.id)
    setNome(v.nome)
    setPlaca(v.placa)
    setCategoria(v.categoria)
  }

  const handleExcluir = async (id: number) => {
    if (!confirm('Excluir veículo?')) return
    try {
      await window.go.main.App.ExcluirVeiculo(id)
      setMensagem('Veículo excluído!')
      await carregarDados()
      setTimeout(() => setMensagem(''), 3000)
    } catch (err) {
      alert('Erro ao excluir')
    }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div>

  return (
    <div>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>🚛 Gerenciar Veículos</h1>
      
      {mensagem && (
        <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '8px', background: '#dcfce7', color: '#15803d' }}>
          {mensagem}
        </div>
      )}
      
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>{editandoId ? '✏️ Editar' : '➕ Novo Veículo'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <input type="text" placeholder="Nome do Veículo" value={nome} onChange={e => setNome(e.target.value)} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px' }} required />
            <input type="text" placeholder="Placa" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px' }} required />
          </div>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', marginBottom: '16px' }} required>
            <option value="">Selecione a categoria</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{editandoId ? 'Atualizar' : 'Salvar'}</button>
            {editandoId && <button type="button" onClick={() => { setEditandoId(null); setNome(''); setPlaca(''); setCategoria('') }} style={{ padding: '10px 20px', background: '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>}
          </div>
        </form>
      </div>
      
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>📋 Veículos Cadastrados</h2>
        {veiculos.length === 0 ? <p>Nenhum veículo cadastrado.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Nome</th><th style={{ padding: '12px', textAlign: 'left' }}>Placa</th><th style={{ padding: '12px', textAlign: 'left' }}>Categoria</th><th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {veiculos.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}><strong>{v.nome}</strong></td><td style={{ padding: '12px' }}>{v.placa}</td><td style={{ padding: '12px' }}>{v.categoria_nome}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}><button onClick={() => handleEditar(v)} style={{ marginRight: '8px', padding: '4px 12px', background: '#eab308', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Editar</button><button onClick={() => handleExcluir(v.id)} style={{ padding: '4px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Excluir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}