// ============================================================
// EVOLUE CARREIRAS — App Principal v2.0
// app.js — Lógica completa integrada ao Supabase
// ============================================================

// ── Estado global ────────────────────────────────────────────
const Estado = {
  perfil:      null,
  curriculos:  [],
  disc:        null,
  entrevistas: [],
  tracker:     [],
  viewAtual:   'perfil',
  questaoAtual: 0,
};

// ── Perguntas de entrevista ──────────────────────────────────
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
  { titulo: 'Pesquise a empresa', texto: 'Antes da entrevista, estude a história, missão, produtos e cultura da empresa. Isso demonstra interesse genuíno.' },
  { titulo: 'Use o método STAR', texto: 'Para perguntas comportamentais: Situação, Tarefa, Ação e Resultado. Estruture suas respostas com exemplos reais.' },
  { titulo: 'Linguagem corporal', texto: 'Mantenha contato visual, postura ereta e sorria. Sua comunicação não-verbal fala muito sobre sua confiança.' },
  { titulo: 'Prepare perguntas', texto: 'Tenha 2 a 3 perguntas prontas para fazer ao entrevistador. Mostra interesse e preparo.' },
  { titulo: 'Seja pontual', texto: 'Chegue 10 minutos antes. Em entrevistas online, teste a conexão e o equipamento com antecedência.' },
  { titulo: 'Fale de resultados', texto: 'Sempre que possível, use números: "aumentei as vendas em 20%", "atendi 50 clientes por dia".' },
];

const RECOMENDACOES = [
  { titulo: 'Complete seu perfil DISC', texto: 'O perfil comportamental aumenta suas chances no banco de talentos e ajuda o recrutador a entender seu estilo de trabalho.', view: 'disc' },
  { titulo: 'Simule uma entrevista', texto: 'Candidatos que praticam entrevistas têm 40% mais chances de aprovação. Use nosso simulador agora.', view: 'entrevista' },
  { titulo: 'Analise o ATS Score', texto: 'Mais de 75% das empresas usam filtros automáticos. Veja se seu currículo passa pelo ATS antes de enviar.', view: 'ats' },
  { titulo: 'Gere uma Cover Letter', texto: 'Uma carta de apresentação personalizada aumenta muito suas chances de ser chamado para entrevista.', view: 'cover' },
  { titulo: 'Registre suas candidaturas', texto: 'Use o Job Tracker para acompanhar todas as vagas e nunca perder um follow-up importante.', view: 'tracker' },
  { titulo: 'Atualize seu currículo', texto: 'Mantenha seu currículo sempre atualizado com suas últimas experiências e conquistas.', view: 'curriculo' },
];

// ══════════════════════════════════════════════════════════════
// INICIALIZAÇÃO
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await inicializarApp();
});

async function inicializarApp() {
  // Inicializa autenticação
  const { usuario, perfil } = await Auth.init();

  if (usuario) {
    Estado.perfil = perfil;
    mostrarApp();
    await carregarDados();
  } else {
    mostrarAuth();
  }

  // Eventos de auth
  window.addEventListener('evolue:login', async (e) => {
    Estado.perfil = e.detail.perfil;
    mostrarApp();
    await carregarDados();
  });

  window.addEventListener('evolue:logout', () => {
    mostrarAuth();
    resetarEstado();
  });

  configurarEventos();
}

// ══════════════════════════════════════════════════════════════
// CONTROLE DE TELAS
// ══════════════════════════════════════════════════════════════
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
  navegarPara('perfil');
}

function resetarEstado() {
  Estado.perfil = null;
  Estado.curriculos = [];
  Estado.disc = null;
  Estado.entrevistas = [];
  Estado.tracker = [];
}

// ══════════════════════════════════════════════════════════════
// CARREGAMENTO DE DADOS DO SUPABASE
// ══════════════════════════════════════════════════════════════
async function carregarDados() {
  const userId = Auth.getUsuario()?.id;
  if (!userId) return;

  try {
    // Carrega em paralelo
    const [perfil, curriculos, disc, entrevistas, tracker] = await Promise.all([
      window.supabaseClient.from('profiles').select('*').eq('id', userId).single(),
      window.supabaseClient.from('curriculos').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      window.supabaseClient.from('disc_results').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
      window.supabaseClient.from('entrevistas').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      window.supabaseClient.from('job_tracker').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    if (perfil.data)      { Estado.perfil      = perfil.data; }
    if (curriculos.data)  { Estado.curriculos  = curriculos.data; }
    if (disc.data?.[0])   { Estado.disc        = disc.data[0]; }
    if (entrevistas.data) { Estado.entrevistas = entrevistas.data; }
    if (tracker.data)     { Estado.tracker     = tracker.data; }

    preencherFormularioPerfil();
    preencherFormularioDisc();
    atualizarSidebar();
    atualizarScore();
    atualizarDashboard();
    renderizarKanban();

  } catch (err) {
    console.error('Erro ao carregar dados:', err);
  }
}

// ══════════════════════════════════════════════════════════════
// NAVEGAÇÃO
// ══════════════════════════════════════════════════════════════
function navegarPara(view) {
  Estado.viewAtual = view;

  // Remove active de todos
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Ativa o correto
  const btnAtivo = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (btnAtivo) btnAtivo.classList.add('active');

  const viewEl = document.getElementById(`view-${view}`);
  if (viewEl) viewEl.classList.add('active');

  // Títulos
  const titulos = {
    perfil:        { h: 'Painel do candidato', sub: 'Seus dados para currículo e banco de talentos.' },
    curriculo:     { h: 'Gerador de currículo', sub: 'Crie e exporte seu currículo profissional.' },
    ats:           { h: 'ATS Score', sub: 'Veja se seu currículo passa pelo filtro automático das empresas.' },
    cover:         { h: 'Cover Letter', sub: 'Carta de apresentação personalizada para cada vaga.' },
    entrevista:    { h: 'Simulador de entrevista', sub: 'Pratique e receba feedback imediato.' },
    tracker:       { h: 'Job Tracker', sub: 'Acompanhe todas as suas candidaturas.' },
    disc:          { h: 'Perfil DISC', sub: 'Seu perfil comportamental para entrevistas.' },
    recomendacoes: { h: 'Recomendações', sub: 'Próximos passos personalizados para sua jornada.' },
    dashboard:     { h: 'Dashboard EVOLUE', sub: 'Visão completa do seu perfil no banco de talentos.' },
  };

  const t = titulos[view] || { h: 'Plataforma EVOLUE', sub: '' };
  document.getElementById('viewTitle').textContent = t.h;
  document.getElementById('viewSubtitle').textContent = t.sub;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════════════════════
// SIDEBAR & SCORE
// ══════════════════════════════════════════════════════════════
function atualizarSidebar() {
  const p = Estado.perfil;
  if (!p) return;

  const nome = p.nome || 'Candidato';
  const iniciais = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'EV';

  document.getElementById('sidebarNome').textContent = nome.split(' ')[0];
  document.getElementById('sidebarAvatar').textContent = iniciais;
  document.getElementById('sidebarPlano').textContent = p.plano === 'pro' ? '⭐ Pro' : 'Free';
  document.getElementById('careerPoints').textContent = p.career_points || 0;

  const selo = p.selo || 'bronze';
  document.getElementById('levelLabel').textContent = EVOLUE_CONFIG.selos[selo]?.label || 'Bronze';

  atualizarScore();
}

function atualizarScore() {
  const p = Estado.perfil;
  if (!p) return;

  let score = 0;
  if (p.nome)           score += 5;
  if (p.email)          score += 5;
  if (p.telefone)       score += 5;
  if (p.cidade)         score += 5;
  if (p.escolaridade)   score += 5;
  if (p.area_interesse) score += 5;
  if (Estado.curriculos.length > 0)  score += 25;
  if (Estado.disc)                   score += 20;
  if (Estado.entrevistas.length > 0) score += 25;

  score = Math.min(score, 100);

  document.getElementById('scoreValue').textContent = score;
  document.getElementById('scoreBar').style.width = score + '%';

  const selo = score >= 80 ? 'ouro' : score >= 40 ? 'prata' : 'bronze';
  document.getElementById('levelLabel').textContent = EVOLUE_CONFIG.selos[selo]?.label || 'Bronze';

  // Talent card
  const p2 = Estado.perfil;
  const nome = p2?.nome || 'Novo candidato';
  const area = p2?.area_interesse || 'Área de interesse ainda não informada';
  const iniciais = nome.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() || 'EV';

  setEl('profileName', nome);
  setEl('profileArea', area);
  setEl('profileInitials', iniciais);
  setEl('resumeStatus',    Estado.curriculos.length  > 0 ? '✅ Concluído' : '⏳ Pendente');
  setEl('interviewStatus', Estado.entrevistas.length > 0 ? '✅ Concluído' : '⏳ Pendente');
  setEl('discStatus',      Estado.disc               ? '✅ Concluído' : '⏳ Pendente');

  // Next steps
  const steps = [];
  if (!p2?.nome)            steps.push('Preencha seu perfil completo');
  if (!Estado.curriculos.length)  steps.push('Gere seu primeiro currículo');
  if (!Estado.disc)               steps.push('Preencha o perfil DISC');
  if (!Estado.entrevistas.length) steps.push('Simule uma entrevista');

  const ns = document.getElementById('nextSteps');
  if (ns) {
    ns.innerHTML = steps.length
      ? '<strong style="font-size:12px;color:#667085">Próximos passos:</strong><ul style="margin:6px 0 0;padding-left:16px;font-size:12px;color:#667085">' + steps.map(s => `<li>${s}</li>`).join('') + '</ul>'
      : '<p style="font-size:13px;color:#027a48">✅ Perfil completo! Você está no banco de talentos.</p>';
  }
}

// ══════════════════════════════════════════════════════════════
// PERFIL
// ══════════════════════════════════════════════════════════════
function preencherFormularioPerfil() {
  const p = Estado.perfil;
  if (!p) return;
  const form = document.getElementById('profileForm');
  if (!form) return;
  const campos = ['nome','email','telefone','cidade','escolaridade','area','experiencia'];
  campos.forEach(campo => {
    const el = form.querySelector(`[name="${campo}"]`);
    if (el) {
      const chave = campo === 'area' ? 'area_interesse' : campo;
      el.value = p[chave] || '';
    }
  });
}

async function salvarPerfil() {
  const form = document.getElementById('profileForm');
  const msg  = document.getElementById('perfilMsg');
  if (!form) return;

  const dados = {
    nome:           form.querySelector('[name="nome"]')?.value?.trim(),
    telefone:       form.querySelector('[name="telefone"]')?.value?.trim(),
    cidade:         form.querySelector('[name="cidade"]')?.value?.trim(),
    escolaridade:   form.querySelector('[name="escolaridade"]')?.value?.trim(),
    area_interesse: form.querySelector('[name="area"]')?.value?.trim(),
    experiencia:    form.querySelector('[name="experiencia"]')?.value?.trim(),
  };

  try {
    const perfil = await Auth.atualizarPerfil(dados);
    Estado.perfil = perfil;
    atualizarSidebar();
    atualizarScore();
    atualizarDashboard();

    // Pontua se completou o perfil pela primeira vez
    if (dados.nome && dados.telefone && dados.cidade) {
      await pontuar('cadastro_completo', 'Perfil completo', '👤');
    }

    mostrarMensagem(msg, 'success', '✅ Perfil salvo com sucesso!');
  } catch (err) {
    mostrarMensagem(msg, 'error', '❌ ' + err.message);
  }
}

// ══════════════════════════════════════════════════════════════
// CURRÍCULO
// ══════════════════════════════════════════════════════════════
function renderizarPrevia() {
  const form     = document.getElementById('resumeForm');
  const preview  = document.getElementById('resumePreview');
  if (!form || !preview) return;

  const template = form.querySelector('[name="template"]:checked')?.value || 'evolue';
  const p  = Estado.perfil || {};
  const obj = form.querySelector('[name="objetivo"]')?.value || '';
  const exp = form.querySelector('[name="experiencias"]')?.value || '';
  const cur = form.querySelector('[name="cursos"]')?.value || '';
  const hab = form.querySelector('[name="habilidades"]')?.value || '';
  const idi = form.querySelector('[name="idiomas"]')?.value || '';
  const com = form.querySelector('[name="complementares"]')?.value || '';

  const linhas = txt => txt ? txt.split('\n').filter(Boolean).map(l => `<li>${l}</li>`).join('') : '';

  if (template === 'evolue') {
    preview.className = 'resume-preview resume-evolue';
    preview.innerHTML = `
      <div class="resume-evolue-header">
        <span class="resume-kicker">EVOLUE Validado ★</span>
        <h2>${p.nome || 'Seu Nome'}</h2>
        <p>${p.email || ''} ${p.telefone ? '· ' + p.telefone : ''} ${p.cidade ? '· ' + p.cidade : ''}</p>
      </div>
      <section>
        ${obj ? `<h3>Objetivo</h3><p>${obj}</p>` : ''}
        ${exp ? `<h3>Experiência Profissional</h3><ul>${linhas(exp)}</ul>` : ''}
        ${cur ? `<h3>Formação & Cursos</h3><ul>${linhas(cur)}</ul>` : ''}
        ${hab ? `<h3>Habilidades</h3><p>${hab}</p>` : ''}
        ${idi ? `<h3>Idiomas</h3><p>${idi}</p>` : ''}
        ${com ? `<h3>Informações Complementares</h3><p>${com}</p>` : ''}
        ${Estado.disc ? `<h3>Perfil Comportamental DISC</h3><p>Perfil predominante: <strong>${Estado.disc.perfil_predominante || 'Não informado'}</strong></p>` : ''}
        <h3>Validado por</h3><p><strong>EVOLUE Treinamento e Desenvolvimento</strong> — Plataforma de preparação profissional.</p>
      </section>`;
  } else if (template === 'essencial') {
    preview.className = 'resume-preview resume-essencial';
    preview.innerHTML = `
      <header>
        <span class="resume-kicker">Currículo Essencial</span>
        <h2>${p.nome || 'Seu Nome'}</h2>
        <p>${p.email || ''} ${p.telefone ? '· ' + p.telefone : ''} ${p.cidade ? '· ' + p.cidade : ''}</p>
      </header>
      ${obj ? `<h3>Objetivo</h3><p>${obj}</p>` : ''}
      ${exp ? `<h3>Experiência</h3><ul>${linhas(exp)}</ul>` : ''}
      ${cur ? `<h3>Formação</h3><ul>${linhas(cur)}</ul>` : ''}
      ${hab ? `<h3>Habilidades</h3><p>${hab}</p>` : ''}
      ${idi ? `<h3>Idiomas</h3><p>${idi}</p>` : ''}
      ${com ? `<h3>Complementar</h3><p>${com}</p>` : ''}`;
  } else {
    preview.className = 'resume-preview resume-primeiro';
    preview.innerHTML = `
      <header>
        <span class="resume-kicker">Primeiro Emprego</span>
        <h2>${p.nome || 'Seu Nome'}</h2>
        <p>${p.email || ''} ${p.telefone ? '· ' + p.telefone : ''}</p>
      </header>
      ${obj ? `<h3>Objetivo</h3><p>${obj}</p>` : ''}
      ${cur ? `<h3>Formação & Cursos</h3><ul>${linhas(cur)}</ul>` : ''}
      ${hab ? `<h3>Habilidades & Competências</h3><p>${hab}</p>` : ''}
      ${exp ? `<h3>Experiências</h3><ul>${linhas(exp)}</ul>` : ''}
      ${idi ? `<h3>Idiomas</h3><p>${idi}</p>` : ''}
      ${com ? `<h3>Informações</h3><p>${com}</p>` : ''}`;
  }
}

async function emitirPDF() {
  const p = Estado.perfil;
  const count = p?.curriculos_emitidos || 0;

  if (count >= 6 && p?.plano === 'free') {
    mostrarToast('⚠️ Limite gratuito atingido. A partir da 7ª emissão: R$1,99.');
    return;
  }

  renderizarPrevia();

  // Salva no Supabase
  await salvarCurriculo();

  // Atualiza contador
  await window.supabaseClient.from('profiles')
    .update({ curriculos_emitidos: count + 1 })
    .eq('id', Auth.getUsuario().id);

  Estado.perfil.curriculos_emitidos = count + 1;
  atualizarUsageCard();
  await pontuar('curriculo_gerado', 'Currículo gerado', '📄');

  window.print();
}

async function salvarCurriculo() {
  const form = document.getElementById('resumeForm');
  if (!form) return;
  const userId = Auth.getUsuario()?.id;
  if (!userId) return;

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

  const { data } = await window.supabaseClient.from('curriculos').insert(dados).select().single();
  if (data) Estado.curriculos.unshift(data);
}

function atualizarUsageCard() {
  const count = Estado.perfil?.curriculos_emitidos || 0;
  const restantes = Math.max(0, 6 - count);
  const el = document.getElementById('freeResumeCount');
  if (el) el.textContent = restantes;
  const card = document.getElementById('usageCard');
  if (card) card.classList.toggle('is-paid', count >= 6);
}

function sugerirMelhorias() {
  const form = document.getElementById('resumeForm');
  const sug  = document.getElementById('resumeSuggestions');
  if (!form || !sug) return;

  const sugestoes = [];
  const exp = form.querySelector('[name="experiencias"]')?.value || '';
  const hab = form.querySelector('[name="habilidades"]')?.value || '';
  const obj = form.querySelector('[name="objetivo"]')?.value || '';

  if (!obj) sugestoes.push('Adicione um <strong>objetivo profissional</strong> claro e específico.');
  if (exp.length < 100) sugestoes.push('Descreva suas <strong>experiências com mais detalhes</strong> — inclua resultados e números.');
  if (!hab) sugestoes.push('Liste suas <strong>habilidades técnicas e comportamentais</strong>.');
  if (!/\d/.test(exp)) sugestoes.push('Use <strong>números e métricas</strong> nas experiências: "aumentei 30%", "atendi 50 clientes".');
  if (!Estado.disc) sugestoes.push('Preencha o <strong>DISC</strong> para adicionar seu perfil comportamental ao currículo EVOLUE.');

  sug.innerHTML = sugestoes.length
    ? '<strong style="font-size:13px;color:#09234c">💡 Sugestões de melhoria:</strong><ul style="margin:8px 0 0;padding-left:16px;font-size:13px;color:#667085;line-height:1.6">' + sugestoes.map(s => `<li>${s}</li>`).join('') + '</ul>'
    : '<p style="font-size:13px;color:#027a48">✅ Currículo bem estruturado!</p>';
}

// ══════════════════════════════════════════════════════════════
// ATS SCORE
// ══════════════════════════════════════════════════════════════

// Motor ATS local (mesmo do módulo anterior, inline)
const ATSMotor = (() => {
  const STOP = new Set(['de','da','do','das','dos','em','no','na','e','ou','a','o','as','os','um','uma','para','por','com','que','se','ao','como','mais','mas','ser','ter','foi','são','está','este','esta','seu','sua','pelo','pela','entre','sobre']);
  const SINS = {'gestao':['gerenciamento','administracao'],'lideranca':['liderar','coordenacao'],'vendas':['comercial','negociacao','prospeccao'],'comunicacao':['relacionamento','interpessoal'],'excel':['planilha','google sheets'],'ingles':['english','bilingue'],'power bi':['powerbi','bi','tableau'],'sql':['mysql','postgresql','database'],'agile':['scrum','kanban','sprint'],'resultados':['metas','kpis','metricas','performance']};
  const norm = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const tokens = t => norm(t).split(' ').filter(x => x.length > 2 && !STOP.has(x));
  const bigramas = tks => { const b=[]; for(let i=0;i<tks.length-1;i++) b.push(tks[i]+' '+tks[i+1]); return b; };
  const expandir = tks => { const s=new Set(tks); tks.forEach(t=>{ Object.entries(SINS).forEach(([base,sins])=>{ if(t===base||sins.includes(t)){s.add(base);sins.forEach(x=>s.add(x));}}); }); return [...s]; };
  const freq = tks => { const f={}; tks.forEach(t=>f[t]=(f[t]||0)+1); return f; };
  const top = (txt,n=40) => { const tks=tokens(txt),bg=bigramas(tks),f=freq([...tks,...bg]); return Object.entries(f).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([t])=>t); };
  const rel = (t,vTks,vBg) => vTks.filter(x=>x===t).length + vBg.filter(x=>x===t).length*2;

  return {
    analisar(curriculo, vaga) {
      const vTks=tokens(vaga), vBg=bigramas(vTks), kws=top(vaga,40);
      const cTks=tokens(curriculo), cBg=bigramas(cTks);
      const cExp=expandir(cTks), cBgExp=expandir(cBg);
      const enc=[], aus=[];
      kws.forEach(kw => {
        const n=norm(kw);
        const ok=cExp.some(t=>t===n||t.includes(n)||n.includes(t))||cBgExp.some(b=>b===n||b.includes(n));
        const item={termo:kw, rel:rel(n,vTks,vBg)};
        (ok?enc:aus).push(item);
      });
      const totR=kws.reduce((s,kw)=>s+rel(norm(kw),vTks,vBg),0);
      const encR=enc.reduce((s,i)=>s+i.rel,0);
      const base=totR>0?(encR/totR)*100:0;
      const bonus=Math.min(10,cTks.length/50);
      const score=Math.min(98,Math.round(base*.85+bonus));
      return { score, enc: enc.sort((a,b)=>b.rel-a.rel), aus: aus.sort((a,b)=>b.rel-a.rel), total: kws.length };
    }
  };
})();

async function analisarATS() {
  const cur = document.getElementById('atsCurriculo')?.value?.trim();
  const vag = document.getElementById('atsVaga')?.value?.trim();
  const div = document.getElementById('atsConteudo');
  if (!div) return;

  if (!cur || !vag) {
    mostrarToast('⚠️ Cole o currículo e a descrição da vaga.');
    return;
  }

  div.innerHTML = '<div class="empty-state">⏳ Analisando...</div>';

  const res = ATSMotor.analisar(cur, vag);
  const { score, enc, aus, total } = res;
  const cor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const nivel = score >= 80 ? 'Excelente' : score >= 60 ? 'Boa compatibilidade' : score >= 40 ? 'Compatibilidade parcial' : 'Baixa compatibilidade';

  div.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:52px;font-weight:800;color:${cor};line-height:1">${score}%</div>
      <div style="font-size:14px;font-weight:700;color:#09234c;margin-top:4px">${nivel}</div>
      <div style="font-size:12px;color:#667085;margin-top:4px">${enc.length} de ${total} palavras-chave encontradas</div>
    </div>
    <div style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:800;color:#09234c;margin-bottom:8px">✅ Encontradas no currículo</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">${enc.slice(0,15).map(i=>`<span style="font-size:11px;padding:3px 9px;border-radius:99px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;font-weight:600">✓ ${i.termo}</span>`).join('')}</div>
    </div>
    <div style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:800;color:#09234c;margin-bottom:8px">❌ Ausentes — adicione ao currículo</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">${aus.slice(0,15).map(i=>`<span style="font-size:11px;padding:3px 9px;border-radius:99px;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;font-weight:600">✗ ${i.termo}</span>`).join('')}</div>
    </div>
    <button onclick="window.print()" class="ghost" style="width:100%;font-size:13px">📋 Imprimir relatório</button>`;

  await pontuar('ats_score_feito', 'ATS Score realizado', '⚡');
  mostrarToast('✅ Análise concluída!');
}

// ══════════════════════════════════════════════════════════════
// COVER LETTER
// ══════════════════════════════════════════════════════════════
function gerarCoverLetter() {
  const empresa = document.getElementById('coverEmpresa')?.value?.trim();
  const cargo   = document.getElementById('coverCargo')?.value?.trim();
  const vaga    = document.getElementById('coverVaga')?.value?.trim();
  const tom     = document.getElementById('coverTom')?.value || 'profissional';
  const div     = document.getElementById('coverConteudo');
  const acoes   = document.getElementById('coverAcoes');
  const p       = Estado.perfil || {};

  if (!empresa || !cargo) {
    mostrarToast('⚠️ Preencha empresa e cargo.');
    return;
  }

  const saudacoes = {
    profissional: 'Prezados(as),',
    entusiasmado: 'Olá, time da ' + empresa + '!',
    formal: 'À Comissão de Seleção,',
  };

  const aberturas = {
    profissional: `Venho, por meio desta carta, manifestar meu interesse na vaga de <strong>${cargo}</strong> na <strong>${empresa}</strong>.`,
    entusiasmado: `Estou muito animado(a) com a oportunidade de me candidatar para a vaga de <strong>${cargo}</strong> na <strong>${empresa}</strong>!`,
    formal: `Apresento minha candidatura para o cargo de <strong>${cargo}</strong> junto à <strong>${empresa}</strong>.`,
  };

  const area = p.area_interesse || cargo;
  const exp  = p.experiencia ? `Com experiência em ${area}, acredito que posso contribuir significativamente para os objetivos da ${empresa}.` : `Minha formação e dedicação à área de ${area} me tornam um(a) candidato(a) comprometido(a) com os objetivos da ${empresa}.`;

  const carta = `
    <div style="font-size:14px;line-height:1.8;color:#344054">
      <p style="margin-bottom:12px">${saudacoes[tom]}</p>
      <p style="margin-bottom:12px">${aberturas[tom]}</p>
      <p style="margin-bottom:12px">${exp} Tenho habilidades em comunicação, trabalho em equipe e busco constantemente meu desenvolvimento profissional.</p>
      ${vaga ? `<p style="margin-bottom:12px">Ao analisar a descrição da vaga, identifiquei uma forte aderência entre meu perfil e os requisitos solicitados pela ${empresa}, o que me motiva ainda mais a fazer parte do time.</p>` : ''}
      <p style="margin-bottom:12px">Estou à disposição para uma entrevista e aguardo ansiosamente a oportunidade de apresentar mais sobre minha trajetória profissional.</p>
      <p style="margin-bottom:4px">Atenciosamente,</p>
      <p><strong>${p.nome || 'Seu Nome'}</strong><br>
      ${p.email || ''} ${p.telefone ? '· ' + p.telefone : ''}</p>
    </div>`;

  if (div) div.innerHTML = carta;
  if (acoes) acoes.style.display = 'flex';

  pontuar('cover_letter_gerada', 'Cover Letter gerada', '✉️');
  mostrarToast('✅ Cover Letter gerada!');
}

async function salvarCoverLetter() {
  const userId  = Auth.getUsuario()?.id;
  const empresa = document.getElementById('coverEmpresa')?.value?.trim();
  const cargo   = document.getElementById('coverCargo')?.value?.trim();
  const vaga    = document.getElementById('coverVaga')?.value?.trim();
  const conteudo = document.getElementById('coverConteudo')?.innerText || '';

  if (!userId || !empresa) return;

  await window.supabaseClient.from('cover_letters').insert({
    user_id: userId,
    empresa, cargo,
    descricao_vaga: vaga,
    conteudo,
    tom: document.getElementById('coverTom')?.value,
  });

  mostrarToast('💾 Cover Letter salva!');
}

function copiarCoverLetter() {
  const texto = document.getElementById('coverConteudo')?.innerText || '';
  navigator.clipboard.writeText(texto)
    .then(() => mostrarToast('📋 Copiado!'))
    .catch(() => mostrarToast('❌ Erro ao copiar.'));
}

// ══════════════════════════════════════════════════════════════
// ENTREVISTA
// ══════════════════════════════════════════════════════════════
function renderizarPergunta() {
  const idx = Estado.questaoAtual;
  setEl('currentQuestion', PERGUNTAS[idx]);
  setEl('questionCounter', `Pergunta ${idx + 1} de ${PERGUNTAS.length}`);
  const inp = document.getElementById('answerInput');
  if (inp) inp.value = '';
  const fb = document.getElementById('answerFeedback');
  if (fb) fb.innerHTML = '';
}

async function analisarResposta() {
  const resp = document.getElementById('answerInput')?.value?.trim();
  const fb   = document.getElementById('answerFeedback');
  if (!fb) return;

  if (!resp || resp.length < 20) {
    fb.innerHTML = '<p style="color:#b42318">⚠️ Escreva uma resposta mais completa para receber feedback.</p>';
    return;
  }

  const feedbacks = [];
  const pontuacao = calcularPontuacaoResposta(resp);

  if (resp.length > 200) feedbacks.push('✅ Resposta bem desenvolvida.');
  else feedbacks.push('💡 Desenvolva mais sua resposta com exemplos concretos.');

  if (/\d/.test(resp)) feedbacks.push('✅ Ótimo — você usou números/dados na resposta.');
  else feedbacks.push('💡 Tente incluir números ou resultados concretos.');

  const verbos = ['fiz','realizei','liderei','desenvolvi','aumentei','criei','organizei','implementei','gerenciei'];
  if (verbos.some(v => resp.toLowerCase().includes(v))) feedbacks.push('✅ Bom uso de verbos de ação.');
  else feedbacks.push('💡 Use verbos de ação: "realizei", "liderei", "desenvolvi".');

  if (resp.split('.').length >= 3) feedbacks.push('✅ Resposta bem estruturada em parágrafos.');

  fb.innerHTML = `
    <div style="margin-bottom:10px">
      <strong style="font-size:13px;color:#09234c">Feedback da resposta — ${pontuacao}/10</strong>
    </div>
    <ul style="margin:0;padding-left:16px;font-size:13px;color:#667085;line-height:1.7">
      ${feedbacks.map(f => `<li>${f}</li>`).join('')}
    </ul>`;

  // Salva no Supabase
  const userId = Auth.getUsuario()?.id;
  if (userId) {
    await window.supabaseClient.from('entrevistas').insert({
      user_id: userId,
      pergunta: PERGUNTAS[Estado.questaoAtual],
      resposta: resp,
      feedback: feedbacks.join(' | '),
      pontuacao,
    });
    Estado.entrevistas.push({ pergunta: PERGUNTAS[Estado.questaoAtual], resposta: resp });
    await pontuar('entrevista_simulada', 'Entrevista simulada', '🎯');
    atualizarScore();
  }
}

function calcularPontuacaoResposta(resp) {
  let pts = 5;
  if (resp.length > 150) pts++;
  if (resp.length > 300) pts++;
  if (/\d/.test(resp)) pts++;
  if (resp.split('.').length >= 3) pts++;
  const verbos = ['fiz','realizei','liderei','desenvolvi','aumentei'];
  if (verbos.some(v => resp.toLowerCase().includes(v))) pts++;
  return Math.min(pts, 10);
}

function proximaPergunta() {
  Estado.questaoAtual = (Estado.questaoAtual + 1) % PERGUNTAS.length;
  renderizarPergunta();
}

function renderizarTips() {
  const grid = document.getElementById('tipsGrid');
  if (!grid) return;
  const tpl = document.getElementById('tipTemplate');
  grid.innerHTML = '';
  TIPS.forEach(tip => {
    const clone = tpl ? tpl.content.cloneNode(true) : document.createElement('article');
    if (tpl) {
      clone.querySelector('strong').textContent = tip.titulo;
      clone.querySelector('p').textContent = tip.texto;
      grid.appendChild(clone);
    }
  });
}

// ══════════════════════════════════════════════════════════════
// JOB TRACKER
// ══════════════════════════════════════════════════════════════
function renderizarKanban() {
  const colunas = ['salvo','aplicado','entrevista','proposta','contratado'];
  colunas.forEach(status => {
    const col = document.getElementById(`col-${status}`);
    const cnt = document.getElementById(`cnt-${status}`);
    if (!col) return;
    const vagas = Estado.tracker.filter(v => v.status === status);
    if (cnt) cnt.textContent = vagas.length;
    col.innerHTML = vagas.length
      ? vagas.map(v => `
          <div class="kanban-card" onclick="verVaga('${v.id}')">
            <div class="kanban-card-empresa">${v.empresa}</div>
            <div class="kanban-card-cargo">${v.cargo}</div>
            <div class="kanban-card-footer">
              <span>${v.data_aplicacao || ''}</span>
              ${v.ats_score ? `<span class="kanban-ats">${v.ats_score}%</span>` : ''}
            </div>
          </div>`).join('')
      : `<div style="font-size:12px;color:#94a3b8;text-align:center;padding:20px 0">Nenhuma vaga</div>`;
  });

  // Stats
  const stats = document.getElementById('trackerStats');
  if (stats) {
    const total = Estado.tracker.length;
    const ativas = Estado.tracker.filter(v => !['contratado','recusado'].includes(v.status)).length;
    stats.innerHTML = `
      <span class="tracker-stat">📊 ${total} total</span>
      <span class="tracker-stat">🎯 ${ativas} em andamento</span>`;
  }
}

async function salvarVaga() {
  const userId  = Auth.getUsuario()?.id;
  if (!userId) return;

  const dados = {
    user_id:        userId,
    empresa:        document.getElementById('vagaEmpresa')?.value?.trim(),
    cargo:          document.getElementById('vagaCargo')?.value?.trim(),
    link_vaga:      document.getElementById('vagaLink')?.value?.trim(),
    descricao_vaga: document.getElementById('vagaDescricao')?.value?.trim(),
    status:         document.getElementById('vagaStatus')?.value || 'salvo',
    salario_esperado: document.getElementById('vagaSalario')?.value?.trim(),
    anotacoes:      document.getElementById('vagaAnotacoes')?.value?.trim(),
  };

  if (!dados.empresa || !dados.cargo) {
    mostrarToast('⚠️ Preencha empresa e cargo.');
    return;
  }

  const { data, error } = await window.supabaseClient.from('job_tracker').insert(dados).select().single();
  if (error) { mostrarToast('❌ Erro ao salvar.'); return; }

  Estado.tracker.unshift(data);
  renderizarKanban();
  fecharModal();
  await pontuar('vaga_registrada', 'Candidatura registrada', '📋');
  mostrarToast('✅ Candidatura salva!');
}

function verVaga(id) {
  const vaga = Estado.tracker.find(v => v.id === id);
  if (!vaga) return;
  mostrarToast(`📋 ${vaga.empresa} — ${vaga.cargo}`);
}

// ══════════════════════════════════════════════════════════════
// DISC
// ══════════════════════════════════════════════════════════════
function preencherFormularioDisc() {
  const d = Estado.disc;
  if (!d) return;
  const form = document.getElementById('discForm');
  if (!form) return;
  ['dominancia','influencia','estabilidade','conformidade'].forEach(campo => {
    const el = form.querySelector(`[name="${campo}"]`);
    if (el) el.value = d[campo] || 25;
  });
  const perf = form.querySelector('[name="perfil"]');
  if (perf) perf.value = d.perfil_predominante || '';
  const obs = form.querySelector('[name="observacoes"]');
  if (obs) obs.value = d.observacoes || '';
  renderizarDisc();
}

function renderizarDisc() {
  const form = document.getElementById('discForm');
  const bars = document.getElementById('discBars');
  const summary = document.getElementById('discSummary');
  if (!form || !bars) return;

  const D = parseInt(form.querySelector('[name="dominancia"]')?.value) || 25;
  const I = parseInt(form.querySelector('[name="influencia"]')?.value) || 25;
  const S = parseInt(form.querySelector('[name="estabilidade"]')?.value) || 25;
  const C = parseInt(form.querySelector('[name="conformidade"]')?.value) || 25;

  bars.innerHTML = [
    ['Dominância', D, 'D'],
    ['Influência', I, 'I'],
    ['Estabilidade', S, 'S'],
    ['Conformidade', C, 'C'],
  ].map(([label, val]) => `
    <div class="disc-row">
      <div><span>${label}</span><span>${val}%</span></div>
      <div class="disc-track"><span style="width:${val}%"></span></div>
    </div>`).join('');

  const perfil = form.querySelector('[name="perfil"]')?.value;
  const descricoes = {
    'Dominância':   { txt: 'Direto, decisivo, orientado a resultados. Prefere agir rapidamente e assumir desafios.' },
    'Influência':   { txt: 'Comunicativo, entusiasta, sociável. Se destaca em trabalhos colaborativos e de relacionamento.' },
    'Estabilidade': { txt: 'Paciente, confiável, consistente. Trabalha bem em equipe e valoriza ambientes harmoniosos.' },
    'Conformidade': { txt: 'Analítico, cuidadoso, preciso. Valoriza qualidade e segue regras e procedimentos.' },
  };

  if (summary && perfil && descricoes[perfil]) {
    summary.innerHTML = `
      <article>
        <strong>${perfil}</strong>
        <p>${descricoes[perfil].txt}</p>
      </article>`;
  }
}

async function salvarDisc() {
  const userId = Auth.getUsuario()?.id;
  if (!userId) return;
  const form = document.getElementById('discForm');
  if (!form) return;

  const dados = {
    user_id:              userId,
    perfil_predominante:  form.querySelector('[name="perfil"]')?.value,
    dominancia:           parseInt(form.querySelector('[name="dominancia"]')?.value) || 25,
    influencia:           parseInt(form.querySelector('[name="influencia"]')?.value) || 25,
    estabilidade:         parseInt(form.querySelector('[name="estabilidade"]')?.value) || 25,
    conformidade:         parseInt(form.querySelector('[name="conformidade"]')?.value) || 25,
    observacoes:          form.querySelector('[name="observacoes"]')?.value,
  };

  const { data, error } = await window.supabaseClient.from('disc_results').insert(dados).select().single();
  if (error) { mostrarToast('❌ Erro ao salvar DISC.'); return; }

  Estado.disc = data;
  await pontuar('disc_preenchido', 'DISC preenchido', '🧠');
  atualizarScore();
  mostrarToast('✅ DISC salvo!');
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
function atualizarDashboard() {
  const p = Estado.perfil;
  if (!p) return;

  let score = 0;
  if (p.nome) score += 5; if (p.email) score += 5; if (p.telefone) score += 5;
  if (p.cidade) score += 5; if (p.escolaridade) score += 5; if (p.area_interesse) score += 5;
  if (Estado.curriculos.length > 0) score += 25;
  if (Estado.disc) score += 20;
  if (Estado.entrevistas.length > 0) score += 25;
  score = Math.min(score, 100);

  const selo = score >= 80 ? 'ouro' : score >= 40 ? 'prata' : 'bronze';

  setEl('metricScore', score);
  setEl('metricLevel', EVOLUE_CONFIG.selos[selo]?.label || 'Bronze');
  setEl('metricPoints', p.career_points || 0);
  setEl('metricArea', p.area_interesse || '-');
  setEl('metricDisc', Estado.disc?.perfil_predominante || '-');
  setEl('metricVagas', Estado.tracker.length);

  // Checklist
  const checks = [
    { label: 'Perfil completo', done: !!(p.nome && p.telefone && p.cidade && p.escolaridade) },
    { label: 'Currículo gerado', done: Estado.curriculos.length > 0 },
    { label: 'DISC preenchido', done: !!Estado.disc },
    { label: 'Entrevista simulada', done: Estado.entrevistas.length > 0 },
    { label: 'ATS Score realizado', done: Estado.curriculos.some(c => c.ats_score) },
    { label: 'Candidatura registrada', done: Estado.tracker.length > 0 },
  ];

  const cl = document.getElementById('validationChecklist');
  if (cl) {
    cl.innerHTML = checks.map(c => `
      <div class="check-item ${c.done ? 'done' : ''}">
        <div class="check-dot"></div>
        <span style="font-size:13px;color:${c.done ? '#027a48' : '#667085'}">${c.label}</span>
        ${c.done ? '<span style="margin-left:auto;font-size:12px;color:#027a48">✅</span>' : ''}
      </div>`).join('');
  }
}

function renderizarRecomendacoes() {
  const grid = document.getElementById('recommendations');
  if (!grid) return;
  grid.innerHTML = RECOMENDACOES.map(r => `
    <div class="recommendation" onclick="navegarPara('${r.view}')">
      <strong>${r.titulo}</strong>
      <p>${r.texto}</p>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════════
// GAMIFICAÇÃO
// ══════════════════════════════════════════════════════════════
async function pontuar(tipo, motivo, icone) {
  const userId = Auth.getUsuario()?.id;
  if (!userId) return;
  const pts = EVOLUE_CONFIG.pontos[tipo] || 1;
  try {
    await window.supabaseClient.rpc('adicionar_career_points', {
      p_user_id: userId,
      p_pontos: pts,
      p_motivo: motivo,
      p_icone: icone,
    });
    if (Estado.perfil) {
      Estado.perfil.career_points = (Estado.perfil.career_points || 0) + pts;
      document.getElementById('careerPoints').textContent = Estado.perfil.career_points;
    }
  } catch(e) { /* silencioso */ }
}

// ══════════════════════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════════════════════
function abrirModal() {
  const modal = document.getElementById('modalVaga');
  if (modal) modal.classList.remove('hidden');
}

function fecharModal() {
  const modal = document.getElementById('modalVaga');
  if (modal) modal.classList.add('hidden');
  ['vagaEmpresa','vagaCargo','vagaLink','vagaDescricao','vagaAnotacoes','vagaSalario'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ══════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════
function mostrarToast(msg, duracao = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), duracao);
}

function mostrarMensagem(el, tipo, txt) {
  if (!el) return;
  el.className = `form-msg ${tipo}`;
  el.innerHTML = txt;
  setTimeout(() => { el.className = 'form-msg'; el.innerHTML = ''; }, 4000);
}

// ══════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ══════════════════════════════════════════════════════════════
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ══════════════════════════════════════════════════════════════
// DADOS DE EXEMPLO
// ══════════════════════════════════════════════════════════════
function preencherExemplo() {
  const pf = document.getElementById('profileForm');
  if (pf) {
    pf.querySelector('[name="nome"]').value = 'Ana Clara Souza';
    pf.querySelector('[name="email"]').value = 'ana.souza@email.com';
    pf.querySelector('[name="telefone"]').value = '(11) 98765-4321';
    pf.querySelector('[name="cidade"]').value = 'São Paulo - SP';
    pf.querySelector('[name="escolaridade"]').value = 'Ensino Superior Completo — Administração';
    pf.querySelector('[name="area"]').value = 'Administrativo / Comercial';
    pf.querySelector('[name="experiencia"]').value = 'Assistente Administrativa na Empresa XYZ (2022-2024)\nAtendimento ao cliente, controle de planilhas e suporte à equipe comercial.';
  }
  const rf = document.getElementById('resumeForm');
  if (rf) {
    rf.querySelector('[name="objetivo"]').value = 'Atuar como Assistente Administrativa contribuindo com organização, atendimento e resultados.';
    rf.querySelector('[name="experiencias"]').value = 'Assistente Administrativa — Empresa XYZ (2022–2024)\nAtendimento ao cliente, organização de documentos, controle de planilhas e suporte comercial.\n\nAuxiliar Administrativo — Empresa ABC (2020–2022)\nArquivamento, controle de estoque e atendimento telefônico.';
    rf.querySelector('[name="cursos"]').value = 'Excel Avançado — Senac (2023)\nAtendimento ao Cliente — SEBRAE (2022)\nPacote Office — Microlins (2021)';
    rf.querySelector('[name="habilidades"]').value = 'Comunicação, organização, trabalho em equipe, Excel, atendimento ao cliente, proatividade.';
    rf.querySelector('[name="idiomas"]').value = 'Português nativo, Inglês básico';
    rf.querySelector('[name="complementares"]').value = 'Disponibilidade imediata. CNH categoria B.';
    renderizarPrevia();
  }
  mostrarToast('✅ Dados de exemplo preenchidos!');
}

function limparDados() {
  document.querySelectorAll('input:not([type="radio"]):not([type="file"]), textarea, select').forEach(el => {
    el.value = el.tagName === 'SELECT' ? el.options[0]?.value || '' : '';
  });
  const preview = document.getElementById('resumePreview');
  if (preview) preview.innerHTML = '';
  mostrarToast('🗑️ Dados locais limpos.');
}

// ══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE EVENTOS
// ══════════════════════════════════════════════════════════════
function configurarEventos() {

  // ── Auth ─────────────────────────────────────────────────
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const alvo = tab.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`form${alvo.charAt(0).toUpperCase() + alvo.slice(1)}`)?.classList.add('active');
    });
  });

  document.getElementById('btnEntrar')?.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail')?.value?.trim();
    const senha = document.getElementById('loginSenha')?.value;
    const erro  = document.getElementById('loginErro');
    try {
      await Auth.entrar({ email, senha });
    } catch(e) {
      if (erro) { erro.textContent = e.message; erro.classList.add('show'); }
    }
  });

  document.getElementById('btnCadastrar')?.addEventListener('click', async () => {
    const nome  = document.getElementById('cadNome')?.value?.trim();
    const email = document.getElementById('cadEmail')?.value?.trim();
    const senha = document.getElementById('cadSenha')?.value;
    const erro  = document.getElementById('cadErro');
    try {
      await Auth.cadastrar({ nome, email, senha });
      mostrarToast('✅ Conta criada! Verifique seu e-mail para confirmar.');
    } catch(e) {
      if (erro) { erro.textContent = e.message; erro.classList.add('show'); }
    }
  });

  document.getElementById('btnGoogle')?.addEventListener('click', () => Auth.entrarComGoogle());
  document.getElementById('btnGoogleCad')?.addEventListener('click', () => Auth.entrarComGoogle());

  document.getElementById('linkEsqueceuSenha')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value?.trim();
    if (!email) { mostrarToast('⚠️ Digite seu e-mail primeiro.'); return; }
    await Auth.resetarSenha(email);
    mostrarToast('📧 E-mail de redefinição enviado!');
  });

  document.getElementById('btnLogout')?.addEventListener('click', async () => {
    await Auth.sair();
  });

  // ── Navegação ────────────────────────────────────────────
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navegarPara(btn.dataset.view));
  });

  // ── Perfil ───────────────────────────────────────────────
  document.getElementById('btnSalvarPerfil')?.addEventListener('click', salvarPerfil);

  // ── Currículo ────────────────────────────────────────────
  document.getElementById('improveResume')?.addEventListener('click', sugerirMelhorias);
  document.getElementById('printResume')?.addEventListener('click', emitirPDF);

  document.querySelectorAll('.template-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.template-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      renderizarPrevia();
    });
  });

  document.getElementById('resumeForm')?.addEventListener('input', renderizarPrevia);

  // ── ATS ──────────────────────────────────────────────────
  document.getElementById('btnAnalisarATS')?.addEventListener('click', analisarATS);

  // ── Cover Letter ─────────────────────────────────────────
  document.getElementById('btnGerarCover')?.addEventListener('click', gerarCoverLetter);
  document.getElementById('btnSalvarCover')?.addEventListener('click', salvarCoverLetter);
  document.getElementById('btnCopiarCover')?.addEventListener('click', copiarCoverLetter);

  // ── Entrevista ───────────────────────────────────────────
  document.getElementById('analyzeAnswer')?.addEventListener('click', analisarResposta);
  document.getElementById('nextQuestion')?.addEventListener('click', proximaPergunta);
  renderizarPergunta();

  // ── DISC ─────────────────────────────────────────────────
  document.getElementById('discForm')?.addEventListener('input', renderizarDisc);
  document.getElementById('btnSalvarDisc')?.addEventListener('click', salvarDisc);

  // ── Job Tracker ──────────────────────────────────────────
  document.getElementById('btnNovaVaga')?.addEventListener('click', abrirModal);
  document.getElementById('btnFecharModal')?.addEventListener('click', fecharModal);
  document.getElementById('btnCancelarModal')?.addEventListener('click', fecharModal);
  document.getElementById('btnSalvarVaga')?.addEventListener('click', salvarVaga);

  // Fecha modal clicando fora
  document.getElementById('modalVaga')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalVaga') fecharModal();
  });

  // ── Utilitários ──────────────────────────────────────────
  document.getElementById('seedData')?.addEventListener('click', preencherExemplo);
  document.getElementById('clearData')?.addEventListener('click', limparDados);

  // ── Enter nos inputs de auth ─────────────────────────────
  document.getElementById('loginSenha')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btnEntrar')?.click();
  });
  document.getElementById('cadSenha')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btnCadastrar')?.click();
  });
}
