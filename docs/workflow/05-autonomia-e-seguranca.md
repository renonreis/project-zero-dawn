# 05. Autonomia e segurança

Fonte executável destas regras: [`global/RULES.md`](../../global/RULES.md), carregado em toda sessão. Este documento explica; o arquivo manda.

## O que o agente faz sem perguntar

- Criar repositórios no GitHub (perguntando antes **público ou privado**, com recomendação).
- Criar branches, commitar, fazer push.
- Abrir e atualizar PRs.
- Fazer merge, quando os checks do tier passaram (o `/sync` faz isso com `autonomy: full`).

Isso é ligado por projeto no bloco `## Git` do `AGENTS.md`:

```markdown
## Git
- integration: on
- branch prefix: `feat/`
- commit: per-milestone
- autonomy: full
```

`autonomy: confirm` volta ao comportamento original das skills (push e PR pedem confirmação). Use em projetos de terceiros ou de clientes.

## Transparência: sempre anunciar

Autonomia não é silêncio. Toda ação com efeito fora da máquina (repo criado, push, PR aberto, merge, issue) é **anunciada quando acontece** e **listada no fim da resposta**, com link, junto com **o que agora depende de você** para o fluxo continuar.

## O que sempre pede o seu ok

- **Deploy** ou release para qualquer ambiente.
- Qualquer coisa que gaste dinheiro (planos, domínios, serviços pagos).
- Apagar repositório, branch remota de outra pessoa ou dados.
- Publicar fora do GitHub.
- Decisões carregadoras de peso que não estão numa spec (o `/develop` para e manda ao `/architect`).

## Proibido

- **Hostinger**: nenhum acesso direto (MCP, skills `hostinger:*`, API) até você liberar editando `global/RULES.md`.

## Visibilidade de repositório

A maioria será pública, mas a decisão é sempre perguntada no nascimento do projeto (passo 0 do `/scope` greenfield). Recomendação padrão: **público**, exceto quando houver segredos difíceis de isolar, trabalho de cliente ou vantagem comercial em manter fechado.

## Camadas de defesa

Nenhum check isolado é garantia. A segurança vem das camadas: `/architect` nomeia a fonte de cada valor → `/develop` checa decisões pendentes e faz passe de segurança no backend → crítica de outro modelo (Beta+) → `/check verify` e `/test` para comportamento → `/check review` antes do merge (GA).
