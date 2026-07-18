'use strict';

const INSULTS = [
  'puta', 'putas', 'puto', 'putos', 'gilipollas', 'imbecil', 'imbécil',
  'idiota', 'subnormal', 'retrasado', 'retrasada', 'mongolo', 'mongola',
  'cabron', 'cabrón', 'cabrona', 'malparido', 'malparida', 'hijueputa',
  'hijoputa', 'hijadeputa', 'zorra', 'zorras', 'perra', 'joputa',
];

const SEXUAL = [
  'porno', 'pornografia', 'pornografía', 'pornographic', 'xxx',
  'onlyfans', 'nsfw', 'nude', 'nudes', 'desnudo', 'desnuda', 'desnudos',
  'sexo explicito', 'sexo explícito', 'follar', 'follando', 'coger',
  'masturbacion', 'masturbación', 'masturbarse', 'polla', 'pene',
  'vagina', 'tetas', 'orgia', 'orgía', 'incesto', 'violacion', 'violación',
];

const SLURS = [
  'maricon', 'maricón', 'marica', 'sudaca', 'negrata', 'panchito',
  'travolo', 'machupichu', 'sidoso', 'nazi', 'hitler', 'n4zi',
  'hittler', 'naz1', 'antisemita', 'antisemitic', 'judio', 'judía',
  'puto amo',
];

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function checkBlacklist(rawText) {
  const text = normalize(rawText);
  if (!text) return { found: false, word: null, category: null };

  const categories = [
    { list: SLURS,   name: 'slur' },
    { list: SEXUAL,  name: 'sexual' },
    { list: INSULTS, name: 'insulto' },
  ];

  for (const { list, name } of categories) {
    for (const word of list) {
      const normWord = normalize(word);
      const pattern = new RegExp(`\\b${normWord.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (pattern.test(text)) {
        return { found: true, word, category: name };
      }
    }
  }
  return { found: false, word: null, category: null };
}

module.exports = { checkBlacklist, normalize, INSULTS, SEXUAL, SLURS };