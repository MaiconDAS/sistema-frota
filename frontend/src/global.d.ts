export interface Veiculo {
  id: number
  nome: string
  placa: string
  categoria: string
  categoria_nome: string
}

export interface Categoria {
  id: string
  nome: string
  baixa_performance: number
  normal: number
  alta_performance: number
}

export interface RegistroParcialPayload {
  veiculo_id: number
  horas_trabalhadas: number
  quantidade_atividades: number
  ocorrencia: string
  tempo_parado: number
  observacao: string
  tipo_ocorrencia: string
}

export interface DashboardData {
  periodo: string
  total: number
  media: number
  veiculos: VeiculoDashboard[]
}

export interface VeiculoDashboard {
  id: number
  nome: string
  placa: string
  categoria_nome: string
  total_atividades: number
  media_diaria: number
  performance: string
  dias_inativos: number
  motivos_inatividade: { [key: string]: any }
}

declare global {
  interface Window {
    go: {
      main: {
        App: {
          DashboardCompleto(ano: number, mes: number): Promise<DashboardData>
          DashboardDiario(data: string): Promise<DashboardData>
          ListarVeiculos(): Promise<Veiculo[]>
          ListarCategorias(): Promise<Categoria[]>
          ListarTiposOcorrencia(): Promise<string[]>
          ListarRegistrosParciaisPorData(data: string): Promise<any[]>
          ListarRegistrosParciaisPorPeriodo(dataInicio: string, dataFim: string): Promise<any[]>
          SalvarRegistrosParciais(data: string, registros: RegistroParcialPayload[]): Promise<{msg: string}>
          LimparTodosRegistros(): Promise<{msg: string}>
          CriarVeiculo(nome: string, placa: string, categoria: string): Promise<{msg: string; id: number}>
          AtualizarVeiculo(id: number, nome: string, placa: string, categoria: string): Promise<{msg: string}>
          ExcluirVeiculo(id: number): Promise<{msg: string}>
        }
      }
    }
  }
}

export {}