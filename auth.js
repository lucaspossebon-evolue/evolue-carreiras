// EVOLUE CARREIRAS — auth.js
const Auth = (() => {
  let _usuario = null;
  let _perfil  = null;
  const SB = () => window.supabaseClient;
  const URL_APP = 'https://evolue-carreiras.vercel.app';

  async function init() {
    try {
      const { data: { session } } = await SB().auth.getSession();
      if (session?.user) {
        _usuario = session.user;
        _perfil  = await carregarPerfil(session.user.id);
      }
    } catch(e) { console.error('Erro ao iniciar sessão:', e); }

    SB().auth.onAuthStateChange(async (event, session) => {
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

  async function cadastrar({ nome, email, senha }) {
    const { data, error } = await SB().auth.signUp({
      email,
      password: senha,
      options: { data: { nome }, emailRedirectTo: URL_APP }
    });
    if (error) throw new Error(traduzirErro(error.message));
    if (data.user) {
      try {
        await SB().from('profiles').update({ nome }).eq('id', data.user.id);
      } catch(e) {}
    }
    return data;
  }

  async function entrar({ email, senha }) {
    const { data, error } = await SB().auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(traduzirErro(error.message));
    try { await registrarLoginDiario(data.user.id); } catch(e) {}
    return data;
  }

  async function entrarComGoogle() {
    const { error } = await SB().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: URL_APP }
    });
    if (error) throw new Error(traduzirErro(error.message));
  }

  async function sair() {
    const { error } = await SB().auth.signOut();
    if (error) throw new Error(traduzirErro(error.message));
  }

  async function resetarSenha(email) {
    const { error } = await SB().auth.resetPasswordForEmail(email, {
      redirectTo: URL_APP
    });
    if (error) throw new Error(traduzirErro(error.message));
  }

  async function carregarPerfil(userId) {
    try {
      const { data } = await SB().from('profiles').select('*').eq('id', userId).single();
      return data;
    } catch(e) { return null; }
  }

  async function atualizarPerfil(dados) {
    if (!_usuario) return;
    const { data, error } = await SB().from('profiles').update(dados).eq('id', _usuario.id).select().single();
    if (error) throw new Error('Erro ao salvar perfil.');
    _perfil = data;
    return data;
  }

  async function registrarLoginDiario(userId) {
    const hoje = new Date().toISOString().split('T')[0];
    const chave = `evolue_login_${hoje}`;
    if (localStorage.getItem(chave)) return;
    try {
      await SB().rpc('adicionar_career_points', {
        p_user_id: userId, p_pontos: 1, p_motivo: 'Login diário', p_icone: '📅'
      });
      localStorage.setItem(chave, '1');
    } catch(e) {}
  }

  function traduzirErro(msg) {
    const erros = {
      'Invalid login credentials':                  'E-mail ou senha incorretos.',
      'Email not confirmed':                        'Confirme seu e-mail antes de entrar.',
      'User already registered':                    'Este e-mail já está cadastrado.',
      'Password should be at least 6 characters':   'A senha deve ter pelo menos 6 caracteres.',
      'Unable to validate email address':            'E-mail inválido.',
      'Email rate limit exceeded':                   'Muitas tentativas. Aguarde alguns minutos.',
      'over_email_send_rate_limit':                  'Muitas tentativas. Aguarde 1 minuto.',
    };
    return erros[msg] || msg || 'Ocorreu um erro. Tente novamente.';
  }

  function getUsuario() { return _usuario; }
  function getPerfil()  { return _perfil;  }
  function estaLogado() { return !!_usuario; }

  return { init, cadastrar, entrar, entrarComGoogle, sair, resetarSenha, getUsuario, getPerfil, estaLogado, atualizarPerfil, carregarPerfil };
})();
