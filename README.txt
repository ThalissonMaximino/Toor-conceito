TOOR Conceito — Landing page responsiva

Estrutura:
- index.html: conteúdo e imagens responsivas
- styles.css: layout, tipografia e breakpoints
- script.js: comportamento mínimo do menu mobile
- assets/media/: fotos locais em AVIF e WebP
- assets/fonts/: DM Sans e Italiana em WOFF2, com licença OFL
- vercel.json: configuração e headers para publicação

Como visualizar:
1. Abra index.html diretamente ou sirva a pasta com um servidor estático.
2. A página funciona sem depender de imagens ou fontes externas.

Como publicar na Vercel:
1. Importe esta pasta/repositório como projeto.
2. Use o preset “Other”.
3. Não é necessário comando de build; o diretório de saída é a raiz do projeto.

Validação:
- Execute: node scripts/quality-check.mjs
- Cobertura: 320, 360, 375, 430, 568 paisagem, 768, 915 paisagem,
  1024, 1440, 1903 e 2560 px.
- O teste verifica enquadramento do rosto, overflow horizontal, imagens,
  navegação, IDs, dependências remotas e orçamento de mídia.

Notas de implementação:
- O scroll é nativo; não há biblioteca pesada de animação ou smooth scroll.
- O navegador escolhe automaticamente a menor imagem AVIF/WebP adequada.
- As prévias PNG são apenas documentação visual e não são publicadas pela Vercel.

Créditos fotográficos (Pexels):
- Daroon jasm — photo 29169376
- Allan González — photo 30730750
- Dasha — photo 19272278
- Sherman Trotz — photo 26727026
- Ông Ngọc Dư — photo 20381260
- pedro furtado — photo 30471947
- Thuanny Gantuss — photo 8764769
- RAJESH KUMAR VERMA — photo 9690414
- Ron Lach — photo 8387833
- Alireza Heidarpour — photo 29945084
- Jimmy Elizarraras — photo 30779071
