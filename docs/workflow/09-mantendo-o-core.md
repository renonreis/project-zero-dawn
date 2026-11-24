# 09. Mantendo o core

## Instalação

```bash
scripts/install.sh              # instala/atualiza (idempotente)
scripts/install.sh --uninstall  # remove tudo que o script criou
```

O instalador:

- cria links de `skills/*` em `~/.claude/skills/` (Claude Code) e `~/.agents/skills/` (convenção genérica de Agent Skills);
- cria links de `agents/*.md` em `~/.claude/agents/` (subagentes `scout` e `researcher`);
- adiciona ao `~/.claude/CLAUDE.md` um bloco gerenciado que importa `global/RULES.md` e diz onde fica o Zero Dawn;
- liga o mesmo `global/RULES.md` como instruções globais do Copilot CLI (`~/.copilot/copilot-instructions.md`) e do Gemini/Antigravity (`~/.gemini/GEMINI.md`), para que sessões nesses provedores no T3 também sigam as regras.

Como são links simbólicos, editar uma skill aqui vale na hora para todos os projetos (reinicie a sessão). Nunca sobrescreve arquivo ou pasta que não seja dele.

**Depois (a avaliar juntos):** empacotar como plugin/marketplace do Claude Code para versionar e instalar em outras máquinas.

## Origem e adaptações

As skills são um fork de [jsmastery-pro/skills](https://github.com/jsmastery-pro/skills) (MIT), importado no commit `43b69e4`. O commit `42d85b8` é a cópia intacta; tudo depois é nosso. Ver o diff completo:

```bash
git diff 42d85b8 -- skills agents
```

| # | Adaptação | Arquivos |
|---|---|---|
| A1 | Conversa em PT-BR por padrão (outro idioma só se o engenheiro escrever nele), arquivos em inglês (bloco OUTPUT-STYLE, igual em todas) | `skills/*/SKILL.md` |
| A2 | `/check review` tenta primeiro outro provedor via delegação do T3 (Gemini no Antigravity, depois GPT OSS; spec 0002) | `check/modes/review.md` |
| A3 | Crítica de spec do `/architect` em outro provedor | `architect/internal/after-subagent.md` |
| A4 | Paper como ferramenta de design padrão; regras de leitura de valores exatos; tokens podem vir do código (`## Design sources`) | `develop/ui-guide.md`, `develop/ui/mcp.md`, `architect/internal/design-conversation.md` |
| A5 | Configuração `autonomy: confirm \| full` no `## Git`; deploy sempre confirma | `develop/flow/git.md`, `document/SKILL.md`, `audit/modes/greenfield.md` |
| A6 | Pergunta de visibilidade do repo e registro no portfólio | `scope/modes/plan-greenfield.md`, `sync/SKILL.md` |
| A7 | `/sync` faz merge sob `autonomy: full` com os checks do tier verdes | `sync/SKILL.md` |
| A8 | Monorepo de produto único (ex.: DS + Storybook) usa um scope só | `scope/modes/plan-monorepo.md`, `scope/scope-template.md` |
| A9 | Poda dos hot paths abaixo de 90% do orçamento: regras repetidas viram ponteiro, justificativas saem. Ao portar do upstream, não reintroduza o texto cortado | `scope/*`, `develop/SKILL.md`, `develop/flow/build.md`, `develop/ui-guide.md`, `architect/SKILL.md`, `architect/agent-prompt.md`, `architect/internal/*`, `audit/SKILL.md` |

| A10 | `/check review` para na terceira rodada com bloqueio aberto e devolve a decisão ao engenheiro | `check/modes/review.md` |
| A11 | Porteiro `zd-gate` (spec 0003): `/sync` roda antes de todo merge e só grava o trailer de aprovação depois do sim do engenheiro; `/audit` chama `zd-gate init` ao registrar um projeto | `sync/SKILL.md`, `audit/SKILL.md` |
| A12 | `/check verify` grava o veredito em `docs/reviews/<data>-verify-<feature>.md`; review e verify nunca sobrescrevem uma rodada (`-2`, `-3`); `/sync` commita esses arquivos (spec 0005) | `check/SKILL.md`, `check/modes/verify.md`, `check/modes/review.md`, `sync/SKILL.md` |

Toda nova divergência entra nesta tabela.

## Trazendo melhorias do upstream

```bash
scripts/upstream-diff.sh                         # o que mudou desde o pin
scripts/upstream-diff.sh skills/scope/SKILL.md   # diff de um arquivo
```

Porte à mão, preservando as adaptações acima; depois atualize o `PINNED` no script e o commit no `NOTICE.md`.

## Ritual de poda por evidência

Contrato: [spec 0004](../specs/0004-setup-pruning/index.md). O ritual responde se uma regra ainda é necessária. Ele complementa os orçamentos do `npm run check` e nunca os substitui: o check controla tamanho todo dia, o ritual controla necessidade, raramente.

**Quando:** um modelo Claude autor da [spec 0002](../specs/0002-model-routing.md) muda de geração (5.5 para 6 conta; 5.5 para 5.6 não). A emenda da spec 0002 abre a tarefa no scope e você escolhe a hora. A primeira rodada é a do Opus 5.5.

**O que nunca sai (em nenhum braço, nunca vira corte):**

- em `global/RULES.md`: Autonomia inteira (com Hostinger e `zd-gate`), Língua, evidência com `Not tested` e `Needs your OK`, provedores permitidos;
- tudo do `zd-gate`: `scripts/`, `.zd/`, `.github/`, passo do `/sync`, inscrição no `/audit`, regra do trailer;
- texto de skill que pede confirmação (merge, deploy, gasto, exclusão, publicação) ou limita quem escreve e aprova;
- permissões, denies, `allowed-tools` e o bloco `OUTPUT-STYLE`;
- títulos, nomes de arquivo e formatos que outra skill ou checker lê.

Na dúvida, a linha é protegida. O `protected-core.md` da rodada traz o texto literal, aprovado por você antes.

**Braços:** `full` (setup inteiro), `bare` (só o protegido), `restore` (bare mais o que voltou), `pruned` (full menos os cortes). `AGENTS.md`, scope e specs do projeto ficam em todos.

### Isolamento

Nunca mexa em `~/.claude`, `~/.agents`, `~/.gemini` ou no checkout principal. Grave os alvos dos links e os hashes do setup instalado antes e depois.

1. Clone em `mktemp -d` novo, sem `AGENTS.md` nem `CLAUDE.md` em pastas acima. Use `git archive` do commit base e um commit raiz novo, sem remote. Nunca worktree.
2. Copie as skills e agents do braço, a partir do commit do setup, para `.claude/` do clone, listado em `.git/info/exclude`. Instale dependências fora do sandbox.
3. Preflight em sessão separada (Haiku): modelo, `apiKeySource: none`, skills e agents esperados, zero MCP, rede negada, leitura de `~/.claude` negada, escrita fora do clone negada por `Bash` e por `Write`.
4. Rode:

```bash
env -u CLAUDECODE -u CLAUDE_CODE_SESSION_ID CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 \
  claude -p --model <id> --effort high \
  --setting-sources project --strict-mcp-config \
  --settings <inputs>/sandbox.json --append-system-prompt-file <regras do braço> \
  --permission-mode dontAsk --allowedTools "Bash,Read,Edit(/**),Write(/**),Glob,Grep,Skill,Agent" \
  --input-format stream-json --output-format stream-json --verbose --no-session-persistence
```

5. Procure na transcrição leituras fora do clone e o gabarito. Guarde diff, artefato e transcrição em `~/.local/state/zd-pruning/<data>-<modelo>/` (só você apaga).

Rodada que falha no preflight, lê o que não devia, troca de modelo ou bate na cota é **nula**: refaz, registra, conta no limite e não é julgada. Se uma flag mudar na CLI, pare e emende a spec.

### Passos

1. Escolha 2 ou 3 tarefas já mergeadas (ao menos uma spec e um build, nunca de projeto de outro dono). Congele em git briefings, gabarito, `protected-core.md` e `sandbox.json`. Mudar depois anula as rodadas que usaram.
2. Rode cada tarefa uma vez em `full` e uma em `bare`.
3. Checks objetivos primeiro. Depois o Gemini compara A e B às cegas, item a item do gabarito, citando evidência.
4. **Miss:** item que o `full` cumpre e o `bare` não, ou dano que só o `bare` fez. Repita uma vez em `bare`. Só vale se aparecer nas duas, com evidência e com o seu sim. Estilo e `unsure` não contam.
5. Para cada miss, liste os trechos suspeitos em ordem (você confirma) e restaure um por vez, rodando a tarefa a cada um. Fica só o que fez o miss sumir.
6. Corte candidato é trecho não protegido, exercitado no `full` e não restaurado. O que não foi exercitado fica como `no evidence`. Personas são avaliadas trecho a trecho.
7. Rode as tarefas com o setup podado. Regressão em uma tarefa devolve todos os cortes que ela exercitou.
8. Texto que o Gemini lê (`/check review`) só sai depois do replay no Gemini.

**Limite:** 24 rodadas Claude, nulas inclusas, com 3 reservadas para o passo 7. O que não se resolveu fica no setup. Cota estourada espera; nunca troca de modelo.

**Como os cortes entram:** você aprova a tabela de trechos; um PR por skill (personas em commit separado, primeiro), depois `global/RULES.md` e `agents/`. Cada PR passa `npm run check` e `zd-gate` e entra na tabela de adaptações acima, para o port do upstream não trazer o texto de volta. O relatório fica em `docs/reviews/`.

## Editando ou criando skills

- Siga [`upstream/conventions.md`](../../upstream/conventions.md): cada linha precisa mudar o comportamento; instrua, não justifique; conteúdo raro e longo vai para arquivo de referência lido sob demanda.
- Formato: `skills/<nome>/SKILL.md` com frontmatter (`name`, `description` < 400 caracteres, `allowed-tools`) + `agents/openai.yaml` (adaptador Codex) + referências.
- Sem hífen nem travessão na prosa das skills (o checker reprova).
- **Rode `npm run check` antes de commitar.** Caminhos acima de 90% do orçamento pedem poda, não aumento de limite.
- Estrutura de toda skill: quando rodar · o que lê · o que escreve · passos numerados · para quem passa · o que não faz.
