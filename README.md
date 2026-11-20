<img src="assets/icon.svg" width="64" height="64" alt="">

# Project Zero Dawn

O núcleo do meu workflow de engenharia agêntica: o método, as skills que todo projeto roda, as regras globais dos agentes e o registro dos projetos que ele cria e mantém.

> Nome inspirado em Horizon Zero Dawn, em que uma IA organiza e mantém um mundo de máquinas. Por enquanto o foco é o método; a persona (GAIA e subfunções) vem depois.

## Em uma frase

Os agentes executam contra **decisões escritas em arquivos no repositório**, num fluxo de nove etapas: `/scope → /audit → /architect → /develop → /check → /test → /document → /sync`, mais `/debug` fora do trilho.

## Começando

```bash
scripts/install.sh   # liga as skills e as regras globais em todas as sessões
npm run check        # valida as skills (convenções e orçamento de tamanho)
```

Num projeto qualquer: `/scope` (novo), `/audit` (existente), `/debug` (bug), `/scope` sem argumentos (onde eu parei?).

## Mapa

| Caminho | O que é |
|---|---|
| [`docs/workflow/`](docs/workflow/README.md) | O método, em PT-BR (comece aqui) |
| [`skills/`](skills/) | As nove skills (fork adaptado de jsmastery-pro/skills) |
| [`global/RULES.md`](global/RULES.md) | Regras carregadas em toda sessão (autonomia, deploy, idioma, modelos) |
| [`docs/portfolio/registry.md`](docs/portfolio/registry.md) | Registro dos projetos |
| [`docs/scope/scope.md`](docs/scope/scope.md) | O plano do próprio Zero Dawn |
| [`docs/specs/`](docs/specs/) | Decisões do Zero Dawn |
| [`scripts/`](scripts/) | Instalador, checagem e diff com o upstream |

## Créditos

Skills derivadas de [jsmastery-pro/skills](https://github.com/jsmastery-pro/skills) (MIT, JavaScript Mastery). Veja [`NOTICE.md`](NOTICE.md).
