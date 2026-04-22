import { useEffect, useState } from 'react'
import type { Veiculo, Registro, RegistroPayload } from '../global'

type RegistroAgrupado = {
  data: string
  dataFormatada: string
  registros: Registro[]
  totalAtividades: number
  totalVeiculos: number
  diasSemana: string
}

function formatarDataBR(dataISO: string): string {
  if (!dataISO) return ''
  const partes = dataISO.split('-')
  if (partes.length !== 3) return dataISO
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function getDataAtualISO(): string {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function getDataAtualBR(): string {
  return formatarDataBR(getDataAtualISO())
}

export default function RegistrosPage() {
  const dataAtualISO = getDataAtualISO()
  const dataAtualBR = getDataAtualBR()

  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])
  const [registrosAgrupados, setRegistrosAgrupados] = useState<RegistroAgrupado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [expandido, setExpandido] = useState<{ data: string; id: number } | null>(null)
  
  const [filtroData, setFiltroData] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState(false)

  // Estado para controle do modal de confirmação
  const [mostrarModalLimpar, setMostrarModalLimpar] = useState(false)
  const [segundaConfirmacao, setSegundaConfirmacao] = useState(false)
  const [limpando, setLimpando] = useState(false)

  // Formulário
  const [veiculoId, setVeiculoId] = useState('')
  const [data, setData] = useState(dataAtualISO)
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const carregarDados = async () => {
    try {
      const [v, r] = await Promise.all([
        window.go.main.App.ListarVeiculos(),
        window.go.main.App.ListarRegistros()
      ])

      setVeiculos(v)
      setRegistros(r)
      
      if (filtroData) {
        const registrosFiltrados = r.filter((reg: Registro) => reg.data === filtroData)
        agruparRegistros(registrosFiltrados)
        setFiltroAtivo(true)
      } else {
        agruparRegistros(r)
        setFiltroAtivo(false)
      }
    } catch (err) {
      setErro('Erro ao carregar dados')
      console.error(err)
    } finally {
      setCarregando(false)
    }
  }

  const agruparRegistros = (registrosList: Registro[]) => {
    const grupos: { [key: string]: Registro[] } = {}
    
    registrosList.forEach(reg => {
      if (!grupos[reg.data]) {
        grupos[reg.data] = []
      }
      grupos[reg.data].push(reg)
    })

    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    
    const agrupado = Object.keys(grupos)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(dataKey => {
        const registrosDoDia = grupos[dataKey]
        const totalAtividades = registrosDoDia.reduce((sum, r) => sum + r.quantidade_atividades, 0)
        const dataObj = new Date(dataKey)
        
        return {
          data: dataKey,
          dataFormatada: formatarDataBR(dataKey),
          diasSemana: diasSemana[dataObj.getDay()],
          registros: registrosDoDia.sort((a, b) => a.veiculo_id - b.veiculo_id),
          totalAtividades,
          totalVeiculos: registrosDoDia.length
        }
      })

    setRegistrosAgrupados(agrupado)
  }

  // Função para limpar todos os registros
  const handleLimparTodosRegistros = async () => {
    if (!segundaConfirmacao) {
      // Primeira confirmação
      setMostrarModalLimpar(true)
      return
    }

    // Segunda confirmação - executar a limpeza
    setLimpando(true)
    setErro('')
    setSucesso('')

    try {
      // Buscar todos os registros atuais
      const todosRegistros = registros
      
      if (todosRegistros.length === 0) {
        setErro('Não há registros para excluir.')
        setMostrarModalLimpar(false)
        setSegundaConfirmacao(false)
        setLimpando(false)
        return
      }

      // Excluir um por um
      let sucessos = 0
      let erros = 0

      for (const registro of todosRegistros) {
        try {
          await window.go.main.App.ExcluirRegistro(registro.id)
          sucessos++
        } catch {
          erros++
        }
      }

      if (erros === 0) {
        setSucesso(`✅ Todos os ${sucessos} registros foram excluídos com sucesso!`)
      } else {
        setSucesso(`⚠️ ${sucessos} registros excluídos, ${erros} falhas.`)
      }

      // Recarregar os dados
      await carregarDados()
      
    } catch (err: any) {
      setErro('Erro ao limpar registros: ' + (err?.message || 'Tente novamente'))
    } finally {
      setLimpando(false)
      setMostrarModalLimpar(false)
      setSegundaConfirmacao(false)
    }
  }

  const cancelarLimpeza = () => {
    setMostrarModalLimpar(false)
    setSegundaConfirmacao(false)
  }

  const iniciarSegundaConfirmacao = () => {
    setSegundaConfirmacao(true)
  }

  useEffect(() => {
    if (registros.length > 0) {
      if (filtroData) {
        const registrosFiltrados = registros.filter(reg => reg.data === filtroData)
        agruparRegistros(registrosFiltrados)
        setFiltroAtivo(true)
      } else {
        agruparRegistros(registros)
        setFiltroAtivo(false)
      }
    }
  }, [filtroData, registros])

  useEffect(() => {
    carregarDados()
  }, [])

  const getVeiculoNome = (id: number) => {
    const v = veiculos.find(v => v.id === id)
    return v ? `${v.nome} (${v.placa})` : 'Desconhecido'
  }

  const handleQuantidadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    if (valor === '' || (/^\d+$/.test(valor) && parseInt(valor) >= 0)) {
      setQuantidade(valor)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (!veiculoId) {
      setErro('Selecione um veículo')
      return
    }

    const qtd = parseInt(quantidade)
    if (isNaN(qtd)) {
      setErro('Informe a quantidade de atividades')
      return
    }

    if (qtd < 0) {
      setErro('A quantidade não pode ser negativa')
      return
    }

    if (qtd === 0 && !motivo.trim()) {
      setErro('Informe o motivo da inatividade (campo obrigatório quando não há atividades)')
      return
    }

    const payload: RegistroPayload = {
      veiculo_id: parseInt(veiculoId),
      data,
      quantidade_atividades: qtd,
      motivo_inatividade: motivo.trim() || null
    }

    try {
      if (editandoId) {
        await window.go.main.App.AtualizarRegistro(editandoId, payload)
        setSucesso('Registro atualizado com sucesso!')
      } else {
        await window.go.main.App.CriarRegistro(payload)
        setSucesso('Registro criado com sucesso!')
      }

      setVeiculoId('')
      setQuantidade('')
      setMotivo('')
      setEditandoId(null)
      setData(dataAtualISO)

      await carregarDados()
      setTimeout(() => setSucesso(''), 3000)
    } catch (err: any) {
      setErro(err?.message || 'Erro ao salvar')
    }
  }

  const handleEditar = (r: Registro) => {
    setEditandoId(r.id)
    setVeiculoId(r.veiculo_id.toString())
    setData(r.data)
    setQuantidade(r.quantidade_atividades.toString())
    setMotivo(r.motivo_inatividade || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExcluir = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return

    try {
      await window.go.main.App.ExcluirRegistro(id)
      setSucesso('Registro excluído com sucesso!')
      await carregarDados()
      setTimeout(() => setSucesso(''), 3000)
    } catch (err) {
      alert('Erro ao excluir')
    }
  }

  const limparFiltro = () => {
    setFiltroData('')
  }

  if (carregando) return <div style={{ padding: '24px', textAlign: 'center' }}>Carregando...</div>

  const quantidadeNum = parseInt(quantidade)
  const mostrarAvisoObrigatorio = !isNaN(quantidadeNum) && quantidadeNum === 0

  return (
    <div>
      {/* Modal de confirmação para limpar todos os registros */}
      {mostrarModalLimpar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            {!segundaConfirmacao ? (
              <>
                <h3 style={{ fontSize: '20px', marginBottom: '16px', color: '#dc2626' }}>⚠️ ATENÇÃO!</h3>
                <p style={{ marginBottom: '16px', lineHeight: '1.5' }}>
                  Você está prestes a <strong>EXCLUIR TODOS OS REGISTROS</strong> do sistema.
                </p>
                <p style={{ marginBottom: '24px', color: '#6b7280', fontSize: '14px' }}>
                  Esta ação é <strong>IRREVERSÍVEL</strong> e todos os dados de atividades serão perdidos permanentemente.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={cancelarLimpeza}
                    className="btn btn-secondary"
                    style={{ backgroundColor: '#9ca3af' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={iniciarSegundaConfirmacao}
                    className="btn btn-danger"
                    style={{ backgroundColor: '#dc2626' }}
                  >
                    Continuar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: '20px', marginBottom: '16px', color: '#dc2626' }}>🔴 ÚLTIMA CONFIRMAÇÃO!</h3>
                <p style={{ marginBottom: '16px', lineHeight: '1.5' }}>
                  <strong>VOCÊ REALMENTE TEM CERTEZA?</strong>
                </p>
                <p style={{ marginBottom: '24px', color: '#6b7280', fontSize: '14px' }}>
                  {registros.length > 0 
                    ? `Serão excluídos ${registros.length} registro(s) permanentemente.`
                    : 'Não há registros para excluir.'
                  }
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={cancelarLimpeza}
                    className="btn btn-secondary"
                    style={{ backgroundColor: '#9ca3af' }}
                  >
                    Não, cancelar
                  </button>
                  <button
                    onClick={handleLimparTodosRegistros}
                    disabled={limpando}
                    className="btn btn-danger"
                    style={{ backgroundColor: '#dc2626' }}
                  >
                    {limpando ? 'Excluindo...' : 'Sim, excluir tudo'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>📝 Registros Diários</h1>
        <button
          onClick={() => setMostrarModalLimpar(true)}
          className="btn btn-danger"
          style={{ backgroundColor: '#dc2626', padding: '10px 20px' }}
          title="Limpar todos os registros"
        >
          🗑️ Limpar Todos os Registros
        </button>
      </div>

      {erro && <div className="alert alert-error">{erro}</div>}
      {sucesso && <div className="alert alert-success">{sucesso}</div>}

      <div className="card">
        <div className="card-title">
          {editandoId ? '✏️ Editar Registro' : '➕ Novo Registro'}
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Veículo *</label>
              <select
                value={veiculoId}
                onChange={(e) => setVeiculoId(e.target.value)}
                className="form-select"
                required
              >
                <option value="">Selecione um veículo</option>
                {veiculos.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.nome} - {v.placa}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Data *</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="form-input"
                required
              />
              <small style={{ fontSize: '11px', color: '#6b7280' }}>
                Hoje é: {dataAtualBR}
              </small>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Quantidade de Atividades * 
              <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                (0 = veículo inativo no dia)
              </span>
            </label>
            <input
              type="number"
              placeholder="0"
              value={quantidade}
              onChange={handleQuantidadeChange}
              className="form-input"
              min="0"
              step="1"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Observação 
              {mostrarAvisoObrigatorio && <span style={{ color: 'red', marginLeft: '8px' }}>* Obrigatório quando não há atividades</span>}
              {!mostrarAvisoObrigatorio && <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>(Opcional)</span>}
            </label>
            <textarea
              placeholder={
                mostrarAvisoObrigatorio 
                  ? "⚠️ OBRIGATÓRIO: Informe o motivo da inatividade (manutenção, quebrado, sem motorista, etc.)"
                  : "Opcional: Adicione observações sobre as atividades (ex: pane elétrica, problemas mecânicos, etc.)"
              }
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="form-textarea"
              rows={3}
              style={{ 
                borderColor: mostrarAvisoObrigatorio && !motivo.trim() ? '#ef4444' : '',
                backgroundColor: mostrarAvisoObrigatorio && !motivo.trim() ? '#fef2f2' : ''
              }}
            />
            {mostrarAvisoObrigatorio && !motivo.trim() && (
              <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                ⚠️ Campo obrigatório! Informe por que o veículo não teve atividades hoje.
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
                onClick={() => {
                  setEditandoId(null)
                  setVeiculoId('')
                  setQuantidade('')
                  setMotivo('')
                }}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="filter-bar" style={{ marginBottom: '16px' }}>
          <div className="filter-group">
            <label className="filter-label">🔍 Filtrar por data:</label>
            <input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="form-input"
              style={{ width: '200px' }}
            />
          </div>
          {filtroAtivo && (
            <button onClick={limparFiltro} className="btn btn-secondary btn-sm">
              ✖️ Limpar filtro
            </button>
          )}
        </div>

        {filtroAtivo && (
          <div style={{ marginBottom: '16px', backgroundColor: '#dbeafe', padding: '8px 12px', borderRadius: '8px' }}>
            📅 Mostrando registros apenas do dia {formatarDataBR(filtroData)}
          </div>
        )}

        {registrosAgrupados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
            <p>{filtroAtivo ? `Nenhum registro encontrado para ${formatarDataBR(filtroData)}` : 'Nenhum registro encontrado'}</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Comece cadastrando seu primeiro registro acima</p>
          </div>
        ) : (
          registrosAgrupados.map((grupo) => (
            <div key={grupo.data} style={{ marginBottom: '24px' }}>
              <div style={{ 
                backgroundColor: '#f9fafb', 
                padding: '12px 16px', 
                borderRadius: '8px',
                marginBottom: '12px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '16px' }}>{grupo.dataFormatada}</strong>
                    <span style={{ marginLeft: '12px', fontSize: '12px', color: '#6b7280' }}>
                      {grupo.diasSemana}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', backgroundColor: '#dbeafe', padding: '4px 8px', borderRadius: '20px' }}>
                    📅 {grupo.data}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {grupo.totalVeiculos} veículo(s) • {grupo.totalAtividades} atividade(s)
                </div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th>Veículo</th>
                      <th style={{ textAlign: 'center', width: '100px' }}>Atividades</th>
                      <th>Observação</th>
                      <th style={{ textAlign: 'center', width: '100px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.registros.map((reg) => {
                      const isExpandido = expandido?.data === grupo.data && expandido?.id === reg.id
                      const temObservacao = reg.motivo_inatividade && reg.motivo_inatividade.trim() !== ''
                      const isInativo = reg.quantidade_atividades === 0
                      
                      return (
                        <tr key={reg.id} style={{ backgroundColor: isInativo ? '#fef2f2' : 'transparent' }}>
                          <td>
                            <strong>{getVeiculoNome(reg.veiculo_id)}</strong>
                            {isInativo && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#ef4444' }}>(Inativo)</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={isInativo ? 'badge badge-danger' : 'badge badge-success'}>
                              {reg.quantidade_atividades}
                            </span>
                          </td>
                          <td>
                            {temObservacao ? (
                              <div>
                                <button
                                  onClick={() => setExpandido(isExpandido ? null : { data: grupo.data, id: reg.id })}
                                  className="btn btn-warning btn-sm"
                                >
                                  💬 {isExpandido ? 'Ocultar' : 'Ver observação'}
                                </button>
                                {isExpandido && (
                                  <div style={{ 
                                    marginTop: '8px', 
                                    padding: '8px', 
                                    backgroundColor: '#f3f4f6', 
                                    borderRadius: '6px',
                                    fontSize: '13px'
                                  }}>
                                    {reg.motivo_inatividade}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => handleEditar(reg)}
                              className="btn btn-warning btn-sm"
                              style={{ marginRight: '8px' }}
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleExcluir(reg.id)}
                              className="btn btn-danger btn-sm"
                              title="Excluir"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="card-footer">
                Total do dia: {grupo.totalAtividades} atividades em {grupo.totalVeiculos} veículos
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}