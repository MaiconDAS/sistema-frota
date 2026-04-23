import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Dashboard() {
  const hoje = new Date()
  const [modo, setModo] = useState<'mensal' | 'diario'>('mensal')
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [dia, setDia] = useState(hoje.toISOString().split('T')[0])
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [veiculosExpandidos, setVeiculosExpandidos] = useState<Set<number>>(new Set())

  const formatarDataBR = (dataISO: string) => {
    if (!dataISO || dataISO.length < 10) return dataISO || ''
    const dataLimpa = dataISO.split('T')[0]
    const partes = dataLimpa.split('-')
    if (partes.length !== 3) return dataISO
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }

  const carregar = async () => {
    setLoading(true)
    try {
      let result
      if (modo === 'mensal') {
        result = await window.go.main.App.DashboardCompleto(ano, mes)
      } else {
        result = await window.go.main.App.DashboardDiario(dia)
      }
      setDados(result)
      setVeiculosExpandidos(new Set())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [modo, ano, mes, dia])

  const toggleExpandir = (id: number) => {
    const novosExpandidos = new Set(veiculosExpandidos)
    if (novosExpandidos.has(id)) {
      novosExpandidos.delete(id)
    } else {
      novosExpandidos.add(id)
    }
    setVeiculosExpandidos(novosExpandidos)
  }

  const exportarPDF = async () => {
    if (!dados) return

    const doc = new jsPDF()
    const dataAtual = new Date().toLocaleDateString('pt-BR')
    
    let registrosDetalhados: any[] = []
    try {
      if (modo === 'mensal') {
        const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
        const ultimoDia = new Date(ano, mes, 0).getDate()
        const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`
        registrosDetalhados = await window.go.main.App.ListarRegistrosParciaisPorPeriodo(dataInicio, dataFim)
      } else {
        registrosDetalhados = await window.go.main.App.ListarRegistrosParciaisPorData(dia)
      }
    } catch (err) {
      console.error('Erro ao buscar registros detalhados:', err)
    }
    
    const registrosPorVeiculo: Record<number, any> = {}
    for (const reg of registrosDetalhados) {
      const veiculoId = reg.veiculo_id
      if (!registrosPorVeiculo[veiculoId]) {
        registrosPorVeiculo[veiculoId] = {
          nome: reg.veiculo_nome,
          placa: reg.veiculo_placa,
          totalHorasTrabalhadas: 0,
          totalHorasParado: 0,
          totalAtividades: 0,
          observacoes: []
        }
      }
      registrosPorVeiculo[veiculoId].totalHorasTrabalhadas += reg.horas_trabalhadas || 0
      registrosPorVeiculo[veiculoId].totalHorasParado += reg.tempo_parado || 0
      registrosPorVeiculo[veiculoId].totalAtividades += reg.quantidade_atividades || 0
      if (reg.observacao && reg.observacao.trim() !== '') {
        registrosPorVeiculo[veiculoId].observacoes.push({
          data: reg.data,
          observacao: reg.observacao,
          tipo: reg.tipo_ocorrencia
        })
      }
    }
    
    doc.setFontSize(18)
    doc.setTextColor(37, 99, 235)
    doc.text('Sistema de Gestão de Frota', 14, 20)
    
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text(`Relatório de Performance - ${modo === 'mensal' ? 'Mensal' : 'Diário'}`, 14, 35)
    
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Período: ${dados.periodo}`, 14, 45)
    doc.text(`Data de emissão: ${dataAtual}`, 14, 52)
    
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text('Resumo Geral', 14, 65)
    
    autoTable(doc, {
      startY: 70,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total de Atividades', dados.total.toString()],
        ['Média Geral', dados.media.toFixed(2)],
        ['Total de Veículos', dados.veiculos?.length.toString() || '0'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      margin: { left: 14 },
    })
    
    let finalY = (doc as any).lastAutoTable.finalY + 10
    doc.text('Desempenho dos Veículos', 14, finalY)
    
    const tabelaBody = dados.veiculos?.map((v: any) => {
      const veicReg = registrosPorVeiculo[v.id]
      const horasTrab = veicReg ? veicReg.totalHorasTrabalhadas.toFixed(1) : '0'
      const horasParado = veicReg ? veicReg.totalHorasParado.toFixed(1) : '0'
      return [
        v.nome,
        v.placa,
        v.categoria_nome,
        v.total_atividades.toString(),
        v.media_diaria.toFixed(2),
        `${horasTrab}h`,
        `${horasParado}h`,
        v.dias_inativos.toString(),
        v.performance
      ]
    }) || []
    
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Veículo', 'Placa', 'Categoria', 'Atividades', 'Média', 'Horas Trab.', 'Horas Parado', 'Dias c/ Ocorrência', 'Performance']],
      body: tabelaBody,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      margin: { left: 14 },
      styles: { fontSize: 8 },
    })
    
    finalY = (doc as any).lastAutoTable.finalY + 10
    
    const observacoesComTexto = Object.values(registrosPorVeiculo).filter((veic: any) => veic.observacoes.length > 0)
    if (observacoesComTexto.length > 0) {
      doc.text('Observações por Veículo', 14, finalY)
      
      let currentY = finalY + 5
      for (const veic of observacoesComTexto) {
        currentY += 5
        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        doc.text(`${veic.nome} (${veic.placa})`, 14, currentY)
        currentY += 5
        
        const observacoesList = veic.observacoes.map((obs: any) => [
          formatarDataBR(obs.data),
          obs.tipo || '-',
          obs.observacao
        ])
        
        autoTable(doc, {
          startY: currentY,
          head: [['Data', 'Tipo de Ocorrência', 'Observação']],
          body: observacoesList,
          theme: 'striped',
          headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0] },
          margin: { left: 20 },
          styles: { fontSize: 8 },
        })
        currentY = (doc as any).lastAutoTable.finalY + 5
      }
    }
    
    finalY = (doc as any).lastAutoTable?.finalY + 15 || finalY + 15
    
    let totalHorasTrabalhadasGeral = 0
    let totalHorasParadoGeral = 0
    for (const veic of Object.values(registrosPorVeiculo) as any[]) {
      totalHorasTrabalhadasGeral += veic.totalHorasTrabalhadas
      totalHorasParadoGeral += veic.totalHorasParado
    }
    const totalHoras = totalHorasTrabalhadasGeral + totalHorasParadoGeral
    const produtividade = totalHoras > 0 ? (totalHorasTrabalhadasGeral / totalHoras) * 100 : 0
    
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Resumo de Horas no Período:`, 14, finalY)
    doc.text(`• Total de Horas Trabalhadas: ${totalHorasTrabalhadasGeral.toFixed(1)}h`, 14, finalY + 6)
    doc.text(`• Total de Horas Paradas: ${totalHorasParadoGeral.toFixed(1)}h`, 14, finalY + 12)
    doc.text(`• Percentual de Produtividade: ${produtividade.toFixed(1)}%`, 14, finalY + 18)
    
    doc.save(`relatorio_frota_${dados.periodo.replace(/\//g, '_')}.pdf`)
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando Dashboard...</div>
  if (!dados) return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>Erro ao carregar dados</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>📊 Dashboard</h1>
        <button 
          onClick={exportarPDF}
          style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          📄 Exportar Relatório PDF
        </button>
      </div>
      
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Tipo</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setModo('mensal')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: modo === 'mensal' ? '#2563eb' : '#e5e7eb', color: modo === 'mensal' ? 'white' : '#4b5563' }}>📅 Mensal</button>
              <button onClick={() => setModo('diario')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: modo === 'diario' ? '#2563eb' : '#e5e7eb', color: modo === 'diario' ? 'white' : '#4b5563' }}>📆 Diário</button>
            </div>
          </div>
          
          {modo === 'mensal' ? (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Mês/Ano</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={mes} onChange={e => setMes(Number(e.target.value))} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="number" value={ano} onChange={e => setAno(Number(e.target.value))} style={{ width: '80px', padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
              </div>
            </div>
          ) : (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Data</label>
              <input type="date" value={dia} onChange={e => setDia(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
            </div>
          )}
          
          <button onClick={carregar} style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Atualizar</button>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Período</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dados.periodo}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #22c55e' }}>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Atividades</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dados.total}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #eab308' }}>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Média Geral</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dados.media.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>🚛 Desempenho dos Veículos</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Veículo</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Atividades</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Média</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Dias c/ Ocorrência</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Performance</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Ocorrências</th>
              </tr>
            </thead>
            <tbody>
              {dados.veiculos?.map((v: any) => {
                const temMotivos = v.motivos_inatividade && Object.keys(v.motivos_inatividade).length > 0
                const isExpandido = veiculosExpandidos.has(v.id)
                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>
                      <strong>{v.nome}</strong>
                      <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: '8px' }}>({v.placa})</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{v.total_atividades}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{v.media_diaria.toFixed(2)}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: v.dias_inativos > 5 ? '#ef4444' : '#1f2937' }}>{v.dias_inativos}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '20px', 
                        fontSize: '12px',
                        background: v.performance === 'Baixa Performance' ? '#fee2e2' : v.performance === 'Alta Performance' ? '#dcfce7' : '#fef3c7',
                        color: v.performance === 'Baixa Performance' ? '#b91c1c' : v.performance === 'Alta Performance' ? '#15803d' : '#b45309'
                      }}>
                        {v.performance}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {temMotivos ? (
                        <div>
                          <button 
                            onClick={() => toggleExpandir(v.id)}
                            style={{ padding: '4px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            {isExpandido ? '🔽 Ocultar ocorrências' : '▶️ Ver ocorrências'}
                          </button>
                          {isExpandido && (
                            <div style={{ marginTop: '8px', padding: '8px', background: '#f3f4f6', borderRadius: '8px' }}>
                              {Object.entries(v.motivos_inatividade).map(([motivo, dadosEvento]: [string, any]) => {
                                if (Array.isArray(dadosEvento)) {
                                  return (
                                    <div key={motivo} style={{ marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                                      <div style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '4px' }}>{motivo}</div>
                                      <div style={{ fontSize: '12px', color: '#4b5563' }}>
                                        Datas: {dadosEvento.map((data: string) => formatarDataBR(data)).join(', ')}
                                      </div>
                                    </div>
                                  )
                                } else {
                                  return (
                                    <div key={motivo} style={{ marginBottom: '8px', padding: '4px 0', borderBottom: '1px solid #e5e7eb' }}>
                                      <strong>{motivo}:</strong> {dadosEvento}
                                    </div>
                                  )
                                }
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '13px' }}>Nenhuma ocorrência registrada</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div style={{ marginTop: '16px', background: '#f3f4f6', borderRadius: '12px', padding: '16px', fontSize: '13px', color: '#6b7280' }}>
        <strong>📌 Legenda:</strong><br />
        • <strong>Dias com Ocorrência:</strong> Dias em que o veículo teve alguma ocorrência (pane, falha, etc.)<br />
        • <strong>Performance:</strong> Baseada na média de atividades comparada à categoria do veículo<br />
        • <strong>Clique em "Ver ocorrências"</strong> para detalhar os tipos e datas das ocorrências
      </div>
    </div>
  )
}