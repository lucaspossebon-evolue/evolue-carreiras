const ADMIN_LOCAL_KEY = 'evolue_admin_demo_candidates';
const SB_ADMIN = () => window.supabaseClient;

let adminState = {
  user: null,
  profile: null,
  candidates: [],
  diagnostics: [],
  presentations: [],
  resumes: [],
  disc: [],
  interviews: [],
  tracker: [],
  notes: []
};

document.addEventListener('DOMContentLoaded', async () => {
  bindAdminEvents();
  await initAdminSession();
});

function bindAdminEvents() {
  document.getElementById('btnAdminLogin')?.addEventListener('click', loginAdmin);
  document.getElementById('btnAdminDemoLogin')?.addEventListener('click', loadDemoAdmin);
  document.getElementById('btnAdminDemo')?.addEventListener('click', loadDemoAdmin);
  document.getElementById('btnAdminLogout')?.addEventListener('click', logoutAdmin);
  document.getElementById('btnCloseCandidate')?.addEventListener('click', closeCandidateModal);
  document.getElementById('candidateModal')?.addEventListener('click', (event) => {
    if (event.target.id === 'candidateModal') closeCandidateModal();
  });
  ['filterBusca', 'filterArea', 'filterCidade', 'filterSelo'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', renderCandidates);
    document.getElementById(id)?.addEventListener('change', renderCandidates);
  });
}

async function initAdminSession() {
  if (!SB_ADMIN()?.auth) {
    showLogin('Supabase não carregou. Use o modo demonstração.');
    return;
  }
  const { data: { session } } = await SB_ADMIN().auth.getSession();
  if (!session?.user) {
    showLogin();
    return;
  }
  adminState.user = session.user;
  await loadAdminProfile();
}

async function loginAdmin() {
  const email = document.getElementById('adminEmail')?.value?.trim();
  const password = document.getElementById('adminSenha')?.value;
  const msg = document.getElementById('adminLoginMsg');
  if (!email || !password) {
    showMsg(msg, 'error', 'Informe e-mail e senha.');
    return;
  }
  try {
    const { data, error } = await SB_ADMIN().auth.signInWithPassword({ email, password });
    if (error) throw error;
    adminState.user = data.user;
    await loadAdminProfile();
  } catch (error) {
    showMsg(msg, 'error', traduzAdminError(error.message));
  }
}

async function loadAdminProfile() {
  try {
    const { data, error } = await SB_ADMIN()
      .from('profiles')
      .select('*')
      .eq('id', adminState.user.id)
      .single();
    if (error) throw error;
    adminState.profile = data;
    if (data?.role !== 'admin') {
      showLogin('Seu usuário não possui role = admin em profiles.');
      return;
    }
    showAdmin();
    await loadAdminData();
  } catch (error) {
    showLogin('Não foi possível validar o perfil admin. Confira a tabela profiles e o campo role.');
  }
}

async function loadAdminData() {
  try {
    const [
      profiles,
      curriculos,
      diagnosticos,
      apresentacoes,
      disc,
      entrevistas,
      tracker,
      notes
    ] = await Promise.all([
      safeSelect('profiles', '*'),
      safeSelect('curriculos', '*'),
      safeSelect('diagnosticos', '*'),
      safeSelect('apresentacoes', '*'),
      safeSelect('disc_results', '*'),
      safeSelect('entrevistas', '*'),
      safeSelect('job_tracker', '*'),
      safeSelect('admin_notes', '*')
    ]);

    adminState.candidates = profiles.filter((item) => item.role !== 'admin');
    adminState.resumes = curriculos;
    adminState.diagnostics = diagnosticos;
    adminState.presentations = apresentacoes;
    adminState.disc = disc;
    adminState.interviews = entrevistas;
    adminState.tracker = tracker;
    adminState.notes = notes;
    renderAdmin();
  } catch (error) {
    showToast('Erro ao carregar candidatos. Confira RLS e tabelas.');
  }
}

async function safeSelect(table, columns) {
  try {
    const { data, error } = await SB_ADMIN().from(table).select(columns);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn(`Tabela indisponível: ${table}`, error);
    return [];
  }
}

function showLogin(message = '') {
  document.getElementById('adminLogin')?.classList.remove('hidden');
  document.getElementById('adminContent')?.classList.add('hidden');
  document.getElementById('btnAdminLogout')?.classList.add('hidden');
  setText('adminSessionLabel', 'Aguardando login');
  if (message) showMsg(document.getElementById('adminLoginMsg'), 'error', message);
}

function showAdmin() {
  document.getElementById('adminLogin')?.classList.add('hidden');
  document.getElementById('adminContent')?.classList.remove('hidden');
  document.getElementById('btnAdminLogout')?.classList.remove('hidden');
  setText('adminSessionLabel', adminState.profile?.nome || adminState.user?.email || 'Admin EVOLUE');
}

async function logoutAdmin() {
  if (SB_ADMIN()?.auth) await SB_ADMIN().auth.signOut();
  adminState = { user: null, profile: null, candidates: [], diagnostics: [], presentations: [], resumes: [], disc: [], interviews: [], tracker: [], notes: [] };
  showLogin();
}

function loadDemoAdmin() {
  const local = JSON.parse(localStorage.getItem('evolue_demo_data') || '{}');
  const demoCandidate = local.perfil || {
    id: 'demo-user',
    nome: 'Ana Clara Souza',
    email: 'ana.souza@email.com',
    cidade: 'São Paulo - SP',
    area_interesse: 'Administrativo / Comercial',
    telefone: '(11) 98765-4321',
    escolaridade: 'Superior Completo',
    status_admin: 'novo',
    prioridade_admin: 'normal',
    career_points: 42,
    selo: 'prata'
  };
  adminState.profile = { nome: 'Admin Demonstração', role: 'admin' };
  adminState.user = { id: 'admin-demo', email: 'admin@demo.local' };
  adminState.candidates = [demoCandidate];
  adminState.resumes = local.curriculos || [];
  adminState.diagnostics = local.diagnostico ? [{ ...local.diagnostico, user_id: demoCandidate.id }] : [];
  adminState.presentations = (local.apresentacoes || []).map((item) => ({ ...item, user_id: demoCandidate.id }));
  adminState.disc = local.disc ? [{ ...local.disc, user_id: demoCandidate.id }] : [];
  adminState.interviews = local.entrevistas || [];
  adminState.tracker = local.tracker || [];
  adminState.notes = JSON.parse(localStorage.getItem(ADMIN_LOCAL_KEY) || '[]');
  showAdmin();
  renderAdmin();
  showToast('Modo demonstração admin carregado.');
}

function renderAdmin() {
  renderMetrics();
  renderCandidates();
}

function renderMetrics() {
  const total = adminState.candidates.length;
  const curriculos = adminState.resumes.length;
  const diagnosticos = adminState.diagnostics.length;
  const preparados = adminState.candidates.filter((candidate) => getCandidateScore(candidate) >= 80).length;
  const metrics = [
    ['Candidatos', total],
    ['Currículos', curriculos],
    ['Diagnósticos', diagnosticos],
    ['Prontos', preparados]
  ];
  document.getElementById('adminMetrics').innerHTML = metrics.map(([label, value]) => `
    <article class="admin-metric"><strong>${value}</strong><span>${label}</span></article>
  `).join('');
}

function renderCandidates() {
  const list = document.getElementById('candidatesList');
  if (!list) return;
  const busca = document.getElementById('filterBusca')?.value?.toLowerCase().trim() || '';
  const area = document.getElementById('filterArea')?.value?.toLowerCase().trim() || '';
  const cidade = document.getElementById('filterCidade')?.value?.toLowerCase().trim() || '';
  const selo = document.getElementById('filterSelo')?.value?.toLowerCase().trim() || '';
  const rows = adminState.candidates.filter((candidate) => {
    const scoreSelo = getSelo(getCandidateScore(candidate)).toLowerCase();
    return (!busca || `${candidate.nome || ''} ${candidate.email || ''}`.toLowerCase().includes(busca))
      && (!area || (candidate.area_interesse || '').toLowerCase().includes(area))
      && (!cidade || (candidate.cidade || '').toLowerCase().includes(cidade))
      && (!selo || scoreSelo === selo);
  });
  if (!rows.length) {
    list.innerHTML = '<div class="empty-state"><p>Nenhum candidato encontrado.</p></div>';
    return;
  }
  list.innerHTML = rows.map((candidate) => {
    const score = getCandidateScore(candidate);
    return `
      <article class="candidate-row">
        <div><strong>${escapeHtml(candidate.nome || 'Sem nome')}</strong><br><small>${escapeHtml(candidate.email || '-')}</small></div>
        <span>${escapeHtml(candidate.area_interesse || '-')}</span>
        <span>${escapeHtml(candidate.cidade || '-')}</span>
        <span class="status-pill">${getSelo(score)} ${score}%</span>
        <button type="button" onclick="openCandidate('${candidate.id}')">Ver detalhes</button>
      </article>
    `;
  }).join('');
}

function openCandidate(candidateId) {
  const candidate = adminState.candidates.find((item) => item.id === candidateId);
  if (!candidate) return;
  const resumes = byUser(adminState.resumes, candidateId);
  const diagnostics = byUser(adminState.diagnostics, candidateId);
  const presentations = byUser(adminState.presentations, candidateId);
  const disc = byUser(adminState.disc, candidateId);
  const interviews = byUser(adminState.interviews, candidateId);
  const tracker = byUser(adminState.tracker, candidateId);
  const notes = adminState.notes.filter((note) => note.candidate_id === candidateId);

  setText('candidateModalTitle', candidate.nome || 'Detalhe do candidato');
  document.getElementById('candidateDetail').innerHTML = `
    <div class="detail-grid">
      ${detailCard('Perfil', `${candidate.email || '-'}<br>${candidate.telefone || '-'}<br>${candidate.cidade || '-'}<br>${candidate.area_interesse || '-'}`)}
      ${detailCard('Preparo', `Score: ${getCandidateScore(candidate)}%<br>Selo: ${getSelo(getCandidateScore(candidate))}<br>Career Points: ${candidate.career_points || 0}`)}
      ${detailCard('Currículos', resumes.length ? resumes.map(r => `${r.template || 'modelo'} - ${formatDate(r.created_at)}`).join('<br>') : 'Nenhum currículo encontrado.')}
      ${detailCard('Diagnóstico', diagnostics[0] ? `Nota: ${diagnostics[0].score}/100<br>Nível: ${diagnostics[0].nivel}` : 'Sem diagnóstico.')}
      ${detailCard('DISC', disc[0] ? `${disc[0].perfil_predominante || '-'}<br>D:${disc[0].dominancia || 0}% I:${disc[0].influencia || 0}% S:${disc[0].estabilidade || 0}% C:${disc[0].conformidade || 0}%` : 'Sem DISC.')}
      ${detailCard('Entrevistas', interviews.length ? `${interviews.length} simulação(ões)` : 'Nenhuma entrevista simulada.')}
      ${detailCard('Candidaturas', tracker.length ? tracker.map(v => `${v.empresa || '-'} - ${v.cargo || '-'} (${v.status || '-'})`).join('<br>') : 'Nenhuma candidatura registrada.')}
      ${detailCard('Fale sobre você', presentations[0]?.texto || 'Nenhuma apresentação salva.')}
    </div>
    <div class="detail-card admin-note-box">
      <h4>Observação interna</h4>
      <textarea id="adminNoteText" rows="3" placeholder="Adicionar observação da EVOLUE..."></textarea>
      <div class="actions">
        <select id="adminStatusSelect">
          <option value="novo">Novo</option>
          <option value="em_analise">Em análise</option>
          <option value="indicado">Indicado</option>
          <option value="contratado">Contratado</option>
          <option value="inativo">Inativo</option>
        </select>
        <button type="button" onclick="saveAdminNote('${candidateId}')">Salvar observação</button>
      </div>
      <div>${notes.length ? notes.map(note => `<p>${escapeHtml(note.nota)}<br><small>${formatDate(note.created_at)}</small></p>`).join('') : '<p>Sem observações internas.</p>'}</div>
    </div>
  `;
  document.getElementById('candidateModal')?.classList.remove('hidden');
}

function closeCandidateModal() {
  document.getElementById('candidateModal')?.classList.add('hidden');
}

async function saveAdminNote(candidateId) {
  const nota = document.getElementById('adminNoteText')?.value?.trim();
  const status = document.getElementById('adminStatusSelect')?.value || 'novo';
  if (!nota) {
    showToast('Escreva uma observação antes de salvar.');
    return;
  }
  const note = { candidate_id: candidateId, admin_id: adminState.user?.id || 'admin-demo', nota, created_at: new Date().toISOString() };
  const candidate = adminState.candidates.find((item) => item.id === candidateId);
  if (candidate) candidate.status_admin = status;
  if (SB_ADMIN()?.from && adminState.profile?.role === 'admin' && adminState.user?.id !== 'admin-demo') {
    await SB_ADMIN().from('admin_notes').insert(note);
    await SB_ADMIN().from('profiles').update({ status_admin: status, ultima_interacao: new Date().toISOString() }).eq('id', candidateId);
  } else {
    adminState.notes.unshift(note);
    localStorage.setItem(ADMIN_LOCAL_KEY, JSON.stringify(adminState.notes));
  }
  showToast('Observação salva.');
  openCandidate(candidateId);
  renderCandidates();
}

function byUser(items, userId) {
  return items.filter((item) => item.user_id === userId || item.id === userId);
}

function getCandidateScore(candidate) {
  let score = 0;
  if (candidate.nome) score += 5;
  if (candidate.email) score += 5;
  if (candidate.telefone) score += 5;
  if (candidate.cidade) score += 5;
  if (candidate.escolaridade) score += 5;
  if (candidate.area_interesse) score += 5;
  if (byUser(adminState.diagnostics, candidate.id).length) score += 10;
  if (byUser(adminState.presentations, candidate.id).length) score += 10;
  if (byUser(adminState.resumes, candidate.id).length) score += 25;
  if (byUser(adminState.disc, candidate.id).length) score += 20;
  if (byUser(adminState.interviews, candidate.id).length) score += 15;
  return Math.min(score, 100);
}

function getSelo(score) {
  if (score >= 80) return 'Ouro';
  if (score >= 40) return 'Prata';
  return 'Bronze';
}

function detailCard(title, html) {
  return `<article class="detail-card"><h4>${title}</h4><p>${html}</p></article>`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showMsg(el, type, text) {
  if (!el) return;
  el.className = `form-msg ${type}`;
  el.textContent = text;
}

function showToast(text) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

function traduzAdminError(message = '') {
  const errors = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar.'
  };
  return errors[message] || message || 'Não foi possível entrar.';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

function escapeHtml(value = '') {
  return value.toString().replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[char]);
}
