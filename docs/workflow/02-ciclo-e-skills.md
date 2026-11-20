# 02. Ciclo e skills

Nove skills, uma por etapa. Rode só as que a mudança precisa, na ordem que fizer sentido. Os detalhes de cada uma estão no `SKILL.md` correspondente em [`skills/`](../../skills/).

## As nove

| Skill | Fase | Faz | Escreve | Não faz |
|---|---|---|---|---|
| `/scope` | Planejar | Ideia → plano grosso do que construir e em que ordem. Sem argumento, mostra o status e o próximo passo | `docs/scope/` | Não escolhe bibliotecas nem desenha (*o quê*, nunca *como*) |
| `/audit` | Planejar | Lê o código real e escreve os arquivos de contexto | `AGENTS.md` (+ `CLAUDE.md` ponteiro) | Não inventa convenção que o código não mostra |
| `/architect` | Planejar | Toma uma decisão (stack, modelo de dados, página) e escreve como spec com ACs numerados | `docs/specs/` (Proposed) | Não escreve código; não entrega opções sem recomendação |
| `/develop` | Construir | Única skill que escreve código de aplicação, a partir da spec | código, `design.md`, status da spec, scope | Não marca pronto sozinho |
| `/check` | Provar | `verify`: dirige o app real contra os ACs. `review`: revisão sênior em **outro modelo** | `docs/reviews/` | Não edita código, reporta |
| `/test` | Provar | Suíte de testes do código alterado | testes | Não escreve teste que só confirma o código atual |
| `/document` | Entregar | Texto humano a partir do diff real: PR, changelog, release note, postmortem | PR body, `CHANGELOG.md`, `docs/releases/`, `docs/postmortems/` | Não escreve código nem specs |
| `/sync` | Entregar | Reconcilia `AGENTS.md`, scope e specs com o código; atualiza o registro do portfólio; faz merge (autonomia `full`) | edições cirúrgicas | Não reescreve prosa alheia |
| `/debug` | Fora do trilho | Reproduz → localiza → uma hipótese → menor correção → teste de regressão | a correção | Não arruma código não relacionado |

## Pontos de entrada

| Situação | Comece com |
|---|---|
| Produto novo | `/scope` |
| Base de código existente | `/audit` → `/scope` |
| Bug | `/debug` |
| Mudança pequena | `/develop` → `/check verify` |
| Voltando de uma pausa | `/scope` sem argumentos |
| Mudar direção visual / decisão | `/architect` de novo, depois `/develop` (nunca direto no develop) |

## Ordem completa num projeto novo

```
/scope → /architect (stack) → scaffold + /audit → /architect (feature)
→ /develop → /check verify → /test → /check review → /document → /sync
→ limpar sessão → próxima feature
```

## Os arquivos que carregam o trabalho

```
projeto/
├── AGENTS.md              ← regras do projeto (stack, comandos, convenções, ## Git)
├── CLAUDE.md              ← só "@AGENTS.md"
├── design.md              ← direção de arte; valores reais ficam no CSS/tokens
├── CHANGELOG.md
├── docs/
│   ├── scope/scope.md     ← o que construir e em que ordem
│   ├── specs/0001-….md    ← uma decisão por spec (+ verify.md)
│   ├── reviews/           ← achados do /check review
│   ├── releases/
│   └── postmortems/
└── src/<área>/AGENTS.md   ← regras locais (aninhado)
```

Se `docs/` for um site publicado, tudo vai para `.workflow/`.

| Arquivo | Cria | Lê | Altera |
|---|---|---|---|
| `AGENTS.md` + `CLAUDE.md` | `/audit` | todas | `/sync` |
| `docs/scope/` | `/scope` | `/architect`, `/develop` | `/develop` avança; `/scope` e `/sync` reconciliam |
| `docs/specs/` | `/architect` | `/develop` | `/develop` só o status; `/architect` o conteúdo; `/sync` sinaliza spec velha |
| `design.md` + tokens | `/develop` | `/develop`, `/check` | `/develop` |
| registro do portfólio (Zero Dawn) | `/scope` (projeto novo) | você | `/sync` |

## Ciclo de vida de uma spec

`Proposed` (criada) → `In Progress` (develop começou) → `Accepted` (verificada e testada). Substituída: a antiga vira `Superseded` com ponteiro. Construída sem decisão: `Assumed`, sinalizada até o `/architect` ratificar.
