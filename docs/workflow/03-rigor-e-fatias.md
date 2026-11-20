# 03. Rigor e fatias

Três escolhas moldam cada projeto: o fio dos critérios de aceite (sempre), o tier de rigor e a abordagem de entrega.

## O fio dos critérios de aceite (AC)

1. `/architect` transforma cada requisito num AC curto e numerado ("um usuário logado vê só as próprias tarefas").
2. O build plan diz qual AC cada tarefa atende.
3. `/develop` escreve `verify.md` apontando para os mesmos ACs.
4. `/check verify` roda esses passos no app real.
5. `/test` trava os duradouros numa suíte.

Nada importante fica sem medição; nada é marcado pronto sem prova.

## Tier de rigor

Escolhido no `/scope` como default do projeto; cada feature pode sobrescrever (ex.: a feature de pagamento em `GA` num projeto `Beta`).

| Tier | Depois do `/develop` | Fecha "pronto" | Quando |
|---|---|---|---|
| Prototype | nada | `/develop` | descartável, spike |
| Alpha | `/check verify` | verify | ferramenta interna, prova rápida |
| **Beta** (default Zero Dawn) | verify + `/test` | test | produto real |
| GA | verify + test + `/check review` + `/document` | test | pagamentos, auth, dados sensíveis, regulado |

Em Beta e GA, o `/architect` recomenda fortemente a **crítica de outro modelo** sobre a spec antes de aceitar.

## Abordagens de entrega

O `/scope` recomenda uma com base no **maior risco escondido na ideia**.

| Abordagem | Apelido | Quando |
|---|---|---|
| Tracer bullet | thin thread | O risco é as camadas não conversarem: um caminho fino de ponta a ponta primeiro |
| MVP | skateboard | A dúvida é se alguém quer: a menor versão usável do todo |
| UI first | facade | A experiência precisa ser vista antes de investir em backend |
| Vertical slice | journey | Cada jornada precisa estar completa antes da próxima |

## Fundações antes de features (projeto novo)

Stack e arquitetura → padrões e tooling (`/audit`) → modelo de dados → design system → walking skeleton → fatias. Nunca uma feature antes do chão em que ela pisa.

## Regras de comportamento que as skills seguem

- Pergunta só o que não dá para deduzir; deduz o resto.
- Perguntas em lotes de até 4, com opções concretas e uma recomendada.
- O que está **fora** do escopo é escrito (deferred), senão a feature cresce para sempre.
- Arquivos de referência só são lidos quando o caminho exige (progressive disclosure).
