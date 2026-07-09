const PAISES = [
  { value: 'argentina', label: '🇦🇷 Argentina' },
  { value: 'bolivia', label: '🇧🇴 Bolivia' },
  { value: 'brasil', label: '🇧🇷 Brasil' },
  { value: 'chile', label: '🇨🇱 Chile' },
  { value: 'colombia', label: '🇨🇴 Colombia' },
  { value: 'costa_rica', label: '🇨🇷 Costa Rica' },
  { value: 'cuba', label: '🇨🇺 Cuba' },
  { value: 'republica_dominicana', label: '🇩🇴 República Dominicana' },
  { value: 'ecuador', label: '🇪🇨 Ecuador' },
  { value: 'el_salvador', label: '🇸🇻 El Salvador' },
  { value: 'guatemala', label: '🇬🇹 Guatemala' },
  { value: 'honduras', label: '🇭🇳 Honduras' },
  { value: 'mexico', label: '🇲🇽 México' },
  { value: 'nicaragua', label: '🇳🇮 Nicaragua' },
  { value: 'panama', label: '🇵🇦 Panamá' },
  { value: 'paraguay', label: '🇵🇾 Paraguay' },
  { value: 'peru', label: '🇵🇪 Perú' },
  { value: 'puerto_rico', label: '🇵🇷 Puerto Rico' },
  { value: 'spain', label: '🇪🇸 España' },
  { value: 'uruguay', label: '🇺🇾 Uruguay' },
  { value: 'venezuela', label: '🇻🇪 Venezuela' },
  { value: 'usa', label: '🇺🇸 Estados Unidos' },
  { value: 'canada', label: '🇨🇦 Canadá' },
  { value: 'italy', label: '🇮🇹 Italia' },
  { value: 'france', label: '🇫🇷 Francia' },
];

function getPaisLabel(value) {
  const p = PAISES.find(p => p.value === value);
  return p ? p.label : value || 'No especificada';
}

function getPaisNombre(value) {
  const p = PAISES.find(p => p.value === value);
  return p ? p.label.replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, '').trim() : value || 'No especificada';
}

module.exports = { PAISES, getPaisLabel, getPaisNombre };