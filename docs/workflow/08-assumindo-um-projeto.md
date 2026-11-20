# 08. Assumindo um projeto

Roteiro que o agente segue quando você pede um projeto novo ou traz um existente para o Zero Dawn.

## Projeto novo (greenfield)

1. **Entender a ideia** (`/scope`): uma frase basta, um briefing é melhor. O agente pergunta só o que a ideia não responde, em lotes, sempre com uma recomendação.
2. **Repositório**: pergunta **público ou privado** (com recomendação), cria no GitHub e registra no [portfólio](../portfolio/registry.md).
3. **Plano**: abordagem de entrega + tier (default Beta) + features em ordem, com o que fica de fora explícito → `docs/scope/scope.md`.
4. **Stack** (`/architect`, stack mode): não há stack padrão; cada projeto decide, com recomendação e segunda opção. Crítica de outro modelo antes de aceitar.
5. **Scaffold** com a ferramenta oficial da stack (`/develop`), depois **`/audit`** no projeto real → `AGENTS.md` com `## Git` em `autonomy: full`.
6. **Fundações**: modelo de dados, design system (tokens no código, design dos componentes no Paper, quando houver UI), walking skeleton.
7. **Loop por feature**: `/architect` → `/develop` → provas do tier → `/document` → `/sync` (merge + atualização do portfólio).
8. **Deploy**: só com o seu ok, sempre.

## Projeto existente (brownfield)

1. **`/audit`** primeiro: mapeia stack, scripts, convenções e achados (ex.: caminhos mortos) antes de qualquer mudança.
2. **`/scope`**: registra o que já existe como `existing`/`in-progress` e planeja a próxima fatia em cima da realidade.
3. Entra no registro do portfólio.
4. Loop normal. Em monorepo, cada workspace tem o próprio scope, specs e `AGENTS.md` aninhado.

## O que o agente decide sozinho vs pergunta

| Decide sozinho (e diz o que fez) | Recomenda e você escolhe | Sempre pergunta |
|---|---|---|
| Deduções óbvias do código e da ideia; nomes de branch; granularidade de commit; ordem de tarefas dentro da spec; abrir PR; merge com checks verdes | Stack, modelo de dados, abordagem, tier, design, escopo do MVP, modelo de acesso, monetização | Público vs privado; deploy; gastos; algo que contradiz uma spec |

## Checklist de "projeto entrou no Zero Dawn"

- [ ] Linha no registro do portfólio
- [ ] `AGENTS.md` + `CLAUDE.md` (ponteiro) com bloco `## Git`
- [ ] `docs/scope/scope.md` com tier e abordagem
- [ ] Specs das fundações decididas
