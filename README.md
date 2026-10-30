# CDR Analyzer

Ferramenta de linha de comando que importa os registros de chamadas (CDR) exportados por centrais PABX, classifica cada ligação, calcula o custo pela regra de tarifação das operadoras e gera relatórios de uso por ramal, por tipo e por horário.

Responde perguntas que todo gestor de telefonia corporativa faz: qual ramal mais gasta, quanto se gasta com celular, em que horário o tronco fica mais ocupado e quais foram as ligações mais longas do mês.

## Exemplo

```bash
npm run cdr -- importar exemplos/outubro-2026.csv
npm run cdr -- relatorio resumo
```

```
Tipo           Chamadas   Duração      Custo
-------------  --------  --------  ---------
local_movel         115  06:14:45  R$ 103,96
ddd_movel            25  02:05:47   R$ 82,76
local_fixo           80  05:13:12   R$ 31,70
ddd_fixo             33  02:01:41   R$ 30,81
internacional         3  00:06:13   R$ 15,75
interna              37  02:45:07    R$ 0,00
gratuita              7  00:28:51    R$ 0,00

Total: 300 chamadas, 18:55:36, R$ 264,98
```

Outros relatórios:

```bash
npm run cdr -- relatorio ramais --de 2026-10-01 --ate 2026-10-15
npm run cdr -- relatorio horarios          # distribuição por hora com gráfico em texto
npm run cdr -- relatorio longas --limite 5
npm run cdr -- relatorio ramais --formato csv > ramais.csv   # abre no Excel
```

Requer Node.js 22.13 ou superior. Sem dependências.

## Formato de entrada

CSV separado por `;` ou `,`, com cabeçalho. Os nomes de coluna variam entre fabricantes, então o importador aceita alternativas:

| Campo   | Colunas aceitas                          | Formatos                                  |
| ------- | ---------------------------------------- | ----------------------------------------- |
| Início  | `inicio`, `data_hora`, `datahora`, `start` | `dd/mm/aaaa hh:mm:ss` ou ISO            |
| Ramal   | `ramal`, `origem`, `extension`           |                                           |
| Número  | `numero`, `destino`, `number`            | qualquer pontuação é removida             |
| Duração | `duracao`, `duration`, `tempo`           | segundos ou `hh:mm:ss`                    |
| Sentido | `sentido`, `direcao`, `direction`        | `S`/`E`/`I`, `saida`/`entrada`/`interna`  |

Linhas com problema não interrompem a importação: são listadas no final com o número da linha e o motivo. Reimportar o mesmo arquivo não duplica chamadas.

Para gerar dados de teste sem usar registros reais de clientes:

```bash
node scripts/gerar-amostra.js 5000 > amostra.csv
```

## Classificação e tarifação

O número discado é classificado pelo plano de numeração brasileiro (`src/numbers.js`): ramal interno, emergência, 0800, fixo ou móvel local, fixo ou móvel de longa distância (`0 + operadora + DDD + número`), internacional (`00`). O DDD local é configurável com `--ddd` (padrão 51).

O custo segue o modelo usado pelas operadoras (`src/billing.js`):

- até 3 segundos: não cobra;
- mínimo de 30 segundos;
- depois disso, frações de 6 segundos.

As tarifas por minuto de cada tipo ficam em `config/tarifas.json`. Os valores do repositório são ilustrativos: ajuste para o contrato real.

## Decisões

- **Custo em centavos inteiros.** Somar milhares de valores em ponto flutuante gera diferença de centavos no total. Gravar em centavos evita isso.
- **SQLite em vez de processar o CSV em memória.** Permite importar vários meses aos poucos e cruzar períodos com SQL simples.
- **Tolerância a erro por linha.** Export de PABX costuma ter linha quebrada ou campo vazio. Abortar o arquivo inteiro por causa de uma linha seria pior para quem usa.

## Testes

```bash
npm test
```

## Próximos passos

- Cadastro de ramais com nome do usuário e centro de custo.
- Relatório de ocupação simultânea por tronco, para dimensionar quantos canais contratar.
- Leitura direta do CDR via conexão TCP/serial com o PABX.

## Licença

MIT
