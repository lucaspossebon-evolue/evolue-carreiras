// ============================================================
// EVOLUE CARREIRAS — Módulo de Autenticação
// auth.js
// ============================================================

const Auth = (() => {

  // ── Estado da sessão ────────────────────────────────────────
  let _usuario = null;
  let _perfil  = null;

  // ── Inicializa e observa mudanças de sessão ─────────────────
  async function init() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session?.user) {
      _usuario = session.user;
      _perfil  = await carregarPerfil(session.user.id);
    }

    window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        _usuario = session.user;
        _perfil  = await carregarPerfil(session.user.id);
        window.dispatchEvent(new CustomEvent('evolue:login', { detail: { usuario: _usuario, perfil: _perfil } }));
      }
      if (event === 'SIGNED_OUT') {
        _usuario = null;
        _perfil  = null;
        window.dispatchEvent(new CustomEvent('evolue:logout'));
      }
    });

    return { usuario: _usuario, perfil: _perfil };
  }

  // ── Cadastro com e-mail e senha ─────────────────────────────
  async function cadastrar({ nome, email, senha }) {
    const { data, error } = await window.supabaseClient.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome },
        emailRedirectTo: EVOLUE_CONFIG.app.url_producao,
      }
    });

    if (error) throw new Error(traduzirErro(error.message));

    // Atualiza nome no perfil
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ nome })
        .eq('id', data.user.id);
    }

    return data;
  }

  // ── Login com e-mail e senha ────────────────────────────────
  async function entrar({ email, senha }) {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) throw new Error(traduzirErro(error.message));

    // Registra ponto de login diário
    await registrarLoginDiario(data.user.id);

    return data;
  }

  // ── Login com Google ────────────────────────────────────────
  async function entrarComGoogle() {
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: EVOLUE_CONFIG.app.url_producao,
      }
    });
    if (error) throw new Error(traduzirErro(error.message));
  }

  // ── Magic Link (sem senha) ──────────────────────────────────
  async function enviarMagicLink(email) {
    const { error } = await window.supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: EVOLUE_CONFIG.app.url_producao,
      }
    });
    if (error) throw new Error(traduzirErro(error.message));
  }

  // ── Logout ──────────────────────────────────────────────────
  async function sair() {
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) throw new Error(traduzirErro(error.message));
  }

  // ── Resetar senha ───────────────────────────────────────────
  async function resetarSenha(email) {
    const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${EVOLUE_CONFIG.app.url_producao}/reset-senha.html`,
    });
    if (error) throw new Error(traduzirErro(error.message));
  }

  // ── Carregar perfil do candidato ────────────────────────────
  async function carregarPerfil(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return null;
    return data;
  }

  // ── Login diário — pontua 1x por dia ───────────────────────
  async function registrarLoginDiario(userId) {
    const hoje = new Date().toISOString().split('T')[0];
    const chave = `evolue_login_${hoje}`;
    if (localStorage.getItem(chave)) return;

    await window.supabaseClient.rpc('adicionar_career_points', {
      p_user_id: userId,
      p_pontos:  EVOLUE_CONFIG.pontos.login_diario,
      p_motivo:  'Login diário',
      p_icone:   '📅',
    });

    localStorage.setItem(chave, '1');
  }

  // ── Tradução de erros do Supabase ───────────────────────────
  function traduzirErro(msg) {
    const erros = {
      'Invalid login credentials':         'E-mail ou senha incorretos.',
      'Email not confirmed':               'Confirme seu e-mail antes de entrar.',
      'User already registered':           'Este e-mail já está cadastrado.',
      'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
      'Unable to validate email address':  'E-mail inválido.',
      'Email rate limit exceeded':         'Muitas tentativas. Aguarde alguns minutos.',
      'Invalid email or password':         'E-mail ou senha incorretos.',
    };
    return erros[msg] || 'Ocorreu um erro. Tente novamente.';
  }

  // ── Getters públicos ────────────────────────────────────────
  function getUsuario() { return _usuario; }
  function getPerfil()  { return _perfil;  }
  function estaLogado() { return !!_usuario; }

  async function atualizarPerfil(dados) {
    if (!_usuario) return;
    const { data, error } = await supabase
      .from('profiles')
      .update(dados)
      .eq('id', _usuario.id)
      .select()
      .single();

    if (error) throw new Error('Erro ao salvar perfil.');
    _perfil = data;
    return data;
  }

  // ── API pública ─────────────────────────────────────────────
  return {
    init,
    cadastrar,
    entrar,
    entrarComGoogle,
    enviarMagicLink,
    sair,
    resetarSenha,
    getUsuario,
    getPerfil,
    estaLogado,
    atualizarPerfil,
    carregarPerfil,
  };

})();
