// EVOLUE CARREIRAS — auth.js
const Auth = (() => {
  let _usuario = null;
  let _perfil  = null;
  const SB = () => window.supabaseClient;
  const URL_APP = 'https://evolue-carreiras.vercel.app';
  const LOCAL_USER_KEY = 'evolue_demo_user';
  const LOCAL_PROFILE_KEY = 'evolue_demo_profile';

  function temSupabase() {
    return !!SB()?.auth;
  }

  function perfilLocalBase(user) {
    const salvo = JSON.parse(localStorage.getItem(LOCAL_PROFILE_KEY) || '{}');
    return {
      id: user.id,
      email: user.email || '',
      nome: user.user_metadata?.nome || salvo.nome || 'Candidato EVOLUE',
      telefone: salvo.telefone || '',
      cidade: salvo.cidade || '',
      escolaridade: salvo.escolaridade || '',
      area_interesse: salvo.area_interesse || '',
      experiencia: salvo.experiencia || '',
      plano: salvo.plano || 'free',
      curriculos_emitidos: salvo.curriculos_emitidos || 0,
      career_points: salvo.career_points || 0,
      selo: salvo.selo || 'bronze',
      ...salvo
    };
  }

  function criarSessaoLocal({ nome = 'Candidato EVOLUE', email = 'demo@evolue.local' } = {}) {
    _usuario = {
      id: 'demo-user',
      email,
      user_metadata: { nome }
    };
    _perfil = perfilLocalBase(_usuario);
    _perfil.nome = nome || _perfil.nome;
    _perfil.email = email || _perfil.email;
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(_usuario));
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(_perfil));
    return { user: _usuario, session: { user: _usuario } };
  }

  async function init() {
    if (!temSupabase()) {
      const salvo = JSON.parse(localStorage.getItem(LOCAL_USER_KEY) || 'null');
      if (salvo) {
        _usuario = salvo;
        _perfil = perfilLocalBase(salvo);
      }
      return { usuario: _usuario, perfil: _perfil };
    }

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
    if (!temSupabase()) {
      const data = criarSessaoLocal({ nome, email });
      window.dispatchEvent(new CustomEvent('evolue:login', { detail: { usuario: _usuario, perfil: _perfil } }));
      return data;
    }

    const { data, error } = await SB().auth.signUp({
      email,
      password: senha,
      options: { data: { nome }, emailRedirectTo: URL_APP }
    });
    if (error) throw new Error(traduzirErro(error.message));
    if (data.user) {
      try {
        await SB().from('profiles').upsert({ id: data.user.id, nome, email: data.user.email });
      } catch(e) {}
    }
    return data;
  }

  async function entrar({ email, senha }) {
    if (!temSupabase()) {
      const data = criarSessaoLocal({ nome: email?.split('@')[0] || 'Candidato EVOLUE', email });
      window.dispatchEvent(new CustomEvent('evolue:login', { detail: { usuario: _usuario, perfil: _perfil } }));
      return data;
    }

    const { data, error } = await SB().auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(traduzirErro(error.message));
    try { await registrarLoginDiario(data.user.id); } catch(e) {}
    return data;
  }

  async function entrarComGoogle() {
    if (!temSupabase()) {
      const data = criarSessaoLocal({ nome: 'Candidato EVOLUE', email: 'google.demo@evolue.local' });
      window.dispatchEvent(new CustomEvent('evolue:login', { detail: { usuario: _usuario, perfil: _perfil } }));
      return data;
    }

    const { error } = await SB().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: URL_APP }
    });
    if (error) throw new Error(traduzirErro(error.message));
  }

  async function sair() {
    if (!temSupabase()) {
      _usuario = null;
      _perfil = null;
      localStorage.removeItem(LOCAL_USER_KEY);
      window.dispatchEvent(new CustomEvent('evolue:logout'));
      return;
    }

    const { error } = await SB().auth.signOut();
    if (error) throw new Error(traduzirErro(error.message));
  }

  async function resetarSenha(email) {
    if (!temSupabase()) return;

    const { error } = await SB().auth.resetPasswordForEmail(email, {
      redirectTo: URL_APP
    });
    if (error) throw new Error(traduzirErro(error.message));
  }

  async function carregarPerfil(userId) {
    if (!temSupabase()) return perfilLocalBase(_usuario || { id: userId, email: '' });

    try {
      const { data } = await SB().from('profiles').select('*').eq('id', userId).single();
      if (data) return data;
    } catch(e) {}

    return perfilLocalBase(_usuario || { id: userId, email: '' });
  }

  async function atualizarPerfil(dados) {
    if (!_usuario) return;
    if (!temSupabase()) {
      _perfil = { ...perfilLocalBase(_usuario), ...dados, id: _usuario.id, email: _usuario.email };
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(_perfil));
      return _perfil;
    }

    const { data, error } = await SB()
      .from('profiles')
      .upsert({ id: _usuario.id, email: _usuario.email, ...dados })
      .select()
      .single();
    if (error) throw new Error('Erro ao salvar perfil.');
    _perfil = data;
    return data;
  }

  async function registrarLoginDiario(userId) {
    if (!temSupabase()) return;

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
