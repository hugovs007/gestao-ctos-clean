const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
    { from: /EndereÃ§o/g, to: 'Endereço' },
    { from: /Endereo/g, to: 'Endereço' },
    { from: /LocalizaÃ§Ã£o/g, to: 'Localização' },
    { from: /Localizaǜo/g, to: 'Localização' },
    { from: /prÃ³ximas/g, to: 'próximas' },
    { from: /prximas/g, to: 'próximas' },
    { from: /disponÃ­veis/g, to: 'disponíveis' },
    { from: /disponveis/g, to: 'disponíveis' },
    { from: /PrÃ³xima/g, to: 'Próxima' },
    { from: /Prxima/g, to: 'Próxima' },
    { from: /indisponÃ­vel/g, to: 'indisponível' },
    { from: /indisponvel/g, to: 'indisponível' },
    { from: /estÃ¡/g, to: 'está' },
    { from: /estǭ/g, to: 'está' },
    { from: /nÃ£o/g, to: 'não' },
    { from: /nǜo/g, to: 'não' },
    { from: /instalaÃ§Ã£o/g, to: 'instalação' },
    { from: /instalaǜo/g, to: 'instalação' }
];

for (const rep of replacements) {
    content = content.replace(rep.from, rep.to);
}

fs.writeFileSync('src/App.tsx', content, 'utf8');
console.log('Fim da correção de caracteres.');
