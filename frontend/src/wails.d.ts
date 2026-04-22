declare global {
  interface Window {
    go: {
      main: {
        App: {
          // Dashboard
          DashboardMensal(ano: number, mes: number): Promise<import('./types').DashboardData>
          DashboardDiario(data: string): Promise<import('./types').DashboardData>
          
          // Veiculos
          ListarVeiculos(): Promise<import('./types').Veiculo[]>
          ListarCategorias(): Promise<import('./types').Categoria[]>
          CriarVeiculo(nome: string, placa: string, categoria: string): Promise<{msg: string; id: number}>
          AtualizarVeiculo(id: number, nome: string, placa: string, categoria: string): Promise<{msg: string}>
          ExcluirVeiculo(id: number): Promise<{msg: string}>
          
          // Registros
          ListarRegistros(): Promise<import('./types').Registro[]>
          CriarRegistro(data: import('./types').RegistroPayload): Promise<{msg: string; id: number}>
          AtualizarRegistro(id: number, data: import('./types').RegistroPayload): Promise<{msg: string}>
          ExcluirRegistro(id: number): Promise<{msg: string}>
        }
      }
    }
  }
}

export {}