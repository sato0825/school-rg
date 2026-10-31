/** Visual prototype only. It never loads or changes a saved run. */
const shell = document.querySelector('.game-shell');
const params = new URLSearchParams(location.search);
const validScenes = new Set(['combat', 'impact', 'reward', 'route', 'detail', 'relic']);
const initialScene = params.get('scene');
shell.dataset.scene = validScenes.has(initialScene) ? initialScene : 'combat';
shell.dataset.effects = params.get('quiet') === '1' ? 'quiet' : 'standard';

const cardArt = {
  sweep: 'card-sweep-candidate-v1.png', jot: 'card-jot-candidate-v1.png', strike: 'card-strike-candidate-v1.png',
  verse: 'card-verse-candidate-v1.png', draw: 'card-draw-candidate-v1.png', outline: 'card-outline-candidate-v1.png',
  counter: 'card-counter-candidate-v1.png', delay: 'card-delay-candidate-v1.png',
};
const proposedRarity = { sweep: 'common', jot: 'common', strike: 'common', verse: 'uncommon', draw: 'common', outline: 'uncommon', counter: 'common', delay: 'rare' };
const rarityNames = { common: 'コモン', uncommon: 'アンコモン', rare: 'レア' };
for (const card of document.querySelectorAll('.game-card')) {
  const word = card.dataset.word ?? card.querySelector('.card-word')?.textContent?.trim();
  const file = cardArt[word];
  if (!file) continue;
  card.dataset.word = word;
  card.dataset.artId = `literature-${word}`;
  card.dataset.artVersion = 'candidate-v1';
  card.dataset.rarity = proposedRarity[word];
  card.setAttribute('aria-label', `${word}、${rarityNames[proposedRarity[word]]}。${card.querySelector('.card-effect')?.textContent?.trim() ?? ''}`);
  const art = document.createElement('span');
  art.className = 'card-art';
  const img = document.createElement('img');
  img.src = `./issue242-assets/${file}`;
  img.alt = '';
  art.append(img);
  card.querySelector('.card-top')?.after(art);
  const emblem = document.createElement('span');
  emblem.className = 'rarity-emblem';
  emblem.textContent = proposedRarity[word] === 'rare' ? '✶' : proposedRarity[word] === 'uncommon' ? '✧' : '•';
  emblem.setAttribute('aria-label', rarityNames[proposedRarity[word]]);
  card.append(emblem);
}

function setScene(scene) {
  if (!validScenes.has(scene)) return;
  shell.dataset.scene = scene;
  history.replaceState(null, '', `${location.pathname}?scene=${scene}${shell.dataset.effects === 'quiet' ? '&quiet=1' : ''}`);
}

document.querySelector('.run-map-button')?.addEventListener('click', () => setScene('route'));
document.querySelector('.map-close')?.addEventListener('click', () => setScene('combat'));
document.querySelectorAll('.map-node.available').forEach((node) => node.addEventListener('click', () => setScene('combat')));
document.querySelectorAll('.cards .game-card').forEach((card) => card.addEventListener('click', () => setScene('detail')));
document.querySelector('.detail-close')?.addEventListener('click', () => setScene('combat'));
document.querySelectorAll('.reward-card').forEach((card) => card.addEventListener('click', () => setScene(card.dataset.word === 'outline' ? 'relic' : 'route')));
document.querySelector('.skip-reward')?.addEventListener('click', () => setScene('route'));
document.querySelector('.relic-continue')?.addEventListener('click', () => setScene('route'));

let buffer = '';
let transitionTimer;
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { buffer = ''; if (shell.dataset.scene !== 'combat') setScene('combat'); }
  if (shell.dataset.scene !== 'combat' || !/^[a-z]$/i.test(event.key) || event.metaKey || event.ctrlKey || event.altKey) return;
  const next = `${buffer}${event.key.toLowerCase()}`;
  const words = [...document.querySelectorAll('.cards .game-card')].map((card) => card.dataset.word);
  if (!words.some((word) => word.startsWith(next))) return;
  buffer = next;
  document.querySelector('.typed-prefix').textContent = buffer;
  for (const card of document.querySelectorAll('.cards .game-card')) {
    const word = card.dataset.word;
    const label = card.querySelector('.card-word');
    label.replaceChildren();
    if (word.startsWith(buffer)) {
      const typed = document.createElement('span'); typed.className = 'typed'; typed.textContent = buffer;
      label.append(typed, document.createTextNode(word.slice(buffer.length)));
      card.classList.add('candidate');
    } else { label.textContent = word; card.classList.remove('candidate'); }
  }
  if (words.includes(buffer)) {
    clearTimeout(transitionTimer);
    setScene('impact');
    transitionTimer = setTimeout(() => { buffer = ''; document.querySelector('.typed-prefix').textContent = ''; setScene('reward'); }, shell.dataset.effects === 'quiet' ? 650 : 900);
  }
});
