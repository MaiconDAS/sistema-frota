export namespace main {
	
	export class Categoria {
	    id: string;
	    nome: string;
	    baixa_performance: number;
	    normal: number;
	    alta_performance: number;
	
	    static createFrom(source: any = {}) {
	        return new Categoria(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.nome = source["nome"];
	        this.baixa_performance = source["baixa_performance"];
	        this.normal = source["normal"];
	        this.alta_performance = source["alta_performance"];
	    }
	}
	export class VeiculoDashboard {
	    id: number;
	    nome: string;
	    placa: string;
	    categoria_nome: string;
	    total_atividades: number;
	    media_diaria: number;
	    performance: string;
	    dias_inativos: number;
	    motivos_inatividade: Record<string, any>;
	
	    static createFrom(source: any = {}) {
	        return new VeiculoDashboard(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.nome = source["nome"];
	        this.placa = source["placa"];
	        this.categoria_nome = source["categoria_nome"];
	        this.total_atividades = source["total_atividades"];
	        this.media_diaria = source["media_diaria"];
	        this.performance = source["performance"];
	        this.dias_inativos = source["dias_inativos"];
	        this.motivos_inatividade = source["motivos_inatividade"];
	    }
	}
	export class DashboardResponse {
	    periodo: string;
	    total: number;
	    media: number;
	    veiculos: VeiculoDashboard[];
	
	    static createFrom(source: any = {}) {
	        return new DashboardResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.periodo = source["periodo"];
	        this.total = source["total"];
	        this.media = source["media"];
	        this.veiculos = this.convertValues(source["veiculos"], VeiculoDashboard);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RegistroParcialPayload {
	    veiculo_id: number;
	    horas_trabalhadas: number;
	    quantidade_atividades: number;
	    ocorrencia: string;
	    tempo_parado: number;
	    observacao: string;
	    tipo_ocorrencia: string;
	
	    static createFrom(source: any = {}) {
	        return new RegistroParcialPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.veiculo_id = source["veiculo_id"];
	        this.horas_trabalhadas = source["horas_trabalhadas"];
	        this.quantidade_atividades = source["quantidade_atividades"];
	        this.ocorrencia = source["ocorrencia"];
	        this.tempo_parado = source["tempo_parado"];
	        this.observacao = source["observacao"];
	        this.tipo_ocorrencia = source["tipo_ocorrencia"];
	    }
	}

}

