// ============================================================
// EVOLUE CARREIRAS — Configuração central
// config.js
// ============================================================

const EVOLUE_CONFIG = {
  supabase: {
    url: 'https://rlqrrbgdljixmayzwohe.supabase.co',
    key: 'sb_publishable_F2T8cVn0dgoN-yB3G0QCKQ_UvKTKqSGAGBIvj',
  },

  // Planos e limites
  planos: {
    free: {
      curriculos_gratis: 6,
      preco_extra_curriculo: 1.99,
      ats_scores_mes: 10,
      cover_letters_mes: 3,
      job_tracker_vagas: 10,
    },
    pro: {
      curriculos_gratis: Infinity,
      ats_scores_mes: Infinity,
      cover_letters_mes: Infinity,
      job_tracker_vagas: Infinity,
      preco_mes: 49.90,
    }
  },

  // Career Points por ação
  pontos: {
    cadastro_completo:    10,
    curriculo_gerado:      8,
    entrevista_simulada:   5,
    disc_preenchido:       8,
    vaga_registrada:       3,
    ats_score_feito:       4,
    cover_letter_gerada:   4,
    login_diario:          1,
  },

  // Selos
  selos: {
    bronze: { min: 0,  max: 39,  cor: '#CD7F32', label: 'Bronze' },
    prata:  { min: 40, max: 79,  cor: '#94A3B8', label: 'Prata'  },
    ouro:   { min: 80, max: 100, cor: '#F59E0B', label: 'Ouro'   },
  },

  // App
  app: {
    nome: 'Evolue Carreiras',
    versao: '2.0.0',
    url_producao: 'https://evolue-carreiras.vercel.app',
  }
};

// Inicializa cliente Supabase (carregado via CDN no HTML)
const supabase = window.supabase.createClient(
  EVOLUE_CONFIG.supabase.url,
  EVOLUE_CONFIG.supabase.key
);
