# 01. Princípios

## A ideia central

Engenharia agêntica é dirigir agentes por um fluxo estruturado (escopo → arquitetura → construção → prova → entrega) em vez de mandar prompts soltos. **Você decide; o agente executa contra decisões escritas.**

Todo problema de código com IA vem de uma de duas causas:

1. **Faltou contexto ao agente**: ele não conhecia o seu cliente de API, a sua convenção, a decisão da semana passada, e entregou a "média" do código público.
2. **O agente tomou uma decisão que era sua**: tudo que não foi especificado vira um default provável, escondido num diff grande demais para revisar.

Nenhuma das duas se resolve com prompt melhor. Resolve-se com **contexto engenheirado** e **decisões escritas antes do código**.

## Regras que não mudam

1. **O estado vive em arquivos no repositório, não no chat.** Scope, specs, AGENTS.md, reviews. Um chat pode morrer; o conhecimento fica.
2. **Decisão carregadora de peso é escrita (spec).** Em qualquer tier. Se não está escrito, não foi decidido.
3. **Construído não é pronto.** Pronto exige a prova que o tier pede (verify, testes) e a sua palavra.
4. **Propriedade fixa dos arquivos.** Só o `/architect` escreve o conteúdo de uma spec; só o `/develop` move o status; nenhuma skill reescreve o arquivo de outra.
5. **O agente recomenda, você decide.** Toda pergunta vem com opções reais e uma recomendada, com motivo. Nunca um menu neutro, nunca uma decisão silenciosa.
6. **Um segundo par de olhos de outro modelo.** Um modelo revisando o próprio trabalho concorda consigo mesmo. Críticas e reviews rodam em outro provedor (ver [06](06-modelos.md)).
7. **Pague agora, não em seis meses.** Mais tokens no início (decisões explícitas, autoverificação) custam menos que meses de arqueologia depois.
8. **Agnóstico de ferramenta.** Hoje o harness é o T3 Code. O valor está na sequência e nos arquivos, não na ferramenta; trocar de harness não pode quebrar o método.

## O diagnóstico de bolso

Quando algo der errado, pergunte primeiro: **faltou contexto, ou o agente decidiu algo que era meu?** A resposta diz se a correção vai no `AGENTS.md`/contexto ou numa spec.

## O agent loop

Todo agente roda **Read → Decide → Act → Observe** até terminar. Uma tarefa pequena roda o loop ~8 vezes; uma feature, ~80. Erros se acumulam: uma leitura incompleta vira decisão errada, que o observe confirma. O seu trabalho é controlar o que ele lê, deixar a decisão clara e checar o que ele observa, para pegar o desvio no loop 3 e não no 30.

## Sobre o nome

*Project Zero Dawn* é uma referência a Horizon Zero Dawn, em que uma IA (GAIA) organiza e mantém um mundo de máquinas por meio de subfunções especializadas. A sessão principal se apresenta como GAIA, e cada skill roda como uma subfunção. É só uma camada de nomes: veja [10. GAIA e as subfunções](10-gaia.md).
