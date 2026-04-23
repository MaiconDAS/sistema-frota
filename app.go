package main

import (
    "context"
    "database/sql"
    "fmt"
    "os"
    "path/filepath"
    "strconv"
    
    _ "modernc.org/sqlite"
)

type App struct {
    db *sql.DB
    ctx context.Context
}

type Veiculo struct {
    ID        int64
    Nome      string
    Placa     string
    Categoria string
}

var TiposOcorrencia = []string{
    "Nenhuma",
    "Falha Mecânica",
    "Pane Elétrica",
    "Problema nos Freios",
    "Problema no Motor",
    "Pneu furado",
    "Acidente leve",
    "Outro",
}

type Categoria struct {
    ID               string `json:"id"`
    Nome             string `json:"nome"`
    BaixaPerformance int    `json:"baixa_performance"`
    Normal           int    `json:"normal"`
    AltaPerformance  int    `json:"alta_performance"`
}

var categoriasMap = map[string]Categoria{
    "cacamba_17_25": {
        ID:               "cacamba_17_25",
        Nome:             "Caçamba 17/25m³",
        BaixaPerformance: 2,
        Normal:           3,
        AltaPerformance:  4,
    },
    "cacamba_17": {
        ID:               "cacamba_17",
        Nome:             "Caçamba 17m³",
        BaixaPerformance: 4,
        Normal:           5,
        AltaPerformance:  6,
    },
    "cacamba_3": {
        ID:               "cacamba_3",
        Nome:             "Caçamba 3m³",
        BaixaPerformance: 5,
        Normal:           6,
        AltaPerformance:  7,
    },
    "carroceria": {
        ID:               "carroceria",
        Nome:             "Carroceria",
        BaixaPerformance: 3,
        Normal:           4,
        AltaPerformance:  5,
    },
    "carroceria_pequena": {
        ID:               "carroceria_pequena",
        Nome:             "Carroceria pequena",
        BaixaPerformance: 5,
        Normal:           6,
        AltaPerformance:  7,
    },
}

type DashboardResponse struct {
    Periodo  string             `json:"periodo"`
    Total    int                `json:"total"`
    Media    float64            `json:"media"`
    Veiculos []VeiculoDashboard `json:"veiculos"`
}

type VeiculoDashboard struct {
    ID                 int64                  `json:"id"`
    Nome               string                 `json:"nome"`
    Placa              string                 `json:"placa"`
    CategoriaNome      string                 `json:"categoria_nome"`
    TotalAtividades    int                    `json:"total_atividades"`
    MediaDiaria        float64                `json:"media_diaria"`
    Performance        string                 `json:"performance"`
    DiasInativos       int                    `json:"dias_inativos"`
    MotivosInatividade map[string]interface{} `json:"motivos_inatividade"`
}

type RegistroParcialPayload struct {
    VeiculoID            int64   `json:"veiculo_id"`
    HorasTrabalhadas     float64 `json:"horas_trabalhadas"`
    QuantidadeAtividades int     `json:"quantidade_atividades"`
    Ocorrencia           string  `json:"ocorrencia"`
    TempoParado          float64 `json:"tempo_parado"`
    Observacao           string  `json:"observacao"`
    TipoOcorrencia       string  `json:"tipo_ocorrencia"`
}

func NewApp() *App {
    return &App{}
}

func (a *App) Startup(ctx context.Context) {
    a.ctx = ctx

    userDir, err := os.UserConfigDir()
    if err != nil {
        panic(err.Error())
    }

    appDir := filepath.Join(userDir, "SistemaFrota")
    os.MkdirAll(appDir, 0755)
    dbPath := filepath.Join(appDir, "database.db")

    fmt.Println("Banco de dados em:", dbPath)

    db, err := sql.Open("sqlite", dbPath)
    if err != nil {
        panic(err.Error())
    }

    createVeiculosTable := `
    CREATE TABLE IF NOT EXISTS veiculos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        placa TEXT NOT NULL UNIQUE,
        categoria TEXT NOT NULL
    );`
    db.Exec(createVeiculosTable)

    createRegistrosTable := `
    CREATE TABLE IF NOT EXISTS registros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        veiculo_id INTEGER NOT NULL,
        data TEXT NOT NULL,
        horas_trabalhadas REAL DEFAULT 0,
        quantidade_atividades INTEGER DEFAULT 0,
        ocorrencia TEXT,
        tempo_parado REAL DEFAULT 0,
        observacao TEXT,
        tipo_ocorrencia TEXT,
        FOREIGN KEY(veiculo_id) REFERENCES veiculos(id)
    );`
    db.Exec(createRegistrosTable)

    a.db = db
}

func (a *App) ListarCategorias() []Categoria {
    var lista []Categoria
    for _, cat := range categoriasMap {
        lista = append(lista, cat)
    }
    return lista
}

func (a *App) ListarTiposOcorrencia() []string {
    return TiposOcorrencia
}

func (a *App) ListarVeiculos() []map[string]interface{} {
    rows, err := a.db.Query("SELECT id, nome, placa, categoria FROM veiculos")
    if err != nil {
        return []map[string]interface{}{}
    }
    defer rows.Close()

    var resultado []map[string]interface{}
    for rows.Next() {
        var v Veiculo
        rows.Scan(&v.ID, &v.Nome, &v.Placa, &v.Categoria)
        cat := categoriasMap[v.Categoria]
        resultado = append(resultado, map[string]interface{}{
            "id":             v.ID,
            "nome":           v.Nome,
            "placa":          v.Placa,
            "categoria":      v.Categoria,
            "categoria_nome": cat.Nome,
        })
    }

    if resultado == nil {
        return []map[string]interface{}{}
    }
    return resultado
}

func (a *App) CriarVeiculo(nome string, placa string, categoria string) map[string]interface{} {
    if _, exists := categoriasMap[categoria]; !exists {
        return map[string]interface{}{"error": "Categoria inválida"}
    }
    result, err := a.db.Exec("INSERT INTO veiculos (nome, placa, categoria) VALUES (?, ?, ?)", nome, placa, categoria)
    if err != nil {
        return map[string]interface{}{"error": err.Error()}
    }
    id, _ := result.LastInsertId()
    return map[string]interface{}{"msg": "ok", "id": id}
}

func (a *App) AtualizarVeiculo(id int64, nome string, placa string, categoria string) map[string]interface{} {
    if _, exists := categoriasMap[categoria]; !exists {
        return map[string]interface{}{"error": "Categoria inválida"}
    }
    _, err := a.db.Exec("UPDATE veiculos SET nome = ?, placa = ?, categoria = ? WHERE id = ?", nome, placa, categoria, id)
    if err != nil {
        return map[string]interface{}{"error": err.Error()}
    }
    return map[string]interface{}{"msg": "ok"}
}

func (a *App) ExcluirVeiculo(id int64) map[string]interface{} {
    a.db.Exec("DELETE FROM registros WHERE veiculo_id = ?", id)
    a.db.Exec("DELETE FROM veiculos WHERE id = ?", id)
    return map[string]interface{}{"msg": "ok"}
}

func (a *App) ListarRegistrosParciaisPorData(data string) []map[string]interface{} {
    rows, err := a.db.Query(`
        SELECT r.id, r.veiculo_id, r.data, r.horas_trabalhadas, r.quantidade_atividades, r.ocorrencia, r.tempo_parado, r.observacao, r.tipo_ocorrencia,
               v.nome, v.placa, v.categoria
        FROM registros r
        JOIN veiculos v ON r.veiculo_id = v.id
        WHERE r.data = ?
        ORDER BY v.nome`, data)
    if err != nil {
        return []map[string]interface{}{}
    }
    defer rows.Close()

    var registros []map[string]interface{}
    for rows.Next() {
        var r struct {
            ID                   int64
            VeiculoID            int64
            Data                 string
            HorasTrabalhadas     float64
            QuantidadeAtividades int
            Ocorrencia           string
            TempoParado          float64
            Observacao           string
            TipoOcorrencia       string
            VeiculoNome          string
            VeiculoPlaca         string
            VeiculoCategoria     string
        }
        rows.Scan(&r.ID, &r.VeiculoID, &r.Data, &r.HorasTrabalhadas, &r.QuantidadeAtividades, &r.Ocorrencia, &r.TempoParado, &r.Observacao, &r.TipoOcorrencia,
            &r.VeiculoNome, &r.VeiculoPlaca, &r.VeiculoCategoria)
        registros = append(registros, map[string]interface{}{
            "id":                      r.ID,
            "veiculo_id":              r.VeiculoID,
            "data":                    r.Data,
            "horas_trabalhadas":       r.HorasTrabalhadas,
            "quantidade_atividades":   r.QuantidadeAtividades,
            "ocorrencia":              r.Ocorrencia,
            "tempo_parado":            r.TempoParado,
            "observacao":              r.Observacao,
            "tipo_ocorrencia":         r.TipoOcorrencia,
            "veiculo_nome":            r.VeiculoNome,
            "veiculo_placa":           r.VeiculoPlaca,
            "veiculo_categoria":       r.VeiculoCategoria,
        })
    }

    if registros == nil {
        return []map[string]interface{}{}
    }
    return registros
}

func (a *App) ListarRegistrosParciaisPorPeriodo(dataInicio string, dataFim string) []map[string]interface{} {
    rows, err := a.db.Query(`
        SELECT r.id, r.veiculo_id, r.data, r.horas_trabalhadas, r.quantidade_atividades, r.ocorrencia, r.tempo_parado, r.observacao, r.tipo_ocorrencia,
               v.nome, v.placa, v.categoria
        FROM registros r
        JOIN veiculos v ON r.veiculo_id = v.id
        WHERE r.data >= ? AND r.data <= ?
        ORDER BY v.nome, r.data`, dataInicio, dataFim)
    if err != nil {
        return []map[string]interface{}{}
    }
    defer rows.Close()

    var registros []map[string]interface{}
    for rows.Next() {
        var r struct {
            ID                   int64
            VeiculoID            int64
            Data                 string
            HorasTrabalhadas     float64
            QuantidadeAtividades int
            Ocorrencia           string
            TempoParado          float64
            Observacao           string
            TipoOcorrencia       string
            VeiculoNome          string
            VeiculoPlaca         string
            VeiculoCategoria     string
        }
        rows.Scan(&r.ID, &r.VeiculoID, &r.Data, &r.HorasTrabalhadas, &r.QuantidadeAtividades, &r.Ocorrencia, &r.TempoParado, &r.Observacao, &r.TipoOcorrencia,
            &r.VeiculoNome, &r.VeiculoPlaca, &r.VeiculoCategoria)
        registros = append(registros, map[string]interface{}{
            "id":                      r.ID,
            "veiculo_id":              r.VeiculoID,
            "data":                    r.Data,
            "horas_trabalhadas":       r.HorasTrabalhadas,
            "quantidade_atividades":   r.QuantidadeAtividades,
            "ocorrencia":              r.Ocorrencia,
            "tempo_parado":            r.TempoParado,
            "observacao":              r.Observacao,
            "tipo_ocorrencia":         r.TipoOcorrencia,
            "veiculo_nome":            r.VeiculoNome,
            "veiculo_placa":           r.VeiculoPlaca,
            "veiculo_categoria":       r.VeiculoCategoria,
        })
    }

    if registros == nil {
        return []map[string]interface{}{}
    }
    return registros
}

func (a *App) SalvarRegistrosParciais(data string, registros []RegistroParcialPayload) map[string]interface{} {
    _, err := a.db.Exec("DELETE FROM registros WHERE data = ?", data)
    if err != nil {
        return map[string]interface{}{"error": err.Error()}
    }

    for _, reg := range registros {
        _, err := a.db.Exec(`INSERT INTO registros (veiculo_id, data, horas_trabalhadas, quantidade_atividades, ocorrencia, tempo_parado, observacao, tipo_ocorrencia) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            reg.VeiculoID, data, reg.HorasTrabalhadas, reg.QuantidadeAtividades, reg.Ocorrencia, reg.TempoParado, reg.Observacao, reg.TipoOcorrencia)
        if err != nil {
            return map[string]interface{}{"error": err.Error()}
        }
    }

    return map[string]interface{}{"msg": "ok"}
}

func (a *App) LimparTodosRegistros() map[string]interface{} {
    _, err := a.db.Exec("DELETE FROM registros")
    if err != nil {
        return map[string]interface{}{"error": err.Error()}
    }
    return map[string]interface{}{"msg": "ok"}
}

func (a *App) DashboardCompleto(ano int, mes int) DashboardResponse {
    veiculos := a.ListarVeiculos()

    mesStr := ""
    if mes < 10 {
        mesStr = "0" + strconv.Itoa(mes)
    } else {
        mesStr = strconv.Itoa(mes)
    }
    anoStr := strconv.Itoa(ano)

    rows, err := a.db.Query(`
        SELECT r.veiculo_id, r.data, r.quantidade_atividades, r.tipo_ocorrencia
        FROM registros r
        WHERE substr(r.data, 1, 4) = ? AND substr(r.data, 6, 2) = ?`, anoStr, mesStr)
    if err != nil {
        return DashboardResponse{Periodo: mesStr + "/" + anoStr, Total: 0, Media: 0, Veiculos: []VeiculoDashboard{}}
    }
    defer rows.Close()

    registrosPorVeiculo := make(map[int64][]map[string]interface{})
    for rows.Next() {
        var veiculoID int64
        var data string
        var qtd int
        var tipoOcorrencia string
        rows.Scan(&veiculoID, &data, &qtd, &tipoOcorrencia)
        registrosPorVeiculo[veiculoID] = append(registrosPorVeiculo[veiculoID], map[string]interface{}{
            "data":            data,
            "quantidade":      qtd,
            "tipo_ocorrencia": tipoOcorrencia,
        })
    }

    var veiculosDashboard []VeiculoDashboard
    totalAtividadesGeral := 0

    for _, v := range veiculos {
        regs := registrosPorVeiculo[v["id"].(int64)]
        total := 0
        diasInativos := 0
        motivosVeiculo := make(map[string]interface{})

        for _, r := range regs {
            qtd := r["quantidade"].(int)
            total += qtd
            if qtd == 0 {
                diasInativos++
                motivo := r["tipo_ocorrencia"].(string)
                data := r["data"].(string)
                if motivo != "" && motivo != "Nenhuma" {
                    if _, exists := motivosVeiculo[motivo]; !exists {
                        motivosVeiculo[motivo] = []string{}
                    }
                    dataFormatada := data
                    if len(data) >= 10 {
                        dataFormatada = data[8:10] + "/" + data[5:7] + "/" + data[0:4]
                    }
                    motivosVeiculo[motivo] = append(motivosVeiculo[motivo].([]string), dataFormatada)
                }
            }
        }

        totalAtividadesGeral += total
        dias := len(regs)
        media := 0.0
        if dias > 0 {
            media = float64(total) / float64(dias)
        }

        cat := categoriasMap[v["categoria"].(string)]
        performance := "Normal"
        if media <= float64(cat.BaixaPerformance) {
            performance = "Baixa Performance"
        } else if media >= float64(cat.AltaPerformance) {
            performance = "Alta Performance"
        }

        veiculosDashboard = append(veiculosDashboard, VeiculoDashboard{
            ID:                 v["id"].(int64),
            Nome:               v["nome"].(string),
            Placa:              v["placa"].(string),
            CategoriaNome:      cat.Nome,
            TotalAtividades:    total,
            MediaDiaria:        media,
            Performance:        performance,
            DiasInativos:       diasInativos,
            MotivosInatividade: motivosVeiculo,
        })
    }

    mediaGeral := 0.0
    if len(veiculos) > 0 {
        mediaGeral = float64(totalAtividadesGeral) / float64(len(veiculos))
    }

    return DashboardResponse{
        Periodo:  mesStr + "/" + anoStr,
        Total:    totalAtividadesGeral,
        Media:    mediaGeral,
        Veiculos: veiculosDashboard,
    }
}

func (a *App) DashboardDiario(dataStr string) DashboardResponse {
    veiculos := a.ListarVeiculos()

    rows, err := a.db.Query(`
        SELECT r.veiculo_id, r.quantidade_atividades, r.tipo_ocorrencia
        FROM registros r
        WHERE r.data = ?`, dataStr)
    if err != nil {
        return DashboardResponse{Periodo: dataStr, Total: 0, Media: 0, Veiculos: []VeiculoDashboard{}}
    }
    defer rows.Close()

    registrosPorVeiculo := make(map[int64]map[string]interface{})
    for rows.Next() {
        var veiculoID int64
        var qtd int
        var tipoOcorrencia string
        rows.Scan(&veiculoID, &qtd, &tipoOcorrencia)
        registrosPorVeiculo[veiculoID] = map[string]interface{}{
            "quantidade":      qtd,
            "tipo_ocorrencia": tipoOcorrencia,
        }
    }

    var veiculosDashboard []VeiculoDashboard
    totalAtividadesGeral := 0

    for _, v := range veiculos {
        reg := registrosPorVeiculo[v["id"].(int64)]
        qtd := 0
        motivo := ""
        if reg != nil {
            qtd = reg["quantidade"].(int)
            motivo = reg["tipo_ocorrencia"].(string)
        }

        totalAtividadesGeral += qtd
        cat := categoriasMap[v["categoria"].(string)]
        performance := "Normal"
        if float64(qtd) <= float64(cat.BaixaPerformance) {
            performance = "Baixa Performance"
        } else if float64(qtd) >= float64(cat.AltaPerformance) {
            performance = "Alta Performance"
        }

        motivosMap := make(map[string]interface{})
        if qtd == 0 && motivo != "" && motivo != "Nenhuma" {
            dataFormatada := dataStr
            if len(dataStr) >= 10 {
                dataFormatada = dataStr[8:10] + "/" + dataStr[5:7] + "/" + dataStr[0:4]
            }
            motivosMap[motivo] = []string{dataFormatada}
        }

        veiculosDashboard = append(veiculosDashboard, VeiculoDashboard{
            ID:                 v["id"].(int64),
            Nome:               v["nome"].(string),
            Placa:              v["placa"].(string),
            CategoriaNome:      cat.Nome,
            TotalAtividades:    qtd,
            MediaDiaria:        float64(qtd),
            Performance:        performance,
            DiasInativos:       0,
            MotivosInatividade: motivosMap,
        })
    }

    mediaGeral := 0.0
    if len(veiculos) > 0 {
        mediaGeral = float64(totalAtividadesGeral) / float64(len(veiculos))
    }

    dataFormatada := dataStr
    if len(dataStr) >= 10 {
        dataFormatada = dataStr[8:10] + "/" + dataStr[5:7] + "/" + dataStr[0:4]
    }

    return DashboardResponse{
        Periodo:  dataFormatada,
        Total:    totalAtividadesGeral,
        Media:    mediaGeral,
        Veiculos: veiculosDashboard,
    }
}