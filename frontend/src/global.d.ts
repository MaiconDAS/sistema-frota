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

export interface Registro {
  id: number
  veiculo_id: number
  data: string
  quantidade_atividades: number
  motivo_inatividade: string | null
}

export interface RegistroPayload {
  veiculo_id: number
  data: string
  quantidade_atividades: number
  motivo_inatividade: string | null
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
}

declare global {
  interface Window {
    go: {
      main: {
        App: {
          // Dashboard
          DashboardMensal(ano: number, mes: number): Promise<DashboardData>
          DashboardDiario(data: string): Promise<DashboardData>
          
          // Veiculos
          ListarVeiculos(): Promise<Veiculo[]>
          ListarCategorias(): Promise<Categoria[]>
          CriarVeiculo(nome: string, placa: string, categoria: string): Promise<{msg: string; id: number}>
          AtualizarVeiculo(id: number, nome: string, placa: string, categoria: string): Promise<{msg: string}>
          ExcluirVeiculo(id: number): Promise<{msg: string}>
          
          // Registros
          ListarRegistros(): Promise<Registro[]>
          CriarRegistro(data: RegistroPayload): Promise<{msg: string; id: number}>
          AtualizarRegistro(id: number, data: RegistroPayload): Promise<{msg: string}>
          ExcluirRegistro(id: number): Promise<{msg: string}>
        }
      }
    }
  }
}

export {}