# 06. Modelos

> **Status: decidido** na [spec 0002](../specs/0002-model-routing.md) (feature 6 do [scope](../scope/scope.md)). A spec é o contrato; esta página explica para humanos.

## Provedores em uso (levantado em 20/11/2026)

| Provedor (T3) | Conta | Modelos usados |
|---|---|---|
| Claude (`claudeAgent`) | Claude Pro | Opus 5.5, Sonnet 5.5, Haiku 5.5 |
| Antigravity (`antigravity`) | Gemini | Gemini 3.8 Flash (não há Pro), GPT‑OSS 120B, Claude Opus/Sonnet 4.6 |

**GitHub Copilot foi descartado** (20/11/2026): a cota mensal acabou no meio do trabalho, e dois provedores são mais simples de controlar. Rode `orchestrator_capabilities` para ver o catálogo atual; se um modelo da tabela sumir, emende a spec 0002, não improvise.

## Princípios

1. **Claude Pro escreve.** Specs, código, testes: tudo sai de um modelo Claude. Opus para julgamento (`/scope`, `/architect`, `/debug`), Sonnet para construir (`/develop`, `/test`, `/check verify`, `/audit`, `/sync`).
2. **Antigravity revisa e redige.** Crítica de spec e `/check review` no Gemini 3.8 Flash (depois GPT‑OSS 120B); `/document` no Gemini 3.8 Flash. Como quem escreve é Claude, a revisão é independente por construção.
3. **Reserva no Antigravity.** Se a cota do Pro acabar, o trabalho cai para o Claude 4.6 do Antigravity (uma geração atrás: espere mais rodadas de correção).

## Tabela

| Skill | Onde roda | Reserva |
|---|---|---|
| `/scope`, `/architect`, `/debug` | Claude Pro · Opus 5.5 | Antigravity · Claude Opus 4.6 |
| `/develop`, `/test`, `/check verify` | Claude Pro · Sonnet 5.5 | Antigravity · Claude Sonnet 4.6 |
| `/develop` escalado | Claude Pro · Opus 5.5 | Antigravity · Claude Opus 4.6 |
| `/audit`, `/sync` | Claude Pro · Sonnet 5.5 | Antigravity · Claude Sonnet 4.6 |
| crítica do `/architect`, `/check review` | Antigravity · Gemini 3.8 Flash | GPT‑OSS 120B, por último outro Claude (avisando que não foi independente) |
| `/document` | Antigravity · Gemini 3.8 Flash | Claude Pro · Haiku 5.5 |
| `scout`, `researcher` | Haiku (frontmatter do agente) | modelo da sessão fora do Claude Code |

**Quando o `/develop` sobe para Opus:** a spec é crítica (auth/permissões, integridade de dados, pagamentos, migração; na dúvida pergunta uma vez) ou houve dois relatórios seguidos de `/check verify` com falha em `docs/reviews/` na mesma feature.

## Como é aplicado

- A GAIA lê a tabela quando lança ou delega uma thread no T3. O resumo e o link da spec estão em `global/RULES.md`, que todo provedor carrega.
- Reserva sem perguntar: se o provedor está desligado ou a execução falha por cota, limite ou indisponibilidade, a GAIA passa para a próxima opção e diz qual usou.
- Modelo errado: a skill avisa uma vez por thread (só se souber o modelo por fonte confiável) e oferece relançar. Não bloqueia.
- Nenhum `SKILL.md` tem `model:`; esse campo só funciona no Claude Code.

## Evidência e próximo passo

GPT‑6.2 Sol fez cinco cross checks com achados reais antes do Copilot sair. O cross check desta própria spec rodou no Gemini 3.8 Flash e trouxe 13 achados, 9 aplicados: primeira evidência a favor do Gemini como revisor. Próximo passo: no próximo `/check review` do piloto, comparar Gemini Flash e GPT‑OSS 120B uma vez e registrar na spec 0002.
