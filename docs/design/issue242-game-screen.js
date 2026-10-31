/** Visual prototype only. It never loads or changes a saved run. */
const shell = document.querySelector('.game-shell');
const params = new URLSearchParams(location.search);
const validScenes = new Set(['combat', 'multi', 'turn-end', 'impact', 'reward', 'route', 'detail', 'relic', 'last-hit', 'defeat']);
const initialScene = params.get('scene');
shell.dataset.scene = validScenes.has(initialScene) ? initialScene : 'combat';
shell.dataset.effects = params.get('quiet') === '1' ? 'quiet' : 'standard';
shell.dataset.background = ['existing', 'paint', 'atrium'].includes(params.get('bg')) ? params.get('bg') : 'atrium';

const cardArt = {
  sweep: 'card-sweep-candidate-v1.png', jot: 'card-jot-candidate-v1.png', strike: 'card-strike-candidate-v1.png',
  verse: 'card-verse-candidate-v1.png', draw: 'card-draw-candidate-v1.png', outline: 'card-outline-candidate-v1.png',
  counter: 'card-counter-candidate-v1.png', delay: 'card-delay-candidate-v1.png',
};
const proposedRarity = { sweep: 'common', jot: 'common', strike: 'common', verse: 'uncommon', draw: 'common', outline: 'uncommon', counter: 'common', delay: 'rare' };
const rarityNames = { common: 'コモン', uncommon: 'アンコモン', rare: 'レア' };
for (const card of document.querySelectorAll('.game-card')) {
  const word = card.dataset.word ?? card.querySelector('.card-word')?.textContent?.trim();
  const file = word === 'jot' && params.get('art') === '246' ? 'card-lit-jot-issue246-candidate-v1.png' : cardArt[word];
  if (!file) continue;
  card.dataset.word = word;
  card.dataset.artId = `literature-${word}`;
  card.dataset.artVersion = word === 'jot' && params.get('art') === '246' ? 'issue246-candidate-v1' : 'candidate-v1';
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
  const hp = document.querySelector('.hero-hud .health-numbers b');
  if (hp) hp.textContent = ['last-hit', 'defeat'].includes(scene) ? '0' : scene === 'turn-end' ? '26' : '38';
  const time = document.querySelector('.time-readout b');
  if (time) time.textContent = scene === 'turn-end' ? '0.0' : '7.6';
  const hit = document.querySelector('.action-arc b');
  if (hit) hit.textContent = ['turn-end', 'last-hit'].includes(scene) ? '−12' : '−6';
  history.replaceState(null, '', `${location.pathname}?scene=${scene}${shell.dataset.effects === 'quiet' ? '&quiet=1' : ''}${shell.dataset.background !== 'existing' ? `&bg=${shell.dataset.background}` : ''}${params.get('review') === '1' ? '&review=1' : ''}${params.get('art') === '246' ? '&art=246' : ''}`);
}
setScene(shell.dataset.scene);

document.querySelector('.run-map-button')?.addEventListener('click', () => setScene('route'));
document.querySelector('.map-close')?.addEventListener('click', () => setScene('combat'));
document.querySelectorAll('.map-node.available').forEach((node) => node.addEventListener('click', () => setScene('combat')));
document.querySelectorAll('.cards .game-card').forEach((card) => card.addEventListener('click', () => setScene('detail')));
document.querySelector('.detail-close')?.addEventListener('click', () => setScene('combat'));
document.querySelectorAll('.reward-card').forEach((card) => card.addEventListener('click', () => setScene(card.dataset.word === 'outline' ? 'relic' : 'route')));
document.querySelector('.skip-reward')?.addEventListener('click', () => setScene('route'));
document.querySelector('.relic-continue')?.addEventListener('click', () => setScene('route'));
document.querySelector('.defeat-retry')?.addEventListener('click', () => setScene('combat'));
document.querySelector('.defeat-exit')?.addEventListener('click', () => setScene('route'));

let buffer = '';
let transitionTimer;
function renderTyping() {
  document.querySelector('.typed-prefix').textContent = buffer;
  for (const card of document.querySelectorAll('.cards .game-card')) {
    const word = card.dataset.word;
    const label = card.querySelector('.card-word');
    label.replaceChildren();
    if (buffer && word.startsWith(buffer)) {
      const typed = document.createElement('span'); typed.className = 'typed'; typed.textContent = buffer;
      label.append(typed, document.createTextNode(word.slice(buffer.length)));
      card.classList.add('candidate');
    } else { label.textContent = word; card.classList.remove('candidate'); }
  }
}
const initialTyped = params.get('typed')?.toLowerCase() ?? '';
if (['combat', 'multi'].includes(shell.dataset.scene) && [...document.querySelectorAll('.cards .game-card')].some((card) => card.dataset.word.startsWith(initialTyped))) {
  buffer = initialTyped;
  renderTyping();
}
if (params.get('review') === '1') {
  const menu = document.createElement('details');
  menu.className = 'review-nav';
  const summary = document.createElement('summary'); summary.textContent = 'デザイン検証用'; menu.append(summary);
  const scenes = [['combat','戦闘'],['partial','入力途中'],['multi','5敵'],['impact','発動'],['turn-end','時間切れ→敵行動'],['reward','報酬'],['route','経路'],['detail','カード詳細'],['relic','レリック'],['last-hit','最後の被弾'],['defeat','敗北']];
  for (const [scene, label] of scenes) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.addEventListener('click', () => { buffer = scene === 'partial' ? 'st' : ''; renderTyping(); setScene(scene === 'partial' ? 'combat' : scene); menu.open = false; });
    menu.append(button);
  }
  const quietButton = document.createElement('button'); quietButton.type = 'button'; quietButton.textContent = '低刺激 ON/OFF'; quietButton.addEventListener('click', () => { shell.dataset.effects = shell.dataset.effects === 'quiet' ? 'standard' : 'quiet'; setScene(shell.dataset.scene); }); menu.append(quietButton);
  shell.append(menu);
}
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { buffer = ''; renderTyping(); if (shell.dataset.scene !== 'combat') setScene('combat'); }
  if (!['combat', 'multi'].includes(shell.dataset.scene) || !/^[a-z]$/i.test(event.key) || event.metaKey || event.ctrlKey || event.altKey) return;
  const next = `${buffer}${event.key.toLowerCase()}`;
  const words = [...document.querySelectorAll('.cards .game-card')].map((card) => card.dataset.word);
  if (!words.some((word) => word.startsWith(next))) return;
  buffer = next;
  renderTyping();
  if (words.includes(buffer)) {
    clearTimeout(transitionTimer);
    setScene('impact');
    transitionTimer = setTimeout(() => { buffer = ''; document.querySelector('.typed-prefix').textContent = ''; setScene('reward'); }, shell.dataset.effects === 'quiet' ? 650 : 900);
  }
});
