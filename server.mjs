# Evolue Carreiras

MVP navegavel da plataforma Evolue Carreiras para preparacao profissional de candidatos.

## O que esta incluido

- Cadastro do candidato.
- Gerador de curriculo com previa e impressao em PDF pelo navegador.
- Sugestoes automaticas de melhoria do curriculo.
- Central de dicas para entrevistas.
- Simulador de entrevista com feedback local.
- Tela de DISC com entrada manual preparada para integracao futura com Quickin.
- Recomendacoes por perfil, area e preparo.
- Pontuacao Bronze, Prata e Ouro.
- Dashboard interno EVOLUE com checklist de Perfil Validado.

## Como rodar

Com Node.js instalado:

```bash
node server.mjs
```

Depois acesse:

```text
http://127.0.0.1:4173
```

Tambem e possivel abrir o arquivo `index.html` diretamente no navegador.

## Observacoes tecnicas

Esta primeira versao nao usa dependencias externas, porque o ambiente atual tem Node.js mas nao tem `npm` disponivel. Os dados sao salvos no `localStorage` do navegador.

Para evoluir para producao, a recomendacao e migrar esta interface para Next.js, conectar Supabase ou Firebase, adicionar autenticacao e substituir as regras locais por chamadas a API com OpenAI.
