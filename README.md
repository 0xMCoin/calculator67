# Calculadora de contas da empresa

Calcula o DAS do Simples Nacional, a contabilidade e os demais boletos do mês e mostra
quanto cada um dos dois sócios precisa pagar.

## O que ela faz

- **Rateio entre os sócios** — você digita quanto cada sócio faturou no mês e ela divide
  o DAS proporcionalmente. Cada conta pode ter a sua própria regra: proporcional,
  meio a meio, ou só de um dos sócios.
- **DAS do Simples Nacional** — Anexos I a V, alíquota efetiva pela fórmula oficial
  `((RBT12 × alíquota nominal) − parcela a deduzir) ÷ RBT12`, com Fator R decidindo
  automaticamente entre os Anexos III e V.
- **Detalhamento** — mostra a faixa, a parcela a deduzir, a conta feita e para onde vai
  o dinheiro do DAS (IRPJ, CSLL, COFINS, PIS, CPP, ICMS/ISS).
- **Upload dos boletos em PDF** — arraste os PDFs (DAS, DARF, GPS, FGTS, boleto da
  contabilidade) e ela lê o tipo, o valor, o vencimento e a linha digitável. A leitura
  acontece **dentro do seu navegador**: nenhum arquivo é enviado para servidor nenhum.
  Se o PDF for uma imagem digitalizada, dá para colar a linha digitável na mão.
- **Confere o DAS** — quando você sobe o boleto do DAS, ela compara com o valor calculado
  e avisa a diferença.
- **Agenda de vencimentos** e **"copiar resumo"** para mandar no WhatsApp do sócio.
- Tudo fica salvo no `localStorage` do navegador.

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:3000
```

Outros comandos:

```bash
npm run build    # build de produção
npm run lint
npm test         # confere os cálculos e a leitura de código de barras / PDF
```

## Deploy na Vercel

O projeto é um Next.js padrão, sem banco de dados e sem variáveis de ambiente — é só
apontar a Vercel para o repositório e dar deploy. Pela CLI:

```bash
npm i -g vercel
vercel            # preview
vercel --prod     # produção
```

O `prebuild` copia o worker do `pdf.js` para `public/`, então isso funciona igual na
Vercel e na sua máquina.

## Como está organizado

| Arquivo | O que faz |
| --- | --- |
| `src/lib/simples.ts` | Tabelas dos Anexos I a V, Fator R, alíquota efetiva e repartição dos tributos |
| `src/lib/boleto.ts` | Linha digitável (FEBRABAN 47 dígitos) e guias de arrecadação (48 dígitos), com validação de DV |
| `src/lib/pdf.ts` | Extração do texto do PDF no navegador com `pdf.js` |
| `src/lib/calculo.ts` | Junta tudo e faz o rateio entre os sócios |
| `src/app/page.tsx` | A tela |

## Atenção

É uma ferramenta de apoio para organizar a divisão entre os sócios. O valor oficial é
sempre o do DAS gerado no PGDAS-D. As tabelas são as vigentes desde 2018 (LC 123/2006);
se a legislação mudar, atualize `src/lib/simples.ts`. O teto do INSS é editável na tela,
porque muda todo ano.
