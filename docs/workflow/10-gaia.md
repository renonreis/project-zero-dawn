# 10. GAIA e as subfunções

Em Horizon Zero Dawn, a GAIA não faz tudo sozinha: ela coordena nove subfunções, cada uma com uma tarefa. O Zero Dawn usa a mesma ideia como **camada de nomes** sobre o workflow. A sessão principal é a GAIA, e cada skill roda como uma subfunção.

> **Status: em teste** (decidido em 20/11/2026, feature 9 do [scope](../scope/scope.md)). Se algum papel mudar (ex.: o roteamento de modelos da feature 6), atualize esta tabela.

## O mapa

| Skill | Subfunção (contratos, em inglês) | Em PT-BR | Função no jogo → função aqui |
|---|---|---|---|
| sessão principal | **GAIA** | GAIA | Orquestra as subfunções → orquestra as skills e as delegações |
| `/scope` | **DEMETER** | Deméter | Reintroduz a flora → semeia o que construir |
| `/audit` | **POSEIDON** | Poseidon | Desintoxica a hidrosfera → torna legível um código herdado |
| `/architect` | **ELEUTHIA** | Ilítia | Gestação → a spec gera a feature antes de ela nascer |
| `/develop` | **HEPHAESTUS** | Hefesto | Projeta, produz e mantém as máquinas → a única que constrói |
| `/check` | **HADES** | Hades | Destrói biosferas não viáveis → reprova o que não deve ir para o merge |
| `/test` | **ARTEMIS** | Ártemis | Reintroduz as espécies (a caçadora) → caça os casos de borda e repovoa a cobertura |
| `/document` | **APOLLO** | Apolo | Educa os humanos → escreve a prosa para pessoas |
| `/sync` | **AETHER** | Éter | Estabiliza a atmosfera → reconcilia `AGENTS.md`, scope e specs |
| `/debug` | **MINERVA** | Minerva | Gera os códigos que desativam a praga → neutraliza a causa raiz |

O `scout`, o `researcher` e os filhos delegados mantêm o nome funcional. Um filho carrega o nome da subfunção que o chamou: o revisor de outro provedor do `/check review` aparece como `HADES · review PR #12`.

## Onde os nomes aparecem (e onde não)

| Aparece | Não aparece |
|---|---|
| Este glossário e os docs | `SKILL.md` e o bloco `OUTPUT-STYLE` (custo zero no orçamento de bytes) |
| Títulos de threads delegadas | Nomes de comando: continuam `/scope`, `/develop`… |
| Apresentação da sessão (uma linha em `global/RULES.md`) | Trailers de commit, arquivos de contrato, mensagens das skills |

É só nome. A voz continua a do `OUTPUT-STYLE`, e as fronteiras de responsabilidade continuam as da coluna "Não faz" em [02. Ciclo e skills](02-ciclo-e-skills.md). Como nada muda em `skills/`, isso não entra na tabela de adaptações do [09](09-mantendo-o-core.md).

## Cuidados de propriedade intelectual

Os nomes são de mitologia, mas o conjunto completo espelha o jogo (marca da Sony). Para um repo pessoal o risco é baixo, desde que:

- nunca usemos ícones, arte ou capturas do jogo;
- não tragamos outros termos do jogo (Caldeirão, Praga Faro, Foco, personagens, máquinas);
- revisemos este conjunto, e o próprio nome "Zero Dawn", antes da distribuição em marketplace (feature 8).
