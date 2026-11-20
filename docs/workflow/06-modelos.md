# 06. Modelos

> **Status: decidido** na [spec 0002](../specs/0002-model-routing.md) (feature 6 do [scope](../scope/scope.md)). A spec é o contrato; esta página explica para humanos.

## O que está disponível hoje (via T3 Code, levantado em 20/11/2026)

| Provedor (T3) | Conta | Modelos relevantes |
|---|---|---|
| Claude (`claudeAgent`) | Claude Pro | Opus 5.5, Sonnet 5.5, Fable 5.2, Haiku 5.5 |
| GitHub Copilot (`acpRegistry_github_copilot`) | Copilot | GPT‑6.2 Sol, GPT‑6.2 Astra, Claude Opus/Sonnet/Haiku 5.x e mais ~18 no catálogo |
| Antigravity (`antigravity`) | Gemini | Gemini 3.8 Flash (não há Pro), GPT‑OSS 120B, Claude 4.6 |

Rode `orchestrator_capabilities` (com `search`) para ver o catálogo completo; ele muda. Se um modelo da tabela sumir, emende a spec 0002, não improvise.

## Princípios

1. **Claude Pro para conversa e julgamento.** `/scope`, `/architect` e `/debug` rodam em Opus no Pro; `/audit` e `/sync` em Sonnet no Pro.
2. **Copilot para build longo.** `/develop`, `/test` e `/check verify` rodam Claude Sonnet via Copilot, que é onde mais se gasta token.
3. **Build fica na família Claude.** Assim o GPT continua sendo um revisor independente. Se um build rodar em GPT, a revisão passa para o Gemini.
4. **Revisão sempre em outra família.** Crítica de spec e `/check review`: GPT‑6.2 Sol no Copilot, depois Gemini 3.8 Flash, por último outro modelo Claude.
5. **Texto barato no Gemini.** `/document` roda no Gemini 3.8 Flash.

## Tabela

| Skill | Onde roda | Reserva |
|---|---|---|
| `/scope`, `/architect`, `/debug` | Claude Pro · Opus 5.5 | Copilot · Opus 5.5 |
| crítica do `/architect`, `/check review` | Copilot · GPT‑6.2 Sol | Gemini 3.8 Flash, depois outro Claude |
| `/develop`, `/test`, `/check verify` | Copilot · Sonnet 5.5 | Claude Pro · Sonnet 5.5 |
| `/develop` escalado | Copilot · Opus 5.5 | Claude Pro · Opus 5.5 |
| `/audit`, `/sync` | Claude Pro · Sonnet 5.5 | Copilot · Sonnet 5.5 |
| `/document` | Antigravity · Gemini 3.8 Flash | Copilot · Haiku 5.5 |
| `scout`, `researcher` | Haiku (frontmatter do agente) | modelo da sessão fora do Claude Code |

**Quando o `/develop` sobe para Opus:** a spec marca a área como crítica (auth, integridade de dados, pagamentos, migração) ou o `/check verify` falhou duas vezes seguidas no mesmo slice.

## Como é aplicado

- A GAIA lê a tabela quando lança ou delega uma thread no T3 (`t3_thread_launch`, `delegate_task`). O resumo está em `global/RULES.md`, que todo provedor carrega.
- Se uma skill começar num modelo diferente do roteado, o agente avisa uma vez e oferece relançar no modelo certo. Não bloqueia.
- Nenhum `SKILL.md` tem `model:`. Esse campo só funciona no Claude Code e quebraria nas sessões via Copilot ou Antigravity.
- `/check review` e a crítica do `/architect` já escolhem outro provedor sozinhos (adaptações A2 e A3).

## Evidência e próximo passo

Cinco cross checks em GPT‑6.2 Sol (specs 0001 a 0003 do Triquetra, page design do renon.dev, PR #7 do Zero Dawn) levaram 2 a 2,5 min cada e acharam bloqueadores reais. Falta validar o Gemini: no próximo `/check review` do piloto, rodar Gemini 3.8 Flash em paralelo com GPT Sol uma vez e registrar a comparação na spec 0002.
