// EVOLUE CARREIRAS — config.js
const EVOLUE_CONFIG = {
  selos: {
    bronze: { label: 'Bronze' },
    prata:  { label: 'Prata'  },
    ouro:   { label: 'Ouro'   },
  },
  pontos: {
    cadastro_completo:  10,
    curriculo_gerado:    8,
    entrevista_simulada: 5,
    disc_preenchido:     8,
    vaga_registrada:     3,
    ats_score_feito:     4,
    cover_letter_gerada: 4,
    login_diario:        1,
  },
  app: { url_producao: 'https://evolue-carreiras.vercel.app' }
};
window.EVOLUE_CONFIG = EVOLUE_CONFIG;
