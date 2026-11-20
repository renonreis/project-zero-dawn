# 04. Sessão e contexto

## Context engineering

O prompt chega em cima de tudo que já está carregado: arquivos lidos, conversa, configuração sempre ativa. O contexto pesa mais que a redação do prompt. Decida de antemão:

| Camada | O quê | Onde |
|---|---|---|
| Sempre ativo | regras globais (curtíssimas) | `~/.claude/CLAUDE.md` → `global/RULES.md` |
| Sempre ativo no projeto | stack, comandos, convenções | `AGENTS.md` raiz (implacavelmente pequeno) |
| Sob demanda por área | regras locais | `AGENTS.md` aninhados |
| Sob demanda por tarefa | o procedimento | a skill (`SKILL.md`) e seus arquivos de referência |
| Sob demanda por decisão | o que construir e por quê | scope, specs |
| Nunca | segredos, dumps, histórico irrelevante | `.gitignore`, nada de colar logs gigantes |

Cada linha sempre ativa custa tokens em **toda** sessão. Antes de adicionar algo ao `AGENTS.md` ou às regras globais, pergunte: isso muda o que o agente faz? Se não, corte.

## Disciplina de sessão

1. **Uma etapa por sessão.** `/architect` numa, `/develop` noutra. Trabalho não relacionado na mesma sessão desvia o foco (topic switching).
2. **Comece sincronizado.** `git pull` antes; o `/develop` avisa se a branch está atrás ou se há trabalho não commitado na área.
3. **Limpe entre etapas** em vez de compactar. Como o estado está em arquivos, limpar não perde nada. Compacte só se precisar continuar a mesma etapa.
4. **Fique de olho no contexto.** A qualidade cai antes da janela encher (context rot). Referência prática: limpar ao passar de ~150k tokens.
5. **Sessão quebrada?** Não insista. Limpe e recomece a partir dos arquivos; o `/develop` retoma na primeira tarefa pendente.

## Threads no T3 Code

- Uma thread por etapa ou por feature, nomeada pela feature.
- Delegação (`delegate_task`) para trabalho paralelo, revisão em outro modelo ou para economizar a cota do Claude (ver [06](06-modelos.md)).
- O que importa da thread vira arquivo (spec, scope, review) antes de encerrá-la.
