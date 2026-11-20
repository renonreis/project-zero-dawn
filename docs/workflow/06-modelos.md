# 06. Modelos

> **Status: rascunho.** A atribuição final de modelo por skill é uma decisão pendente (feature 6 do [scope](../scope/scope.md)), a ser tomada juntos e validada com uso real.

## O que está disponível hoje (via T3 Code, levantado em 20/11/2026)

| Provedor (T3) | Conta | Modelos relevantes |
|---|---|---|
| Claude (`claudeAgent`) | Claude Pro | Opus 5.5, Sonnet 5.5, Fable 5.2, Haiku 5.5 |
| GitHub Copilot (`acpRegistry_github_copilot`) | Copilot | GPT‑6.2 Sol, GPT‑6.2 Astra, Claude Sonnet/Opus/Haiku 5.x e mais ~18 no catálogo |
| Antigravity (`antigravity`) | Gemini | Gemini 3.8 Flash, GPT‑OSS 120B, Claude 4.6 |

Rode `orchestrator_capabilities` (com `search`) para ver o catálogo completo; ele muda.

## Princípios de roteamento

1. **Julgamento caro, execução barata.** Decisões (`/architect`, `/debug` difícil) no modelo mais forte; leitura e varredura (`scout`) no mais barato.
2. **Revisão sempre em outra família.** Crítica de spec e `/check review` nunca no mesmo modelo que escreveu. Preferência: GPT no Copilot, depois Gemini no Antigravity, por último outro Claude.
3. **Poupe a cota do Claude Pro** para o trabalho interativo e de construção; mande para Copilot/Antigravity o que roda sozinho e tem saída verificável.
4. **Esforço antes de trocar de modelo.** Às vezes subir o `effort` resolve melhor que trocar de modelo.

## Proposta inicial por skill (hipótese)

| Skill | Principal | Subagentes / delegação | Por quê |
|---|---|---|---|
| `/scope` | Claude Opus | `researcher`: Sonnet | Julgamento de produto, conversa interativa |
| `/audit` | Claude Sonnet | `scout`: Haiku | Leitura ampla, pouca decisão |
| `/architect` | Claude Opus | crítica: **GPT‑6.2 Sol (Copilot)** | Decisões carregadoras de peso + olhar independente |
| `/develop` | Claude Sonnet (Opus em backend crítico) | `scout`: Haiku | Construção longa, custo importa |
| `/check verify` | Claude Sonnet | (navegador/preview) | Dirigir o app e comparar com ACs |
| `/check review` | **GPT‑6.2 Sol (Copilot)**, alternativa Gemini | – | Família diferente do autor |
| `/test` | Copilot (Sonnet ou GPT) | – | Saída verificável (testes passam), poupa cota |
| `/document` | Gemini Flash ou Haiku | – | Texto a partir do diff, barato |
| `/sync` | Claude Sonnet | – | Edições cirúrgicas com contexto do repo |
| `/debug` | Claude Opus | `scout`: Haiku | Raciocínio de causa raiz |

## Como validar (experimento sugerido)

"Três revisores, uma feature": numa feature real do design system, rodar `/check review` em GPT‑6.2 Sol, Gemini e Claude Sonnet; comparar achados (quantos reais, quantos ruído) e custo. O resultado vira a spec de roteamento.

## O que já está ligado nas skills

- `/check review` e a crítica do `/architect` tentam primeiro **outro provedor via `delegate_task`**, e caem para outro modelo Claude se a delegação não estiver disponível.
- O subagente `scout` fixa o modelo rápido (Haiku).
- O resto herda o modelo da sessão até a decisão desta página virar spec.
