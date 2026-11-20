# 07. Design system no Paper

O design system vive no **Paper** (Paper Design, conectado via MCP). Ele é a fonte da verdade visual; o código só o reflete.

## Como o Paper entra no fluxo

| Momento | Skill | O que acontece |
|---|---|---|
| Decidir a UI de uma página ou o próprio design system | `/architect` | Pergunta a fonte do design (Paper é a primeira opção) e registra na spec **qual arquivo e quais artboards** |
| Construir | `/develop` → `ui/mcp.md` | Carrega o guia do Paper, lê tokens e estilos exatos (`get_tokens`, `get_computed_styles`, `get_jsx`), escreve `design.md` apontando para os tokens, implementa |
| Conferir | `/check verify` | Renderiza o app e compara com o artboard (`get_screenshot` só para comparação visual) |
| Mudar a direção visual | `/architect` de novo | Nunca pedir direto ao `/develop`: a mudança é uma decisão, vira spec nova ou atualização |

## Regras

- **Valores exatos vêm das ferramentas do Paper, nunca de screenshot.**
- **Um valor, um lugar.** Tokens no Paper → exportados para o código (CSS/tokens); `design.md` guarda o caráter e as regras de composição e só *aponta* para os valores.
- As skills de construção **não escrevem no arquivo do Paper**. Mudanças no design acontecem no Paper, por você ou por uma tarefa de design explícita.
- Toda tela sai completa: estados vazio, carregando e erro; contraste checado em claro e escuro.

## O design system como primeiro projeto piloto

O DS é o primeiro projeto a passar pelo workflow (brownfield): `/audit` → `/scope` → `/architect` (fundação de UI / tokens) → `/develop`. Pendências para começar estão na feature 8 do [scope](../scope/scope.md): localizar o arquivo do Paper, decidir se existe (ou vai existir) um repositório de código do DS e qual o formato de saída (CSS variables, Tailwind theme, pacote de componentes).
