// EVOLUE CARREIRAS — app.js v2.0
const SB = () => window.supabaseClient;
const LOCAL_DATA_KEY = 'evolue_demo_data';

const Estado = {
  perfil: null, curriculos: [], disc: null,
  entrevistas: [], tracker: [], viewAtual: 'perfil', questaoAtual: 0,
  diagnostico: null, apresentacoes: [],
};

function temBanco() {
  return !!SB()?.from && !!Auth.getUsuario()?.id && !window.EVOLUE_DEMO_MODE;
}

function carregarLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_DATA_KEY) || '{}');
  } catch {
    return {};
  }
}

function salvarLocal(extra = {}) {
  const local = carregarLocal();
  const dados = {
    ...local,
    ...extra,
    perfil: Estado.perfil,
    curriculos: Estado.curriculos,
    disc: Estado.disc,
    entrevistas: Estado.entrevistas,
    tracker: Estado.tracker
    ,diagnostico: Estado.diagnostico,
    apresentacoes: Estado.apresentacoes
  };
  localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(dados));
}

const PERGUNTAS = [
  'Fale sobre você.',
  'Quais são seus pontos fortes?',
  'Qual é sua maior fraqueza e como você a trabalha?',
  'Por que você quer trabalhar nessa empresa?',
  'Onde você se vê daqui a 5 anos?',
  'Fale sobre um desafio que você superou no trabalho.',
  'Como você lida com pressão e prazos apertados?',
  'Por que devemos te contratar?',
];

const TIPS = [
  { titulo: 'Pesquise a empresa', texto: 'Estude a história, missão e cultura antes da entrevista.' },
  { titulo: 'Use o método STAR', texto: 'Situação, Tarefa, Ação e Resultado para respostas comportamentais.' },
  { titulo: 'Linguagem corporal', texto: 'Contato visual, postura ereta e sorriso transmitem confiança.' },
  { titulo: 'Prepare perguntas', texto: 'Tenha 2 a 3 perguntas prontas para fazer ao entrevistador.' },
  { titulo: 'Seja pontual', texto: 'Chegue 10 minutos antes. Em online, teste a conexão antes.' },
  { titulo: 'Fale de resultados', texto: 'Use números: "aumentei vendas em 20%", "atendi 50 clientes".' },
];

const RECOMENDACOES = [
  { titulo: 'Faça seu diagnóstico', texto: 'Descubra sua nota de empregabilidade e receba próximos passos.', view: 'diagnostico' },
  { titulo: 'Complete a trilha EVOLUE', texto: 'Siga a jornada para liberar o Perfil Preparado EVOLUE.', view: 'trilha' },
  { titulo: 'Crie seu “Fale sobre você”', texto: 'Tenha uma apresentação pronta para entrevista.', view: 'apresentacao' },
  { titulo: 'Complete seu perfil DISC', texto: 'O perfil comportamental aumenta suas chances no banco de talentos.', view: 'disc' },
  { titulo: 'Simule uma entrevista', texto: 'Candidatos que praticam têm 40% mais chances de aprovação.', view: 'entrevista' },
  { titulo: 'Analise o ATS Score', texto: 'Mais de 75% das empresas usam filtros automáticos.', view: 'ats' },
  { titulo: 'Registre suas candidaturas', texto: 'Use o Job Tracker para não perder nenhum follow-up.', view: 'tracker' }
];

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  let usuario = null;
  let perfil = null;
  try {
    ({ usuario, perfil } = await Auth.init());
  } catch (err) {
    console.error('Erro ao iniciar Auth:', err);
    window.EVOLUE_DEMO_MODE = true;
  }

  if (usuario) { Estado.perfil = perfil; mostrarApp(); await carregarDados(); }
  else { mostrarAuth(); }

  window.addEventListener('evolue:login', async (e) => {
    Estado.perfil = e.detail.perfil;
    mostrarApp();
    await carregarDados();
  });
  window.addEventListener('evolue:logout', () => { mostrarAuth(); resetarEstado(); });
  configurarEventos();
});

// ── Telas ─────────────────────────────────────────────────────
function mostrarAuth() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('appScreen').classList.add('hidden');
}

function mostrarApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  atualizarSidebar();
  renderizarTips();
  renderizarRecomendacoes();
  renderizarDiagnostico();
  renderizarTrilha();
  navegarPara('perfil');
}

function resetarEstado() {
  Estado.perfil = null; Estado.curriculos = []; Estado.disc = null;
  Estado.entrevistas = []; Estado.tracker = [];
}

// ── Dados ─────────────────────────────────────────────────────
async function carregarDados() {
  const userId = Auth.getUsuario()?.id;
  if (!userId) return;
  if (!temBanco()) {
    const local = carregarLocal();
    Estado.perfil = local.perfil || Estado.perfil || Auth.getPerfil();
    Estado.curriculos = local.curriculos || [];
    Estado.disc = local.disc || null;
    Estado.entrevistas = local.entrevistas || [];
    Estado.tracker = local.tracker || [];
    Estado.diagnostico = local.diagnostico || null;
    Estado.apresentacoes = local.apresentacoes || [];
    preencherFormularioPerfil();
    preencherFormularioDisc();
    preencherFormularioDiagnostico();
    atualizarSidebar();
    atualizarScore();
    atualizarDashboard();
    renderizarKanban();
    renderizarDiagnostico();
    renderizarTrilha();
    atualizarUsageCard();
    renderizarPrevia();
    return;
  }

  try {
    const [p, c, d, e, t] = await Promise.all([
      SB().from('profiles').select('*').eq('id', userId).single(),
      SB().from('curriculos').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      SB().from('disc_results').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
      SB().from('entrevistas').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      SB().from('job_tracker').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);
    if (p.data)    Estado.perfil      = p.data;
    if (c.data)    Estado.curriculos  = c.data;
    if (d.data?.[0]) Estado.disc      = d.data[0];
    if (e.data)    Estado.entrevistas = e.data;
    if (t.data)    Estado.tracker     = t.data;
    const local = carregarLocal();
    Estado.diagnostico = local.diagnostico || null;
    Estado.apresentacoes = local.apresentacoes || [];

    preencherFormularioPerfil();
    preencherFormularioDisc();
    preencherFormularioDiagnostico();
    atualizarSidebar();
    atualizarScore();
    atualizarDashboard();
    renderizarKanban();
    renderizarDiagnostico();
    renderizarTrilha();
    atualizarUsageCard();
  } catch(err) { console.error('Erro ao carregar dados:', err); }
}

// ── Navegação ─────────────────────────────────────────────────
function navegarPara(view) {
  Estado.viewAtual = view;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');
  document.getElementById(`view-${view}`)?.classList.add('active');

  const titulos = {
    perfil:        { h: 'Painel do candidato',       sub: 'Seus dados para currículo e banco de talentos.' },
    diagnostico:   { h: 'Diagnóstico de empregabilidade', sub: 'Entenda seu nível atual e receba próximos passos claros.' },
    trilha:        { h: 'Minha Trilha EVOLUE',        sub: 'Complete etapas para conquistar o Perfil Preparado EVOLUE.' },
    apresentacao:  { h: 'Fale Sobre Você',            sub: 'Crie uma apresentação pronta para entrevistas.' },
    curriculo:     { h: 'Gerador de currículo',       sub: 'Crie e exporte seu currículo profissional.' },
    ats:           { h: 'ATS Score',                  sub: 'Veja se seu currículo passa pelo filtro automático.' },
    cover:         { h: 'Cover Letter',               sub: 'Carta de apresentação personalizada para cada vaga.' },
    entrevista:    { h: 'Simulador de entrevista',    sub: 'Pratique e receba feedback imediato.' },
    tracker:       { h: 'Job Tracker',                sub: 'Acompanhe todas as suas candidaturas.' },
    disc:          { h: 'Perfil DISC',                sub: 'Seu perfil comportamental para entrevistas.' },
    recomendacoes: { h: 'Recomendações',              sub: 'Próximos passos personalizados.' },
    dashboard:     { h: 'Dashboard EVOLUE',           sub: 'Visão completa do seu perfil no banco de talentos.' },
  };
  const t = titulos[view] || { h: 'Plataforma EVOLUE', sub: '' };
  setEl('viewTitle', t.h);
  setEl('viewSubtitle', t.sub);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Sidebar ───────────────────────────────────────────────────
function atualizarSidebar() {
  const p = Estado.perfil;
  if (!p) return;
  const nome = p.nome || 'Candidato';
  const iniciais = nome.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() || 'EV';
  setEl('sidebarNome', nome.split(' ')[0]);
  setEl('sidebarAvatar', iniciais);
  setEl('sidebarPlano', p.plano === 'pro' ? '⭐ Pro' : 'Free');
  setEl('careerPoints', p.career_points || 0);
  const selo = p.selo || 'bronze';
  setEl('levelLabel', selo.charAt(0).toUpperCase() + selo.slice(1));
  atualizarScore();
}

function atualizarScore() {
  const p = Estado.perfil;
  if (!p) return;
  let score = 0;
  if (p.nome) score+=5; if (p.email) score+=5; if (p.telefone) score+=5;
  if (p.cidade) score+=5; if (p.escolaridade) score+=5; if (p.area_interesse) score+=5;
  if (Estado.diagnostico) score+=10;
  if (Estado.apresentacoes.length>0) score+=10;
  if (Estado.curriculos.length>0) score+=25;
  if (Estado.disc) score+=20;
  if (Estado.entrevistas.length>0) score+=15;
  score = Math.min(score, 100);

  setEl('scoreValue', score);
  document.getElementById('scoreBar').style.width = score + '%';
  const selo = score>=80?'Ouro':score>=40?'Prata':'Bronze';
  setEl('levelLabel', selo);

  setEl('profileName', p.nome || 'Novo candidato');
  setEl('profileArea', p.area_interesse || 'Área de interesse ainda não informada');
  const ini = (p.nome||'EV').split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();
  setEl('profileInitials', ini);
  setEl('resumeStatus',    Estado.curriculos.length>0  ? '✅ Concluído' : '⏳ Pendente');
  setEl('interviewStatus', Estado.entrevistas.length>0 ? '✅ Concluído' : '⏳ Pendente');
  setEl('discStatus',      Estado.disc                 ? '✅ Concluído' : '⏳ Pendente');

  const steps = [];
  if (!p.nome) steps.push('Preencha seu perfil completo');
  if (!Estado.curriculos.length) steps.push('Gere seu primeiro currículo');
  if (!Estado.disc) steps.push('Preencha o perfil DISC');
  if (!Estado.entrevistas.length) steps.push('Simule uma entrevista');
  const ns = document.getElementById('nextSteps');
  if (ns) ns.innerHTML = steps.length
    ? '<strong style="font-size:12px;color:#667085">Próximos passos:</strong><ul style="margin:6px 0 0;padding-left:16px;font-size:12px;color:#667085">' + steps.map(s=>`<li>${s}</li>`).join('') + '</ul>'
    : '<p style="font-size:13px;color:#027a48">✅ Perfil completo! Você está no banco de talentos.</p>';
}

// ── Perfil ────────────────────────────────────────────────────
function preencherFormularioPerfil() {
  const p = Estado.perfil; if (!p) return;
  const form = document.getElementById('profileForm'); if (!form) return;
  const mapa = { nome:'nome', email:'email', telefone:'telefone', cidade:'cidade', escolaridade:'escolaridade', area:'area_interesse', experiencia:'experiencia' };
  Object.entries(mapa).forEach(([campo, chave]) => {
    const el = form.querySelector(`[name="${campo}"]`);
    if (el) el.value = p[chave] || '';
  });
}

async function salvarPerfil() {
  const form = document.getElementById('profileForm');
  const msg  = document.getElementById('perfilMsg');
  if (!form) return;
  const dados = {
    email:          form.querySelector('[name="email"]')?.value?.trim() || Auth.getUsuario()?.email || Estado.perfil?.email || '',
    nome:           form.querySelector('[name="nome"]')?.value?.trim(),
    telefone:       form.querySelector('[name="telefone"]')?.value?.trim(),
    cidade:         form.querySelector('[name="cidade"]')?.value?.trim(),
    escolaridade:   form.querySelector('[name="escolaridade"]')?.value?.trim(),
    area_interesse: form.querySelector('[name="area"]')?.value?.trim(),
    experiencia:    form.querySelector('[name="experiencia"]')?.value?.trim(),
  };
  try {
    const perfil = await Auth.atualizarPerfil(dados) || { ...(Estado.perfil || {}), ...dados };
    Estado.perfil = perfil;
    atualizarSidebar(); atualizarScore(); atualizarDashboard();
    salvarLocal();
    renderizarTrilha();
    if (dados.nome && dados.telefone && dados.cidade) await pontuar('cadastro_completo', 'Perfil completo', '👤');
    mostrarMensagem(msg, 'success', '✅ Perfil salvo!');
    mostrarToast('✅ Perfil salvo!');
  } catch(err) { mostrarMensagem(msg, 'error', '❌ ' + err.message); }
}

// ── Diagnóstico / Trilha / Apresentação ───────────────────────
const DIAGNOSTICO_LABELS = {
  curriculo: 'currículo atualizado',
  apresentacao: 'apresentação pessoal',
  entrevista: 'entrevista treinada',
  area: 'área definida',
  cursos: 'cursos ou aprendizados',
  whatsapp: 'WhatsApp profissional',
  disponibilidade: 'disponibilidade clara',
  vagas: 'candidaturas recentes',
  pontosFortes: 'pontos fortes com exemplos',
  vagaAlvo: 'currículo adaptado por vaga'
};

function calcularDiagnostico() {
  const form = document.getElementById('diagnosticoForm');
  if (!form) return null;
  const respostas = {};
  Object.keys(DIAGNOSTICO_LABELS).forEach((key) => {
    respostas[key] = !!form.querySelector(`[name="${key}"]`)?.checked;
  });
  const marcados = Object.values(respostas).filter(Boolean).length;
  const score = Math.round((marcados / Object.keys(DIAGNOSTICO_LABELS).length) * 100);
  const nivel = score >= 80 ? 'Ouro' : score >= 50 ? 'Prata' : 'Bronze';
  const faltantes = Object.entries(respostas).filter(([, ok]) => !ok).map(([key]) => DIAGNOSTICO_LABELS[key]);
  return { respostas, score, nivel, faltantes, data: new Date().toISOString() };
}

function preencherFormularioDiagnostico() {
  const form = document.getElementById('diagnosticoForm');
  if (!form || !Estado.diagnostico?.respostas) return;
  Object.entries(Estado.diagnostico.respostas).forEach(([key, value]) => {
    const input = form.querySelector(`[name="${key}"]`);
    if (input) input.checked = !!value;
  });
}

function renderizarDiagnostico() {
  const box = document.getElementById('diagnosticoResultado');
  if (!box) return;
  const diag = Estado.diagnostico;
  if (!diag) {
    box.className = 'diagnostic-result empty-state';
    box.innerHTML = '<p>Preencha o diagnóstico para receber sua nota.</p>';
    return;
  }
  const proximos = diag.faltantes.slice(0, 3);
  box.className = 'diagnostic-result';
  box.innerHTML = `
    <div class="diagnostic-score"><span>${diag.score}</span><small>/100</small></div>
    <strong>Nível ${diag.nivel}</strong>
    <p>${diag.score >= 80 ? 'Seu perfil está bem preparado para avançar nas oportunidades.' : 'Você já tem uma base. Foque nos próximos passos para evoluir rápido.'}</p>
    <h3>Próximos passos recomendados</h3>
    <ul>${(proximos.length ? proximos : ['manter currículo atualizado', 'registrar candidaturas', 'treinar entrevista']).map((item) => `<li>${item}</li>`).join('')}</ul>
  `;
}

async function salvarDiagnostico() {
  const diag = calcularDiagnostico();
  if (!diag) return;
  Estado.diagnostico = diag;
  salvarLocal();
  renderizarDiagnostico();
  renderizarTrilha();
  atualizarScore();
  atualizarDashboard();
  await pontuar('diagnostico_realizado', 'Diagnóstico realizado', '🧭');
  mostrarToast('✅ Diagnóstico atualizado!');
}

function calcularTrilha() {
  const p = Estado.perfil || {};
  const steps = [
    { id: 'perfil', title: 'Complete seu perfil', desc: 'Dados básicos para currículo e banco de talentos.', done: !!(p.nome && p.telefone && p.cidade && p.area_interesse), view: 'perfil' },
    { id: 'diagnostico', title: 'Faça o diagnóstico', desc: 'Descubra seu nível de empregabilidade.', done: !!Estado.diagnostico, view: 'diagnostico' },
    { id: 'curriculo', title: 'Gere seu currículo', desc: 'Escolha um modelo e emita o PDF.', done: Estado.curriculos.length > 0, view: 'curriculo' },
    { id: 'apresentacao', title: 'Crie seu “Fale sobre você”', desc: 'Tenha uma fala pronta para entrevista.', done: Estado.apresentacoes.length > 0, view: 'apresentacao' },
    { id: 'entrevista', title: 'Simule uma entrevista', desc: 'Responda e receba feedback imediato.', done: Estado.entrevistas.length > 0, view: 'entrevista' },
    { id: 'ats', title: 'Analise uma vaga', desc: 'Compare currículo e descrição da vaga.', done: Estado.curriculos.some(c => c.ats_score) || !!carregarLocal().ats_realizado, view: 'ats' },
    { id: 'selo', title: 'Receba seu selo EVOLUE', desc: 'Conclua a trilha para liberar o Perfil Preparado.', done: false, view: 'dashboard' }
  ];
  const baseDone = steps.slice(0, 6).filter(step => step.done).length;
  steps[6].done = baseDone >= 5;
  return { steps, done: steps.filter(step => step.done).length, total: steps.length };
}

function renderizarTrilha() {
  const grid = document.getElementById('trailSteps');
  if (!grid) return;
  const trilha = calcularTrilha();
  const percent = Math.round((trilha.done / trilha.total) * 100);
  setEl('trailProgressLabel', `${percent}%`);
  const bar = document.getElementById('trailProgressBar');
  if (bar) bar.style.width = `${percent}%`;
  const next = trilha.steps.find(step => !step.done);
  setEl('trailNextAction', next ? `Próxima etapa: ${next.title}` : 'Trilha concluída. Perfil Preparado EVOLUE liberado.');
  grid.innerHTML = trilha.steps.map((step, index) => `
    <article class="trail-step ${step.done ? 'done' : ''}">
      <span>${step.done ? '✓' : index + 1}</span>
      <div>
        <strong>${step.title}</strong>
        <p>${step.desc}</p>
      </div>
      <button type="button" class="ghost" onclick="navegarPara('${step.view}')">${step.done ? 'Revisar' : 'Fazer'}</button>
    </article>
  `).join('');
}

function gerarTextoApresentacao() {
  const p = Estado.perfil || {};
  const area = document.getElementById('apArea')?.value?.trim() || p.area_interesse || 'área de interesse';
  const experiencia = document.getElementById('apExperiencia')?.value?.trim() || p.experiencia || 'minhas experiências e aprendizados';
  const qualidade = document.getElementById('apQualidade')?.value?.trim() || 'responsabilidade';
  const objetivo = document.getElementById('apObjetivo')?.value?.trim() || 'crescer profissionalmente e contribuir com a equipe';
  const tipo = document.getElementById('apTipo')?.value || 'curta';
  const nome = p.nome || 'Meu nome é';
  const inicio = nome === 'Meu nome é' ? 'Meu nome é [seu nome]' : `Meu nome é ${nome}`;
  const base = `${inicio}. Tenho interesse em atuar na área de ${area}. Minha principal experiência envolve ${experiencia}. Eu me considero uma pessoa com ${qualidade}, e meu objetivo é ${objetivo}.`;
  if (tipo === 'primeiro') return `${inicio}. Estou buscando minha primeira oportunidade na área de ${area}. Mesmo com pouca experiência formal, venho me preparando por meio de estudos, cursos e atividades práticas. Tenho como ponto forte ${qualidade} e quero uma oportunidade para aprender, contribuir e crescer profissionalmente.`;
  if (tipo === 'online') return `${base} Em uma entrevista online, gosto de ser objetivo(a), escutar com atenção e explicar minhas experiências com clareza. Estou disponível para conversar melhor sobre como posso contribuir para a vaga.`;
  if (tipo === 'media') return `${base} Nos últimos tempos, desenvolvi habilidades importantes como comunicação, organização e vontade de aprender. Acredito que posso contribuir com dedicação, postura profissional e interesse real em evoluir junto com a empresa.`;
  return `${base} Acredito que posso contribuir com dedicação, aprendizado rápido e postura profissional.`;
}

function gerarApresentacao() {
  const texto = gerarTextoApresentacao();
  const box = document.getElementById('apresentacaoResultado');
  if (box) {
    box.className = 'speech-card';
    box.innerHTML = `<p>${texto}</p><small>Dica: leia em voz alta 3 vezes e troque palavras que não soarem naturais.</small>`;
  }
  const acoes = document.getElementById('apresentacaoAcoes');
  if (acoes) acoes.style.display = 'flex';
}

function copiarApresentacao() {
  const texto = document.getElementById('apresentacaoResultado')?.innerText || '';
  navigator.clipboard?.writeText(texto).then(() => mostrarToast('📋 Apresentação copiada!')).catch(() => mostrarToast('Copie manualmente o texto gerado.'));
}

async function salvarApresentacao() {
  const texto = document.getElementById('apresentacaoResultado')?.innerText?.trim();
  if (!texto || texto.includes('Preencha os campos')) { mostrarToast('⚠️ Gere uma apresentação primeiro.'); return; }
  Estado.apresentacoes.unshift({ id: Date.now(), texto, created_at: new Date().toISOString() });
  salvarLocal();
  renderizarTrilha();
  atualizarScore();
  atualizarDashboard();
  await pontuar('apresentacao_criada', 'Apresentação criada', '🎙️');
  mostrarToast('✅ Apresentação salva!');
}

// ── Currículo ─────────────────────────────────────────────────
function renderizarPrevia() {
  const form = document.getElementById('resumeForm');
  const preview = document.getElementById('resumePreview');
  if (!form || !preview) return;
  const tpl = form.querySelector('[name="template"]:checked')?.value || 'evolue';
  const p = Estado.perfil || {};
  const obj = form.querySelector('[name="objetivo"]')?.value || '';
  const exp = form.querySelector('[name="experiencias"]')?.value || '';
  const cur = form.querySelector('[name="cursos"]')?.value || '';
  const hab = form.querySelector('[name="habilidades"]')?.value || '';
  const idi = form.querySelector('[name="idiomas"]')?.value || '';
  const com = form.querySelector('[name="complementares"]')?.value || '';
  const linhas = txt => txt ? txt.split('\n').filter(Boolean).map(l=>`<li>${l}</li>`).join('') : '';

  if (tpl === 'evolue') {
    preview.className = 'resume-preview';
    preview.innerHTML = `
      <div class="resume-evolue-header">
        <span class="resume-kicker">EVOLUE Validado ★</span>
        <h2>${p.nome||'Seu Nome'}</h2>
        <p>${p.email||''} ${p.telefone?'· '+p.telefone:''} ${p.cidade?'· '+p.cidade:''}</p>
      </div>
      ${obj?`<h3>Objetivo</h3><p>${obj}</p>`:''}
      ${exp?`<h3>Experiência</h3><ul>${linhas(exp)}</ul>`:''}
      ${cur?`<h3>Formação & Cursos</h3><ul>${linhas(cur)}</ul>`:''}
      ${hab?`<h3>Habilidades</h3><p>${hab}</p>`:''}
      ${idi?`<h3>Idiomas</h3><p>${idi}</p>`:''}
      ${com?`<h3>Complementar</h3><p>${com}</p>`:''}
      ${Estado.disc?`<h3>Perfil DISC</h3><p>Predominante: <strong>${Estado.disc.perfil_predominante||''}</strong></p>`:''}
      <h3>Validado por</h3><p><strong>EVOLUE Treinamento e Desenvolvimento</strong></p>`;
  } else if (tpl === 'essencial') {
    preview.className = 'resume-preview';
    preview.style.boxShadow = 'inset 6px 0 0 #09234c';
    preview.innerHTML = `<h2>${p.nome||'Seu Nome'}</h2><p>${p.email||''} ${p.telefone?'· '+p.telefone:''}</p>
      ${obj?`<h3>Objetivo</h3><p>${obj}</p>`:''}
      ${exp?`<h3>Experiência</h3><ul>${linhas(exp)}</ul>`:''}
      ${cur?`<h3>Formação</h3><ul>${linhas(cur)}</ul>`:''}
      ${hab?`<h3>Habilidades</h3><p>${hab}</p>`:''}
      ${idi?`<h3>Idiomas</h3><p>${idi}</p>`:''}`;
  } else {
    preview.className = 'resume-preview';
    preview.style.boxShadow = 'inset 6px 0 0 #52b788';
    preview.innerHTML = `<span class="resume-kicker">Primeiro Emprego</span>
      <h2>${p.nome||'Seu Nome'}</h2><p>${p.email||''}</p>
      ${obj?`<h3>Objetivo</h3><p>${obj}</p>`:''}
      ${cur?`<h3>Formação & Cursos</h3><ul>${linhas(cur)}</ul>`:''}
      ${hab?`<h3>Habilidades</h3><p>${hab}</p>`:''}
      ${exp?`<h3>Experiências</h3><ul>${linhas(exp)}</ul>`:''}
      ${idi?`<h3>Idiomas</h3><p>${idi}</p>`:''}`;
  }
}

async function emitirPDF() {
  const p = Estado.perfil;
  const count = p?.curriculos_emitidos || 0;
  if (count >= 6 && p?.plano === 'free') { mostrarToast('⚠️ Limite atingido. A partir da 7ª emissão: R$1,99.'); return; }
  renderizarPrevia();
  await salvarCurriculo();
  if (temBanco()) await SB().from('profiles').update({ curriculos_emitidos: count+1 }).eq('id', Auth.getUsuario().id);
  if (Estado.perfil) Estado.perfil.curriculos_emitidos = count+1;
  salvarLocal();
  atualizarUsageCard();
  renderizarTrilha();
  atualizarDashboard();
  await pontuar('curriculo_gerado', 'Currículo gerado', '📄');
  window.print();
}

async function salvarCurriculo() {
  const form = document.getElementById('resumeForm'); if (!form) return;
  const userId = Auth.getUsuario()?.id || 'demo-user';
  const dados = {
    user_id:       userId,
    template:      form.querySelector('[name="template"]:checked')?.value || 'evolue',
    objetivo:      form.querySelector('[name="objetivo"]')?.value || '',
    experiencias:  form.querySelector('[name="experiencias"]')?.value || '',
    cursos:        form.querySelector('[name="cursos"]')?.value || '',
    habilidades:   form.querySelector('[name="habilidades"]')?.value || '',
    idiomas:       form.querySelector('[name="idiomas"]')?.value || '',
    complementares:form.querySelector('[name="complementares"]')?.value || '',
  };
  if (!temBanco()) {
    Estado.curriculos.unshift({ ...dados, id: Date.now(), created_at: new Date().toISOString() });
    salvarLocal();
    atualizarScore();
    atualizarDashboard();
    return;
  }

  const { data } = await SB().from('curriculos').insert(dados).select().single();
  if (data) Estado.curriculos.unshift(data);
}

function atualizarUsageCard() {
  const count = Estado.perfil?.curriculos_emitidos || 0;
  setEl('freeResumeCount', Math.max(0, 6-count));
  document.getElementById('usageCard')?.classList.toggle('is-paid', count >= 6);
}

function sugerirMelhorias() {
  const form = document.getElementById('resumeForm');
  const sug  = document.getElementById('resumeSuggestions');
  if (!form || !sug) return;
  const sugestoes = [];
  const exp = form.querySelector('[name="experiencias"]')?.value || '';
  const hab = form.querySelector('[name="habilidades"]')?.value || '';
  const obj = form.querySelector('[name="objetivo"]')?.value || '';
  if (!obj) sugestoes.push('Adicione um <strong>objetivo profissional</strong> claro.');
  if (exp.length < 100) sugestoes.push('Descreva suas <strong>experiências com mais detalhes</strong>.');
  if (!hab) sugestoes.push('Liste suas <strong>habilidades</strong>.');
  if (!/\d/.test(exp)) sugestoes.push('Use <strong>números</strong>: "aumentei 30%", "atendi 50 clientes".');
  sug.innerHTML = sugestoes.length
    ? '<strong style="font-size:13px;color:#09234c">💡 Sugestões:</strong><ul style="margin:8px 0 0;padding-left:16px;font-size:13px;color:#667085">' + sugestoes.map(s=>`<li>${s}</li>`).join('') + '</ul>'
    : '<p style="font-size:13px;color:#027a48">✅ Currículo bem estruturado!</p>';
}

// ── ATS Score ─────────────────────────────────────────────────
const ATSMotor = (() => {
  const STOP = new Set(['de','da','do','das','dos','em','no','na','e','ou','a','o','um','uma','para','por','com','que','se','ao','como','mais','ser','ter','foi','são','está']);
  const norm = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const tokens = t => norm(t).split(' ').filter(x=>x.length>2&&!STOP.has(x));
  const bigs = tks => { const b=[]; for(let i=0;i<tks.length-1;i++) b.push(tks[i]+' '+tks[i+1]); return b; };
  const freq = tks => { const f={}; tks.forEach(t=>f[t]=(f[t]||0)+1); return f; };
  const top = (txt,n=40) => { const tks=tokens(txt),bg=bigs(tks),f=freq([...tks,...bg]); return Object.entries(f).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([t])=>t); };
  return {
    analisar(cur, vag) {
      const vTks=tokens(vag), vBg=bigs(vTks), kws=top(vag,40);
      const cTks=tokens(cur), cBg=bigs(cTks);
      const enc=[], aus=[];
      kws.forEach(kw => {
        const n=norm(kw);
        const ok=cTks.some(t=>t===n||t.includes(n)||n.includes(t))||cBg.some(b=>b===n||b.includes(n));
        (ok?enc:aus).push({termo:kw, rel:vTks.filter(x=>x===n).length+vBg.filter(x=>x===n).length*2});
      });
      const totR=kws.reduce((s,kw)=>s+vTks.filter(x=>x===norm(kw)).length,0);
      const encR=enc.reduce((s,i)=>s+i.rel,0);
      const score=Math.min(98,Math.round(totR>0?(encR/totR)*100*.85+Math.min(10,cTks.length/50):0));
      return { score, enc: enc.sort((a,b)=>b.rel-a.rel), aus: aus.sort((a,b)=>b.rel-a.rel), total: kws.length };
    }
  };
})();

async function analisarATS() {
  const cur = document.getElementById('atsCurriculo')?.value?.trim();
  const vag = document.getElementById('atsVaga')?.value?.trim();
  const div = document.getElementById('atsConteudo');
  if (!div) return;
  if (!cur || !vag) { mostrarToast('⚠️ Cole o currículo e a vaga.'); return; }
  div.innerHTML = '<div class="empty-state">⏳ Analisando...</div>';
  const { score, enc, aus, total } = ATSMotor.analisar(cur, vag);
  const cor = score>=80?'#22c55e':score>=60?'#f59e0b':score>=40?'#f97316':'#ef4444';
  const nivel = score>=80?'Excelente':score>=60?'Boa compatibilidade':score>=40?'Compatibilidade parcial':'Baixa compatibilidade';
  div.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:52px;font-weight:800;color:${cor};line-height:1">${score}%</div>
      <div style="font-size:14px;font-weight:700;color:#09234c;margin-top:4px">${nivel}</div>
      <div style="font-size:12px;color:#667085;margin-top:4px">${enc.length} de ${total} palavras-chave encontradas</div>
    </div>
    <div style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:800;color:#09234c;margin-bottom:8px">✅ Encontradas</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">${enc.slice(0,15).map(i=>`<span style="font-size:11px;padding:3px 9px;border-radius:99px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;font-weight:600">✓ ${i.termo}</span>`).join('')}</div>
    </div>
    <div>
      <div style="font-size:12px;font-weight:800;color:#09234c;margin-bottom:8px">❌ Ausentes — adicione ao currículo</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">${aus.slice(0,15).map(i=>`<span style="font-size:11px;padding:3px 9px;border-radius:99px;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;font-weight:600">✗ ${i.termo}</span>`).join('')}</div>
    </div>`;
  salvarLocal({ ats_realizado: true });
  renderizarTrilha();
  atualizarDashboard();
  await pontuar('ats_score_feito', 'ATS Score realizado', '⚡');
  mostrarToast('✅ Análise concluída!');
}

// ── Cover Letter ──────────────────────────────────────────────
function gerarCoverLetter() {
  const empresa = document.getElementById('coverEmpresa')?.value?.trim();
  const cargo   = document.getElementById('coverCargo')?.value?.trim();
  const vaga    = document.getElementById('coverVaga')?.value?.trim();
  const tom     = document.getElementById('coverTom')?.value || 'profissional';
  const div     = document.getElementById('coverConteudo');
  const acoes   = document.getElementById('coverAcoes');
  const p = Estado.perfil || {};
  if (!empresa || !cargo) { mostrarToast('⚠️ Preencha empresa e cargo.'); return; }

  const saudacao = tom==='formal'?'À Comissão de Seleção,':tom==='entusiasmado'?`Olá, time da ${empresa}!`:'Prezados(as),';
  const abertura = tom==='entusiasmado'
    ?`Estou muito animado(a) com a oportunidade de me candidatar para a vaga de <strong>${cargo}</strong> na <strong>${empresa}</strong>!`
    :`Venho manifestar meu interesse na vaga de <strong>${cargo}</strong> na <strong>${empresa}</strong>.`;

  const carta = `<div style="font-size:14px;line-height:1.8;color:#344054">
    <p style="margin-bottom:12px">${saudacao}</p>
    <p style="margin-bottom:12px">${abertura}</p>
    <p style="margin-bottom:12px">Com experiência em ${p.area_interesse||cargo}, acredito que posso contribuir significativamente com os objetivos da ${empresa}.</p>
    ${vaga?`<p style="margin-bottom:12px">Ao analisar a descrição da vaga, identifiquei forte aderência entre meu perfil e os requisitos da posição.</p>`:''}
    <p style="margin-bottom:12px">Estou à disposição para uma entrevista e aguardo a oportunidade de apresentar minha trajetória.</p>
    <p style="margin-bottom:4px">Atenciosamente,</p>
    <p><strong>${p.nome||'Seu Nome'}</strong><br>${p.email||''} ${p.telefone?'· '+p.telefone:''}</p>
  </div>`;

  if (div) div.innerHTML = carta;
  if (acoes) acoes.style.display = 'flex';
  pontuar('cover_letter_gerada', 'Cover Letter gerada', '✉️');
  mostrarToast('✅ Cover Letter gerada!');
}

async function salvarCoverLetter() {
  const userId = Auth.getUsuario()?.id || 'demo-user';
  if (!temBanco()) {
    mostrarToast('💾 Cover Letter salva localmente!');
    return;
  }

  await SB().from('cover_letters').insert({
    user_id: userId,
    empresa: document.getElementById('coverEmpresa')?.value?.trim(),
    cargo:   document.getElementById('coverCargo')?.value?.trim(),
    descricao_vaga: document.getElementById('coverVaga')?.value?.trim(),
    conteudo: document.getElementById('coverConteudo')?.innerText || '',
    tom: document.getElementById('coverTom')?.value,
  });
  mostrarToast('💾 Cover Letter salva!');
}

function copiarCoverLetter() {
  navigator.clipboard.writeText(document.getElementById('coverConteudo')?.innerText||'')
    .then(()=>mostrarToast('📋 Copiado!')).catch(()=>mostrarToast('❌ Erro ao copiar.'));
}

// ── Entrevista ────────────────────────────────────────────────
function renderizarPergunta() {
  setEl('currentQuestion', PERGUNTAS[Estado.questaoAtual]);
  setEl('questionCounter', `Pergunta ${Estado.questaoAtual+1} de ${PERGUNTAS.length}`);
  const inp = document.getElementById('answerInput'); if (inp) inp.value='';
  const fb  = document.getElementById('answerFeedback'); if (fb) fb.innerHTML='';
}

async function analisarResposta() {
  const resp = document.getElementById('answerInput')?.value?.trim();
  const fb   = document.getElementById('answerFeedback');
  if (!fb) return;
  if (!resp || resp.length < 20) { fb.innerHTML='<p style="color:#b42318">⚠️ Escreva uma resposta mais completa.</p>'; return; }
  const fbs = [];
  if (resp.length>200) fbs.push('✅ Resposta bem desenvolvida.');
  else fbs.push('💡 Desenvolva mais com exemplos concretos.');
  if (/\d/.test(resp)) fbs.push('✅ Ótimo — você usou números.');
  else fbs.push('💡 Inclua números ou resultados concretos.');
  const verbos=['fiz','realizei','liderei','desenvolvi','aumentei','criei'];
  if (verbos.some(v=>resp.toLowerCase().includes(v))) fbs.push('✅ Bom uso de verbos de ação.');
  else fbs.push('💡 Use verbos: "realizei", "liderei", "desenvolvi".');
  const pts = Math.min(10, 5 + (resp.length>150?1:0) + (resp.length>300?1:0) + (/\d/.test(resp)?1:0) + (verbos.some(v=>resp.toLowerCase().includes(v))?1:0));
  fb.innerHTML = `<div style="margin-bottom:10px"><strong style="font-size:13px;color:#09234c">Feedback — ${pts}/10</strong></div><ul style="margin:0;padding-left:16px;font-size:13px;color:#667085;line-height:1.7">${fbs.map(f=>`<li>${f}</li>`).join('')}</ul>`;
  const userId = Auth.getUsuario()?.id;
  if (userId) {
    if (temBanco()) {
      await SB().from('entrevistas').insert({ user_id:userId, pergunta:PERGUNTAS[Estado.questaoAtual], resposta:resp, feedback:fbs.join('|'), pontuacao:pts });
    }
    Estado.entrevistas.push({ pergunta:PERGUNTAS[Estado.questaoAtual], resposta:resp, feedback:fbs.join('|'), pontuacao:pts });
    salvarLocal();
    await pontuar('entrevista_simulada','Entrevista simulada','🎯');
    atualizarScore();
    atualizarDashboard();
  }
}

function proximaPergunta() {
  Estado.questaoAtual = (Estado.questaoAtual+1) % PERGUNTAS.length;
  renderizarPergunta();
}

function renderizarTips() {
  const grid = document.getElementById('tipsGrid'); if (!grid) return;
  const tpl = document.getElementById('tipTemplate');
  grid.innerHTML = '';
  TIPS.forEach(tip => {
    if (tpl) {
      const clone = tpl.content.cloneNode(true);
      clone.querySelector('strong').textContent = tip.titulo;
      clone.querySelector('p').textContent = tip.texto;
      grid.appendChild(clone);
    }
  });
}

// ── Job Tracker ───────────────────────────────────────────────
function renderizarKanban() {
  ['salvo','aplicado','entrevista','proposta','contratado'].forEach(status => {
    const col = document.getElementById(`col-${status}`);
    const cnt = document.getElementById(`cnt-${status}`);
    if (!col) return;
    const vagas = Estado.tracker.filter(v=>v.status===status);
    if (cnt) cnt.textContent = vagas.length;
    col.innerHTML = vagas.length
      ? vagas.map(v=>`<div class="kanban-card" onclick="mostrarToast('${v.empresa} — ${v.cargo}')">
          <div class="kanban-card-empresa">${v.empresa}</div>
          <div class="kanban-card-cargo">${v.cargo}</div>
          <div class="kanban-card-footer"><span>${v.data_aplicacao||''}</span>${v.ats_score?`<span class="kanban-ats">${v.ats_score}%</span>`:''}</div>
        </div>`).join('')
      : '<div style="font-size:12px;color:#94a3b8;text-align:center;padding:20px 0">Nenhuma vaga</div>';
  });
  const stats = document.getElementById('trackerStats');
  if (stats) {
    const total = Estado.tracker.length;
    const ativas = Estado.tracker.filter(v=>!['contratado','recusado'].includes(v.status)).length;
    stats.innerHTML = `<span class="tracker-stat">📊 ${total} total</span><span class="tracker-stat">🎯 ${ativas} em andamento</span>`;
  }
}

async function salvarVaga() {
  const userId = Auth.getUsuario()?.id || 'demo-user';
  const dados = {
    user_id: userId,
    empresa: document.getElementById('vagaEmpresa')?.value?.trim(),
    cargo:   document.getElementById('vagaCargo')?.value?.trim(),
    link_vaga: document.getElementById('vagaLink')?.value?.trim(),
    descricao_vaga: document.getElementById('vagaDescricao')?.value?.trim(),
    status: document.getElementById('vagaStatus')?.value||'salvo',
    salario_esperado: document.getElementById('vagaSalario')?.value?.trim(),
    anotacoes: document.getElementById('vagaAnotacoes')?.value?.trim(),
  };
  if (!dados.empresa||!dados.cargo) { mostrarToast('⚠️ Preencha empresa e cargo.'); return; }
  if (!temBanco()) {
    const data = { ...dados, id: Date.now(), created_at: new Date().toISOString(), data_aplicacao: new Date().toLocaleDateString('pt-BR') };
    Estado.tracker.unshift(data);
    renderizarKanban();
    atualizarDashboard();
    fecharModal();
    await pontuar('vaga_registrada','Candidatura registrada','📋');
    salvarLocal();
    mostrarToast('✅ Candidatura salva localmente!');
    return;
  }

  const { data, error } = await SB().from('job_tracker').insert(dados).select().single();
  if (error) { mostrarToast('❌ Erro ao salvar.'); return; }
  Estado.tracker.unshift(data);
  renderizarKanban();
  fecharModal();
  await pontuar('vaga_registrada','Candidatura registrada','📋');
  mostrarToast('✅ Candidatura salva!');
}

// ── DISC ──────────────────────────────────────────────────────
function preencherFormularioDisc() {
  const d = Estado.disc; if (!d) return;
  const form = document.getElementById('discForm'); if (!form) return;
  ['dominancia','influencia','estabilidade','conformidade'].forEach(c=>{
    const el=form.querySelector(`[name="${c}"]`); if(el) el.value=d[c]||25;
  });
  const perf=form.querySelector('[name="perfil"]'); if(perf) perf.value=d.perfil_predominante||'';
  const obs=form.querySelector('[name="observacoes"]'); if(obs) obs.value=d.observacoes||'';
  renderizarDisc();
}

function renderizarDisc() {
  const form=document.getElementById('discForm');
  const bars=document.getElementById('discBars');
  const summary=document.getElementById('discSummary');
  if (!form||!bars) return;
  const D=parseInt(form.querySelector('[name="dominancia"]')?.value)||25;
  const I=parseInt(form.querySelector('[name="influencia"]')?.value)||25;
  const S=parseInt(form.querySelector('[name="estabilidade"]')?.value)||25;
  const C=parseInt(form.querySelector('[name="conformidade"]')?.value)||25;
  bars.innerHTML=[['Dominância',D],['Influência',I],['Estabilidade',S],['Conformidade',C]].map(([l,v])=>`
    <div class="disc-row"><div><span>${l}</span><span>${v}%</span></div>
    <div class="disc-track"><span style="width:${v}%"></span></div></div>`).join('');
  const perfil=form.querySelector('[name="perfil"]')?.value;
  const desc={'Dominância':'Direto, decisivo e orientado a resultados.','Influência':'Comunicativo, entusiasta e sociável.','Estabilidade':'Paciente, confiável e consistente.','Conformidade':'Analítico, cuidadoso e preciso.'};
  if (summary&&perfil&&desc[perfil]) summary.innerHTML=`<article><strong>${perfil}</strong><p>${desc[perfil]}</p></article>`;
}

async function salvarDisc() {
  const userId=Auth.getUsuario()?.id || 'demo-user';
  const form=document.getElementById('discForm'); if (!form) return;
  const dados={
    user_id: userId,
    perfil_predominante: form.querySelector('[name="perfil"]')?.value,
    dominancia:   parseInt(form.querySelector('[name="dominancia"]')?.value)||25,
    influencia:   parseInt(form.querySelector('[name="influencia"]')?.value)||25,
    estabilidade: parseInt(form.querySelector('[name="estabilidade"]')?.value)||25,
    conformidade: parseInt(form.querySelector('[name="conformidade"]')?.value)||25,
    observacoes:  form.querySelector('[name="observacoes"]')?.value,
  };
  if (!temBanco()) {
    Estado.disc = { ...dados, id: Date.now(), created_at: new Date().toISOString() };
    await pontuar('disc_preenchido','DISC preenchido','🧠');
    renderizarDisc();
    atualizarScore();
    atualizarDashboard();
    salvarLocal();
    mostrarToast('✅ DISC salvo localmente!');
    return;
  }

  const { data, error } = await SB().from('disc_results').insert(dados).select().single();
  if (error) { mostrarToast('❌ Erro ao salvar DISC.'); return; }
  Estado.disc=data;
  await pontuar('disc_preenchido','DISC preenchido','🧠');
  atualizarScore();
  mostrarToast('✅ DISC salvo!');
}

// ── Dashboard ─────────────────────────────────────────────────
function atualizarDashboard() {
  const p=Estado.perfil; if (!p) return;
  let score=0;
  if(p.nome) score+=5; if(p.email) score+=5; if(p.telefone) score+=5;
  if(p.cidade) score+=5; if(p.escolaridade) score+=5; if(p.area_interesse) score+=5;
  if(Estado.diagnostico) score+=10; if(Estado.apresentacoes.length>0) score+=10;
  if(Estado.curriculos.length>0) score+=25; if(Estado.disc) score+=20;
  if(Estado.entrevistas.length>0) score+=15;
  score=Math.min(score,100);
  const selo=score>=80?'Ouro':score>=40?'Prata':'Bronze';
  setEl('metricScore',score); setEl('metricLevel',selo);
  setEl('metricPoints',p.career_points||0); setEl('metricArea',p.area_interesse||'-');
  setEl('metricDisc',Estado.disc?.perfil_predominante||'-'); setEl('metricVagas',Estado.tracker.length);
  const checks=[
    {label:'Perfil completo', done:!!(p.nome&&p.telefone&&p.cidade&&p.escolaridade)},
    {label:'Diagnóstico realizado', done:!!Estado.diagnostico},
    {label:'Trilha iniciada', done:calcularTrilha().done>0},
    {label:'Apresentação criada', done:Estado.apresentacoes.length>0},
    {label:'Currículo gerado', done:Estado.curriculos.length>0},
    {label:'DISC preenchido', done:!!Estado.disc},
    {label:'Entrevista simulada', done:Estado.entrevistas.length>0},
    {label:'ATS Score realizado', done:Estado.curriculos.some(c=>c.ats_score)},
    {label:'Candidatura registrada', done:Estado.tracker.length>0},
  ];
  const cl=document.getElementById('validationChecklist');
  if (cl) cl.innerHTML=checks.map(c=>`<div class="check-item ${c.done?'done':''}"><div class="check-dot"></div><span style="font-size:13px;color:${c.done?'#027a48':'#667085'}">${c.label}</span>${c.done?'<span style="margin-left:auto;font-size:12px;color:#027a48">✅</span>':''}</div>`).join('');
}

function renderizarRecomendacoes() {
  const grid=document.getElementById('recommendations'); if (!grid) return;
  grid.innerHTML=RECOMENDACOES.map(r=>`<div class="recommendation" onclick="navegarPara('${r.view}')"><strong>${r.titulo}</strong><p>${r.texto}</p></div>`).join('');
}

// ── Gamificação ───────────────────────────────────────────────
async function pontuar(tipo, motivo, icone) {
  const userId=Auth.getUsuario()?.id || 'demo-user';
  const pts = {cadastro_completo:10,diagnostico_realizado:6,apresentacao_criada:6,curriculo_gerado:8,entrevista_simulada:5,disc_preenchido:8,vaga_registrada:3,ats_score_feito:4,cover_letter_gerada:4}[tipo]||1;
  if (!temBanco()) {
    if (Estado.perfil) {
      Estado.perfil.career_points = (Estado.perfil.career_points || 0) + pts;
      setEl('careerPoints', Estado.perfil.career_points);
      salvarLocal();
    }
    return;
  }

  try {
    await SB().rpc('adicionar_career_points',{p_user_id:userId,p_pontos:pts,p_motivo:motivo,p_icone:icone});
    if (Estado.perfil) { Estado.perfil.career_points=(Estado.perfil.career_points||0)+pts; setEl('careerPoints',Estado.perfil.career_points); }
  } catch(e) {}
}

// ── Modal ─────────────────────────────────────────────────────
function abrirModal() { document.getElementById('modalVaga')?.classList.remove('hidden'); }
function fecharModal() {
  document.getElementById('modalVaga')?.classList.add('hidden');
  ['vagaEmpresa','vagaCargo','vagaLink','vagaDescricao','vagaAnotacoes','vagaSalario'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
}

// ── Toast ─────────────────────────────────────────────────────
function mostrarToast(msg, dur=3000) {
  const t=document.getElementById('toast'); if (!t) return;
  t.textContent=msg; t.classList.remove('hidden');
  clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.add('hidden'),dur);
}

function mostrarMensagem(el,tipo,txt) {
  if (!el) return;
  el.className=`form-msg ${tipo}`; el.innerHTML=txt;
  setTimeout(()=>{el.className='form-msg';el.innerHTML='';},4000);
}

function setEl(id,val) { const el=document.getElementById(id); if(el) el.textContent=val; }

// ── Dados de exemplo ──────────────────────────────────────────
function preencherExemplo() {
  const pf=document.getElementById('profileForm');
  if (pf) {
    pf.querySelector('[name="nome"]').value='Ana Clara Souza';
    pf.querySelector('[name="email"]').value='ana.souza@email.com';
    pf.querySelector('[name="telefone"]').value='(11) 98765-4321';
    pf.querySelector('[name="cidade"]').value='São Paulo - SP';
    pf.querySelector('[name="escolaridade"]').value='Superior Completo — Administração';
    pf.querySelector('[name="area"]').value='Administrativo / Comercial';
    pf.querySelector('[name="experiencia"]').value='Assistente Administrativa — Empresa XYZ (2022-2024)';
  }
  const rf=document.getElementById('resumeForm');
  if (rf) {
    rf.querySelector('[name="objetivo"]').value='Atuar como Assistente Administrativa contribuindo com organização e resultados.';
    rf.querySelector('[name="experiencias"]').value='Assistente Administrativa — Empresa XYZ (2022–2024)\nAtendimento, organização, planilhas e suporte comercial.';
    rf.querySelector('[name="cursos"]').value='Excel Avançado — Senac (2023)\nAtendimento ao Cliente — SEBRAE (2022)';
    rf.querySelector('[name="habilidades"]').value='Comunicação, organização, Excel, atendimento, proatividade.';
    rf.querySelector('[name="idiomas"]').value='Português nativo, Inglês básico';
    rf.querySelector('[name="complementares"]').value='Disponibilidade imediata. CNH categoria B.';
    renderizarPrevia();
  }
  mostrarToast('✅ Dados de exemplo preenchidos!');
}

function limparDados() {
  document.querySelectorAll('input:not([type="radio"]):not([type="file"]),textarea,select').forEach(el=>{ el.value=el.tagName==='SELECT'?el.options[0]?.value||'':''; });
  const p=document.getElementById('resumePreview'); if(p) p.innerHTML='';
  Estado.curriculos = [];
  Estado.disc = null;
  Estado.entrevistas = [];
  Estado.tracker = [];
  Estado.diagnostico = null;
  Estado.apresentacoes = [];
  if (Estado.perfil) {
    Estado.perfil.curriculos_emitidos = 0;
    Estado.perfil.career_points = 0;
  }
  salvarLocal();
  atualizarScore();
  atualizarDashboard();
  renderizarKanban();
  renderizarDiagnostico();
  renderizarTrilha();
  atualizarUsageCard();
  mostrarToast('🗑️ Dados locais limpos.');
}

// ── Eventos ───────────────────────────────────────────────────
function configurarEventos() {
  // Auth tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const alvo=tab.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f=>f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`form${alvo.charAt(0).toUpperCase()+alvo.slice(1)}`)?.classList.add('active');
    });
  });

  // Auth actions
  document.getElementById('btnEntrar')?.addEventListener('click', async () => {
    const email=document.getElementById('loginEmail')?.value?.trim();
    const senha=document.getElementById('loginSenha')?.value;
    const erro=document.getElementById('loginErro');
    if(erro){erro.textContent='';erro.style.display='none';}
    try { await Auth.entrar({email,senha}); }
    catch(e) { if(erro){erro.textContent=e.message;erro.style.display='block';} }
  });

  document.getElementById('btnCadastrar')?.addEventListener('click', async () => {
    const nome=document.getElementById('cadNome')?.value?.trim();
    const email=document.getElementById('cadEmail')?.value?.trim();
    const senha=document.getElementById('cadSenha')?.value;
    const erro=document.getElementById('cadErro');
    if(erro){erro.textContent='';erro.style.display='none';}
    try {
      await Auth.cadastrar({nome,email,senha});
      mostrarToast('✅ Conta criada! Verifique seu e-mail para confirmar.');
      if(erro){erro.textContent='✅ Verifique seu e-mail para confirmar o cadastro.';erro.style.display='block';erro.style.color='#027a48';}
    } catch(e) {
      if(erro){
        erro.innerHTML=`${e.message}<br><button type="button" class="btn-demo full" onclick="Auth.entrarDemo()">Entrar em modo demonstração</button>`;
        erro.style.display='block';
      }
    }
  });

  document.getElementById('btnGoogle')?.addEventListener('click', ()=>Auth.entrarComGoogle());
  document.getElementById('btnGoogleCad')?.addEventListener('click', ()=>Auth.entrarComGoogle());
  document.getElementById('btnDemoLogin')?.addEventListener('click', ()=>Auth.entrarDemo());
  document.getElementById('btnDemoCad')?.addEventListener('click', ()=>Auth.entrarDemo());
  document.getElementById('linkEsqueceuSenha')?.addEventListener('click', async (e)=>{
    e.preventDefault();
    const email=document.getElementById('loginEmail')?.value?.trim();
    if(!email){mostrarToast('⚠️ Digite seu e-mail primeiro.');return;}
    await Auth.resetarSenha(email);
    mostrarToast('📧 E-mail de redefinição enviado!');
  });
  document.getElementById('btnLogout')?.addEventListener('click', ()=>Auth.sair());

  // Enter nos inputs
  document.getElementById('loginSenha')?.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('btnEntrar')?.click();});
  document.getElementById('cadSenha')?.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('btnCadastrar')?.click();});

  // Navegação
  document.querySelectorAll('.nav-item[data-view]').forEach(btn=>{
    btn.addEventListener('click',()=>navegarPara(btn.dataset.view));
  });

  // Perfil
  document.getElementById('btnSalvarPerfil')?.addEventListener('click', salvarPerfil);

  // Diagnóstico / Trilha / Apresentação
  document.getElementById('btnSalvarDiagnostico')?.addEventListener('click', salvarDiagnostico);
  document.getElementById('diagnosticoForm')?.addEventListener('change', () => {
    Estado.diagnostico = calcularDiagnostico();
    renderizarDiagnostico();
  });
  document.getElementById('btnGerarApresentacao')?.addEventListener('click', gerarApresentacao);
  document.getElementById('btnCopiarApresentacao')?.addEventListener('click', copiarApresentacao);
  document.getElementById('btnSalvarApresentacao')?.addEventListener('click', salvarApresentacao);

  // Currículo
  document.getElementById('improveResume')?.addEventListener('click', sugerirMelhorias);
  document.getElementById('printResume')?.addEventListener('click', emitirPDF);
  document.querySelectorAll('.template-option').forEach(opt=>{
    opt.addEventListener('click',()=>{
      document.querySelectorAll('.template-option').forEach(o=>o.classList.remove('active'));
      opt.classList.add('active'); renderizarPrevia();
    });
  });
  document.getElementById('resumeForm')?.addEventListener('input', renderizarPrevia);

  // ATS
  document.getElementById('btnAnalisarATS')?.addEventListener('click', analisarATS);

  // Cover
  document.getElementById('btnGerarCover')?.addEventListener('click', gerarCoverLetter);
  document.getElementById('btnSalvarCover')?.addEventListener('click', salvarCoverLetter);
  document.getElementById('btnCopiarCover')?.addEventListener('click', copiarCoverLetter);

  // Entrevista
  document.getElementById('analyzeAnswer')?.addEventListener('click', analisarResposta);
  document.getElementById('nextQuestion')?.addEventListener('click', proximaPergunta);
  renderizarPergunta();

  // DISC
  document.getElementById('discForm')?.addEventListener('input', renderizarDisc);
  document.getElementById('btnSalvarDisc')?.addEventListener('click', salvarDisc);

  // Tracker
  document.getElementById('btnNovaVaga')?.addEventListener('click', abrirModal);
  document.getElementById('btnFecharModal')?.addEventListener('click', fecharModal);
  document.getElementById('btnCancelarModal')?.addEventListener('click', fecharModal);
  document.getElementById('btnSalvarVaga')?.addEventListener('click', salvarVaga);
  document.getElementById('modalVaga')?.addEventListener('click',e=>{if(e.target.id==='modalVaga')fecharModal();});

  // Utilitários
  document.getElementById('seedData')?.addEventListener('click', preencherExemplo);
  document.getElementById('clearData')?.addEventListener('click', limparDados);
}
