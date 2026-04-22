package main

import (
    "context"
    "database/sql"
    "strconv"
    
    _ "modernc.org/sqlite"
)

type App struct {
    db *sql.DB
    ctx context.Context
}

// ==============================
// MODELS
// ==============================

type Veiculo struct {
    ID        int64
    Nome      string
    Placa     string
    Categoria string
}

type Registro struct {
    ID                   int64
    VeiculoID            int64
    Data                 string
    QuantidadeAtividades int
    MotivoInatividade    string
}

// ==============================
// CATEGORIAS
// ==============================

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

// ==============================
// DASHBOARD TYPES
// ==============================

type DashboardResponse struct {
    Periodo  string             `json:"periodo"`
    Total    int                `json:"total"`
    Media    float64            `json:"media"`
    Veiculos []VeiculoDashboard `json:"veiculos"`
}

type VeiculoDashboard struct {
    ID              int64   `json:"id"`
    Nome            string  `json:"nome"`
    Placa           string  `json:"placa"`
    CategoriaNome   string  `json:"categoria_nome"`
    TotalAtividades int     `json:"total_atividades"`
    MediaDiaria     float64 `json:"media_diaria"`
    Performance     string  `json:"performance"`
}

// ==============================
// APP LIFECYCLE
// ==============================

func NewApp() *App {
    return &App{}
}

func (a *App) Startup(ctx context.Context) {
    a.ctx = ctx
    
    db, err := sql.Open("sqlite", "database.db")
    if err != nil {
        panic("Failed to connect to database: " + err.Error())
    }
    
    createVeiculosTable := `
    CREATE TABLE IF NOT EXISTS veiculos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        placa TEXT NOT NULL UNIQUE,
        categoria TEXT NOT NULL
    );`
    
    createRegistrosTable := `
    CREATE TABLE IF NOT EXISTS registros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        veiculo_id INTEGER NOT NULL,
        data TEXT NOT NULL,
        quantidade_atividades INTEGER NOT NULL,
        motivo_inatividade TEXT,
        FOREIGN KEY(veiculo_id) REFERENCES veiculos(id)
    );`
    
    db.Exec(createVeiculosTable)
    db.Exec(createRegistrosTable)
    
    a.db = db
}

// ==============================
// CATEGORIAS ENDPOINTS
// ==============================

func (a *App) ListarCategorias() []Categoria {
    var lista []Categoria
    for _, cat := range categoriasMap {
        lista = append(lista, cat)
    }
    return lista
}

// ==============================
// VEICULOS CRUD
// ==============================

func (a *App) ListarVeiculos() []map[string]interface{} {
    rows, err := a.db.Query("SELECT id, nome, placa, categoria FROM veiculos")
    if err != nil {
        return []map[string]interface{}{}
    }
    defer rows.Close()
    
    var resultado []map[string]interface{}
    for rows.Next() {
        var v Veiculo
        err := rows.Scan(&v.ID, &v.Nome, &v.Placa, &v.Categoria)
        if err != nil {
            continue
        }
        cat, exists := categoriasMap[v.Categoria]
        categoriaNome := v.Categoria
        if exists {
            categoriaNome = cat.Nome
        }
        resultado = append(resultado, map[string]interface{}{
            "id":             v.ID,
            "nome":           v.Nome,
            "placa":          v.Placa,
            "categoria":      v.Categoria,
            "categoria_nome": categoriaNome,
        })
    }
    if resultado == nil {
        return []map[string]interface{}{}
    }
    return resultado
}

func (a *App) CriarVeiculo(nome string, placa string, categoria string) map[string]interface{} {
    if _, exists := categoriasMap[categoria]; !exists {
        return map[string]interface{}{
            "error": "Categoria inválida",
        }
    }
    
    result, err := a.db.Exec("INSERT INTO veiculos (nome, placa, categoria) VALUES (?, ?, ?)", nome, placa, categoria)
    if err != nil {
        return map[string]interface{}{
            "error": "Erro ao criar veículo: " + err.Error(),
        }
    }
    
    id, _ := result.LastInsertId()
    return map[string]interface{}{
        "msg": "ok",
        "id":  id,
    }
}

func (a *App) AtualizarVeiculo(id int64, nome string, placa string, categoria string) map[string]interface{} {
    if _, exists := categoriasMap[categoria]; !exists {
        return map[string]interface{}{
            "error": "Categoria inválida",
        }
    }
    
    _, err := a.db.Exec("UPDATE veiculos SET nome = ?, placa = ?, categoria = ? WHERE id = ?", nome, placa, categoria, id)
    if err != nil {
        return map[string]interface{}{
            "error": "Erro ao atualizar veículo",
        }
    }
    
    return map[string]interface{}{
        "msg": "ok",
    }
}

func (a *App) ExcluirVeiculo(id int64) map[string]interface{} {
    a.db.Exec("DELETE FROM registros WHERE veiculo_id = ?", id)
    a.db.Exec("DELETE FROM veiculos WHERE id = ?", id)
    
    return map[string]interface{}{
        "msg": "ok",
    }
}

// ==============================
// REGISTROS CRUD
// ==============================

func (a *App) ListarRegistros() []map[string]interface{} {
    rows, err := a.db.Query("SELECT id, veiculo_id, data, quantidade_atividades, motivo_inatividade FROM registros")
    if err != nil {
        return []map[string]interface{}{}
    }
    defer rows.Close()
    
    var registros []map[string]interface{}
    for rows.Next() {
        var r Registro
        err := rows.Scan(&r.ID, &r.VeiculoID, &r.Data, &r.QuantidadeAtividades, &r.MotivoInatividade)
        if err != nil {
            continue
        }
        registros = append(registros, map[string]interface{}{
            "id":                       r.ID,
            "veiculo_id":               r.VeiculoID,
            "data":                     r.Data,
            "quantidade_atividades":    r.QuantidadeAtividades,
            "motivo_inatividade":       r.MotivoInatividade,
        })
    }
    if registros == nil {
        return []map[string]interface{}{}
    }
    return registros
}

type RegistroPayload struct {
    VeiculoID            int64   `json:"veiculo_id"`
    Data                 string  `json:"data"`
    QuantidadeAtividades int     `json:"quantidade_atividades"`
    MotivoInatividade    *string `json:"motivo_inatividade"`
}

func (a *App) CriarRegistro(payload RegistroPayload) map[string]interface{} {
    if payload.QuantidadeAtividades == 0 && (payload.MotivoInatividade == nil || *payload.MotivoInatividade == "") {
        return map[string]interface{}{
            "error": "Motivo obrigatório quando não há atividades",
        }
    }
    
    motivo := ""
    if payload.MotivoInatividade != nil {
        motivo = *payload.MotivoInatividade
    }
    
    result, err := a.db.Exec("INSERT INTO registros (veiculo_id, data, quantidade_atividades, motivo_inatividade) VALUES (?, ?, ?, ?)",
        payload.VeiculoID, payload.Data, payload.QuantidadeAtividades, motivo)
    if err != nil {
        return map[string]interface{}{
            "error": "Erro ao criar registro: " + err.Error(),
        }
    }
    
    id, _ := result.LastInsertId()
    return map[string]interface{}{
        "msg": "ok",
        "id":  id,
    }
}

func (a *App) AtualizarRegistro(id int64, payload RegistroPayload) map[string]interface{} {
    if payload.QuantidadeAtividades == 0 && (payload.MotivoInatividade == nil || *payload.MotivoInatividade == "") {
        return map[string]interface{}{
            "error": "Motivo obrigatório quando não há atividades",
        }
    }
    
    motivo := ""
    if payload.MotivoInatividade != nil {
        motivo = *payload.MotivoInatividade
    }
    
    _, err := a.db.Exec("UPDATE registros SET veiculo_id = ?, data = ?, quantidade_atividades = ?, motivo_inatividade = ? WHERE id = ?",
        payload.VeiculoID, payload.Data, payload.QuantidadeAtividades, motivo, id)
    if err != nil {
        return map[string]interface{}{
            "error": "Erro ao atualizar registro: " + err.Error(),
        }
    }
    
    return map[string]interface{}{
        "msg": "ok",
    }
}

func (a *App) ExcluirRegistro(id int64) map[string]interface{} {
    _, err := a.db.Exec("DELETE FROM registros WHERE id = ?", id)
    if err != nil {
        return map[string]interface{}{
            "error": "Erro ao excluir registro: " + err.Error(),
        }
    }
    return map[string]interface{}{
        "msg": "ok",
    }
}

// ==============================
// DASHBOARD ENDPOINTS
// ==============================

func (a *App) DashboardMensal(ano int, mes int) DashboardResponse {
    registros := a.ListarRegistros()
    veiculos := a.ListarVeiculos()
    
    var dados []VeiculoDashboard
    totalGeral := 0
    
    mesStr := ""
    if mes < 10 {
        mesStr = "0" + strconv.Itoa(mes)
    } else {
        mesStr = strconv.Itoa(mes)
    }
    anoStr := strconv.Itoa(ano)
    
    for _, v := range veiculos {
        var regs []map[string]interface{}
        for _, r := range registros {
            if len(r["data"].(string)) >= 7 {
                anoReg := r["data"].(string)[0:4]
                mesReg := r["data"].(string)[5:7]
                if v["id"].(int64) == r["veiculo_id"].(int64) && anoReg == anoStr && mesReg == mesStr {
                    regs = append(regs, r)
                }
            }
        }
        
        total := 0
        for _, r := range regs {
            total += r["quantidade_atividades"].(int)
        }
        
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
        
        totalGeral += total
        
        dados = append(dados, VeiculoDashboard{
            ID:              v["id"].(int64),
            Nome:            v["nome"].(string),
            Placa:           v["placa"].(string),
            CategoriaNome:   cat.Nome,
            TotalAtividades: total,
            MediaDiaria:     media,
            Performance:     performance,
        })
    }
    
    mediaGeral := 0.0
    if len(veiculos) > 0 {
        mediaGeral = float64(totalGeral) / float64(len(veiculos))
    }
    
    periodo := mesStr + "/" + anoStr
    
    return DashboardResponse{
        Periodo:  periodo,
        Total:    totalGeral,
        Media:    mediaGeral,
        Veiculos: dados,
    }
}

func (a *App) DashboardDiario(dataStr string) DashboardResponse {
    registros := a.ListarRegistros()
    veiculos := a.ListarVeiculos()
    
    var dados []VeiculoDashboard
    totalGeral := 0
    
    for _, v := range veiculos {
        qtd := 0
        for _, r := range registros {
            if r["veiculo_id"].(int64) == v["id"].(int64) && r["data"].(string) == dataStr {
                qtd = r["quantidade_atividades"].(int)
                break
            }
        }
        
        cat := categoriasMap[v["categoria"].(string)]
        performance := "Normal"
        if qtd <= cat.BaixaPerformance {
            performance = "Baixa Performance"
        } else if qtd >= cat.AltaPerformance {
            performance = "Alta Performance"
        }
        
        totalGeral += qtd
        
        dados = append(dados, VeiculoDashboard{
            ID:              v["id"].(int64),
            Nome:            v["nome"].(string),
            Placa:           v["placa"].(string),
            CategoriaNome:   cat.Nome,
            TotalAtividades: qtd,
            MediaDiaria:     float64(qtd),
            Performance:     performance,
        })
    }
    
    mediaGeral := 0.0
    if len(veiculos) > 0 {
        mediaGeral = float64(totalGeral) / float64(len(veiculos))
    }
    
    return DashboardResponse{
        Periodo:  dataStr,
        Total:    totalGeral,
        Media:    mediaGeral,
        Veiculos: dados,
    }
}