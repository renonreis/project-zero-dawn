# 07. Design system no Paper

O design system tem **duas fontes da verdade**, cada uma para uma coisa:

| O quê | Fonte da verdade | Por quê |
|---|---|---|
| **Tokens** (cor, tipografia, espaço, raio, sombra, motion; marcas, temas, modos) | O **código** do DS (no Triquetra, `packages/react/tokens/`, formato DTCG) | O Paper ainda tem limites técnicos com tokens (sem modos, sem aliases entre camadas, sem marcas). O código valida o build, o contraste e a paridade claro/escuro. |
| **Design dos componentes** (layout, anatomia, estados) | O **Paper** (Paper Design, conectado via MCP) | É onde o design é feito e revisto. |

O Paper **consome** os tokens do código; nunca os define. Cada projeto diz isso no `AGENTS.md`, numa seção `## Design sources`.

**Depois:** um **gestor de tokens** (produto separado no portfólio) vai ser a fonte de distribuição: gerencia os tokens de cada DS e de cada marca, empurra para o Paper e propaga as mudanças. Até ele existir, o Paper é alinhado aos tokens do código por uma checagem de paridade.

## Como o Paper entra no fluxo

| Momento | Skill | O que acontece |
|---|---|---|
| Decidir a UI de uma página ou o próprio design system | `/architect` | Pergunta a fonte do design (Paper é a primeira opção) e registra na spec **qual arquivo e quais artboards** |
| Construir | `/develop` → `ui/mcp.md` | Carrega o guia do Paper, lê layout, anatomia e estados exatos (`get_computed_styles`, `get_jsx`); os valores de token vêm do código. Escreve `design.md` apontando para os tokens e implementa |
| Conferir | `/check verify` | Renderiza o app e compara com o artboard (`get_screenshot` só para comparação visual) |
| Mudar a direção visual | `/architect` de novo | Nunca pedir direto ao `/develop`: a mudança é uma decisão, vira spec nova ou atualização |

## Regras

- **Valores exatos vêm das ferramentas do Paper, nunca de screenshot.**
- **Um valor, um lugar.** Tokens no código → exportados para CSS e para o Paper; `design.md` guarda o caráter e as regras de composição e só *aponta* para os valores.
- **Token diferente entre Paper e código é drift**, para reportar e corrigir no Paper; nunca um valor para copiar para o código.
- As skills de construção **não escrevem no arquivo do Paper**. Mudanças no design acontecem no Paper, por você ou por uma tarefa de design explícita.
- Toda tela sai completa: estados vazio, carregando e erro; contraste checado em claro e escuro.

## O design system como primeiro projeto piloto

O DS é o primeiro projeto a passar pelo workflow (brownfield): `/audit` → `/scope` → `/architect` (fundação de UI / contrato de tokens e paridade com o Paper) → `/develop`. Projeto: **Triquetra Design System** ([arquivo no Paper](https://app.paper.design/file/01M7R4TP595GEKCEE8SHQCTJMX/p-2-0) · [repositório](https://github.com/renonreis/triquetra-design-system)). Acompanhamento na feature 7 do [scope](../scope/scope.md).
