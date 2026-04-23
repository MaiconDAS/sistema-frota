import { useEffect, useState } from 'react'

export default function RegistrosPage() {
  const hoje = new Date()
  const dataAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

  const [veiculos, setVeiculos] = useState<any[]>([])
  const [tiposOcorrencia, setTiposOcorrencia] = useState<string[]>([])
  const [registros, setRegistros] = useState<any[]>([])
  const [dataSelecionada, setDataSelecionada] = useState(dataAtual)
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erroDetalhado, setErroDetalhado] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [segundaConfirmacao, setSegundaConfirmacao] = useState(false)
  const [limpando, setLimpando] = useState(false)

  const carregarDados = async () => {
    setLoading(true)
    setErroDetalhado('')
    try {
      if (!window.go || !window.go.main || !window.go.main.App) {
        setErroDetalhado('Conexão com o backend não estabelecida')
        setLoading(false)
        return
      }

      // Carregar veículos
      let veiculosData: any[] = []
      try {
        const result = await window.go.main.App.ListarVeiculos()
        veiculosData = result && Array.isArray(result) ? result : []
      } catch (err) {
        console.error('Erro ao carregar veículos:', err)
        setErroDetalhado('Erro ao carregar veículos: ' + String(err))
        veiculosData = []
      }
      setVeiculos(veiculosData)
      
      // Carregar tipos de ocorrência
      let tiposData: string[] = []
      try {
        const result = await window.go.main.App.ListarTiposOcorrencia()
        tiposData = result && Array.isArray(result) ? result : ["Nenhuma", "Falha Mecânica", "Pane Elétrica", "Problema nos Freios", "Problema no Motor", "Pneu furado", "Acidente leve", "Outro"]
      } catch (err) {
        console.error('Erro ao carregar tipos:', err)
        tiposData = ["Nenhuma", "Falha Mecânica", "Pane Elétrica", "Problema nos Freios", "Problema no Motor", "Pneu furado", "Acidente leve", "Outro"]
      }
      setTiposOcorrencia(tiposData)
      
      // Carregar registros da data
      let registrosData: any[] = []
      try {
        const result = await window.go.main.App.ListarRegistrosParciaisPorData(dataSelecionada)
        registrosData = result && Array.isArray(result) ? result : []
      } catch (err) {
        console.error('Erro ao carregar registros:', err)
        registrosData = []
      }
      
      const mapRegistros: any = {}
      if (registrosData && Array.isArray(registrosData)) {
        registrosData.forEach((reg: any) => { 
          if (reg && reg.veiculo_id) {
            mapRegistros[reg.veiculo_id] = reg 
          }
        })
      }
      
      const lista = (veiculosData || []).map((veic: any) => {
        const existente = mapRegistros[veic.id]
        return {
          veiculo_id: veic.id,
          veiculo_nome: veic.nome,
          horas_trabalhadas: existente?.horas_trabalhadas ?? 8,
          quantidade_atividades: existente?.quantidade_atividades ?? 0,
          ocorrencia: existente?.ocorrencia ?? '',
          tempo_parado: existente?.tempo_parado ?? 0,
          observacao: existente?.observacao ?? '',
          tipo_ocorrencia: existente?.tipo_ocorrencia ?? 'Nenhuma'
        }
      })
      
      setRegistros(lista)
    } catch (err) {
      console.error('Erro geral:', err)
      setErroDetalhado('Erro ao carregar dados: ' + String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [dataSelecionada])

  const handleSalvar = async () => {
    setLoading(true)
    setMensagem('')
    
    const payload = registros.map(r => ({
      veiculo_id: r.veiculo_id,
      horas_trabalhadas: r.horas_trabalhadas,
      quantidade_atividades: r.quantidade_atividades,
      ocorrencia: r.ocorrencia,
      tempo_parado: r.tempo_parado,
      observacao: r.observacao,
      tipo_ocorrencia: r.tipo_ocorrencia
    }))
    
    try {
      const result: any = await window.go.main.App.SalvarRegistrosParciais(dataSelecionada, payload)
      if (result && result.error) {
        setMensagem('❌ ' + result.error)
      } else {
        setMensagem('✅ Registros salvos com sucesso!')
        setTimeout(() => setMensagem(''), 3000)
        await carregarDados()
      }
    } catch (err: any) {
      setMensagem('❌ Erro ao salvar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const atualizarRegistro = (id: number, campo: string, valor: any) => {
    setRegistros(prev => prev.map(r => r.veiculo_id === id ? { ...r, [campo]: valor } : r))
  }

  const handleLimparTodosRegistros = async () => {
    setLimpando(true)
    try {
      const result: any = await window.go.main.App.LimparTodosRegistros()
      if (result && result.error) {
        setMensagem('❌ ' + result.error)
      } else {
        setMensagem('🗑️ TODOS OS REGISTROS foram excluídos permanentemente!')
        setTimeout(() => setMensagem(''), 4000)
        await carregarDados()
      }
    } catch (err: any) {
      setMensagem('❌ Erro ao limpar registros: ' + err.message)
    } finally {
      setLimpando(false)
      setMostrarModal(false)
      setSegundaConfirmacao(false)
    }
  }

  const iniciarLimpeza = () => {
    setMostrarModal(true)
    setSegundaConfirmacao(false)
  }

  const cancelarLimpeza = () => {
    setMostrarModal(false)
    setSegundaConfirmacao(false)
  }

  const confirmarPrimeira = () => {
    setSegundaConfirmacao(true)
  }

  const formatarDataBR = (dataISO: string) => {
    if (!dataISO) return ''
    const partes = dataISO.split('-')
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  if (loading && veiculos.length === 0 && !erroDetalhado) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div>
  }

  return (
    <div>
      {mostrarModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', padding: '28px',
            maxWidth: '500px', width: '90%', textAlign: 'center'
          }}>
            {!segundaConfirmacao ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#dc2626' }}>ATENÇÃO! AÇÃO IRREVERSÍVEL</h2>
                <p style={{ marginBottom: '16px', lineHeight: '1.5' }}>Você está prestes a <strong style={{ color: '#dc2626' }}>EXCLUIR TODOS OS REGISTROS</strong> de <strong>TODAS AS DATAS</strong>.</p>
                <p style={{ marginBottom: '24px', fontSize: '14px', background: '#fef2f2', padding: '12px', borderRadius: '8px' }}>
                  🚨 <strong>ESTA AÇÃO NÃO PODE SER DESFEITA!</strong> 🚨
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button onClick={cancelarLimpeza} style={{ padding: '10px 24px', background: '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={confirmarPrimeira} style={{ padding: '10px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Continuar</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔴</div>
                <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#dc2626' }}>ÚLTIMA CONFIRMAÇÃO!</h2>
                <p style={{ marginBottom: '16px' }}><strong>VOCÊ REALMENTE TEM CERTEZA?</strong></p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button onClick={cancelarLimpeza} style={{ padding: '10px 24px', background: '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Não, Cancelar</button>
                  <button onClick={handleLimparTodosRegistros} disabled={limpando} style={{ padding: '10px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{limpando ? 'Excluindo...' : 'Sim, Excluir Tudo'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>📝 Registros Diários</h1>
        <button onClick={iniciarLimpeza} style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🗑️ Apagar Todos os Registros</button>
      </div>
      
      {erroDetalhado && (
        <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c' }}>
          ⚠️ {erroDetalhado}
        </div>
      )}
      
      {mensagem && (
        <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '8px', background: mensagem.includes('✅') ? '#dcfce7' : '#fee2e2', color: mensagem.includes('✅') ? '#15803d' : '#b91c1c' }}>
          {mensagem}
        </div>
      )}
      
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>DATA</label>
            <input type="date" value={dataSelecionada} onChange={e => setDataSelecionada(e.target.value)} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '8px' }} />
          </div>
          <button onClick={carregarDados} style={{ padding: '8px 16px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🔄 Carregar</button>
          <button onClick={handleSalvar} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }} disabled={loading}>💾 Salvar Todos</button>
        </div>
        
        {loading && <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>}
        
        {!loading && veiculos.length === 0 && !erroDetalhado && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <p>Nenhum veículo cadastrado.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Vá até a aba "Veículos" e cadastre um veículo para começar.</p>
          </div>
        )}
        
        {!loading && veiculos.length > 0 && !erroDetalhado && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Veículo</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '100px' }}>Horas Trabalhadas</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '100px' }}>Atividades</th>
                  <th style={{ padding: '12px', textAlign: 'left', width: '180px' }}>Tipo de Ocorrência</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '100px' }}>Horas Parado</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Observação</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((reg) => {
                  const temOcorrencia = reg.tipo_ocorrencia && reg.tipo_ocorrencia !== 'Nenhuma'
                  return (
                    <tr key={reg.veiculo_id} style={{ borderBottom: '1px solid #e5e7eb', background: temOcorrencia ? '#fef2f2' : 'transparent' }}>
                      <td style={{ padding: '12px' }}><strong>{reg.veiculo_nome}</strong></td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input type="number" step="0.5" min="0" max="24" value={reg.horas_trabalhadas} onChange={e => atualizarRegistro(reg.veiculo_id, 'horas_trabalhadas', parseFloat(e.target.value) || 0)} style={{ width: '80px', padding: '6px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input type="number" min="0" value={reg.quantidade_atividades} onChange={e => atualizarRegistro(reg.veiculo_id, 'quantidade_atividades', parseInt(e.target.value) || 0)} style={{ width: '70px', padding: '6px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select value={reg.tipo_ocorrencia} onChange={e => atualizarRegistro(reg.veiculo_id, 'tipo_ocorrencia', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                          {tiposOcorrencia.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input type="number" step="0.5" min="0" max="24" value={reg.tempo_parado} onChange={e => atualizarRegistro(reg.veiculo_id, 'tempo_parado', parseFloat(e.target.value) || 0)} style={{ width: '80px', padding: '6px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input type="text" placeholder="Detalhes da ocorrência..." value={reg.observacao} onChange={e => atualizarRegistro(reg.veiculo_id, 'observacao', e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div style={{ background: '#f3f4f6', borderRadius: '12px', padding: '16px', fontSize: '13px', color: '#6b7280' }}>
        <strong>📌 Instruções:</strong><br />
        • <strong>Horas Trabalhadas:</strong> Quantas horas o veículo operou no dia (0-24)<br />
        • <strong>Atividades:</strong> Número de atividades realizadas<br />
        • <strong>Tipo de Ocorrência:</strong> Se houve pane ou problema, selecione o tipo<br />
        • <strong>Horas Parado:</strong> Tempo que o veículo ficou parado devido à ocorrência<br />
        • <strong>Observação:</strong> Detalhes adicionais sobre a ocorrência
      </div>
    </div>
  )
}