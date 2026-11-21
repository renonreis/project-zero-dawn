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

Toda nova divergência entra nesta tabela.

## Trazendo melhorias do upstream

```bash
scripts/upstream-diff.sh                         # o que mudou desde o pin
scripts/upstream-diff.sh skills/scope/SKILL.md   # diff de um arquivo
```

Porte à mão, preservando as adaptações acima; depois atualize o `PINNED` no script e o commit no `NOTICE.md`.

## Editando ou criando skills

- Siga [`upstream/conventions.md`](../../upstream/conventions.md): cada linha precisa mudar o comportamento; instrua, não justifique; conteúdo raro e longo vai para arquivo de referência lido sob demanda.
- Formato: `skills/<nome>/SKILL.md` com frontmatter (`name`, `description` < 400 caracteres, `allowed-tools`) + `agents/openai.yaml` (adaptador Codex) + referências.
- Sem hífen nem travessão na prosa das skills (o checker reprova).
- **Rode `npm run check` antes de commitar.** Caminhos acima de 90% do orçamento pedem poda, não aumento de limite.
- Estrutura de toda skill: quando rodar · o que lê · o que escreve · passos numerados · para quem passa · o que não faz.
