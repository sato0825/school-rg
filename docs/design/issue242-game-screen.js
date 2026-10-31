/** Visual prototype only. It never loads or changes a saved run. */
const shell = document.querySelector('.game-shell');
const params = new URLSearchParams(location.search);
const validScenes = new Set(['combat', 'allies', 'multi', 'turn-end', 'impact', 'reward', 'route', 'detail', 'relic', 'last-hit', 'defeat']);
const initialScene = params.get('scene');
shell.dataset.scene = validScenes.has(initialScene) ? initialScene : 'combat';
shell.dataset.effects = params.get('quiet') === '1' ? 'quiet' : 'standard';
shell.dataset.background = ['existing', 'paint', 'atrium'].includes(params.get('bg')) ? params.get('bg') : 'atrium';

const legacyCardArt = {
  sweep: 'card-sweep-candidate-v1.png', jot: 'card-jot-candidate-v1.png', strike: 'card-strike-candidate-v1.png',
  verse: 'card-verse-candidate-v1.png', draw: 'card-draw-candidate-v1.png', outline: 'card-outline-candidate-v1.png',
  counter: 'card-counter-candidate-v1.png', delay: 'card-delay-candidate-v1.png',
};
const cardArt = {
  ...legacyCardArt,
  sweep: 'card-sweep-issue246-style-candidate-v2.png', jot: 'card-lit-jot-issue246-candidate-v1.png',
  strike: 'card-strike-issue246-style-candidate-v2.png', verse: 'card-verse-issue246-style-candidate-v2.png',
  draw: 'card-draw-issue246-style-candidate-v2.png',
};
const proposedRarity = { sweep: 'common', jot: 'common', strike: 'common', verse: 'uncommon', draw: 'common', outline: 'uncommon', counter: 'common', delay: 'rare' };
const rarityNames = { common: 'コモン', uncommon: 'アンコモン', rare: 'レア' };
let enemyHp = shell.dataset.scene === 'impact' ? 18 : 24;
for (const card of document.querySelectorAll('.game-card')) {
  const word = card.dataset.word ?? card.querySelector('.card-word')?.textContent?.trim();
  const file = params.get('art') === 'legacy' ? legacyCardArt[word] : cardArt[word];
  if (!file) continue;
  card.dataset.word = word;
  card.dataset.artId = `literature-${word}`;
  card.dataset.artVersion = params.get('art') === 'legacy' ? 'candidate-v1' : ['sweep','jot','strike','verse','draw'].includes(word) ? 'issue246-style-candidate-v2' : 'candidate-v1';
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
  shell.classList.remove('paused');
  const pauseButton = document.querySelector('.pause-button');
  pauseButton?.setAttribute('aria-pressed', 'false');
  const pauseLayer = document.querySelector('.pause-layer');
  pauseLayer.inert = true;
  pauseLayer.setAttribute('aria-hidden', 'true');
  const hp = document.querySelector('.hero-hud .health-numbers b');
  if (hp) hp.textContent = ['last-hit', 'defeat'].includes(scene) ? '0' : scene === 'turn-end' ? '32' : '38';
  const block = document.querySelector('.hero-hud .block b');
  if (block) block.textContent = ['turn-end', 'last-hit', 'defeat'].includes(scene) ? '0' : '6';
  const enemyHpNumber = document.querySelector('.enemy-hud-name strong');
  const enemyHpBar = document.querySelector('.enemy-hp-track i');
  if (enemyHpNumber) enemyHpNumber.textContent = String(enemyHp);
  if (enemyHpBar) enemyHpBar.style.width = `${enemyHp / 24 * 100}%`;
  const time = document.querySelector('.time-readout b');
  if (time) time.textContent = scene === 'turn-end' ? '0.0' : '7.6';
  const hit = document.querySelector('.action-arc b');
  if (hit) hit.textContent = ['turn-end', 'last-hit'].includes(scene) ? '−12' : '−6';
  const activeLayer = { reward: '.reward-layer', route: '.route-layer', detail: '.detail-layer', relic: '.relic-layer', defeat: '.defeat-layer' }[scene];
  for (const selector of ['.reward-layer', '.route-layer', '.detail-layer', '.relic-layer', '.defeat-layer']) {
    const layer = document.querySelector(selector);
    layer.inert = selector !== activeLayer;
    layer.setAttribute('aria-hidden', String(selector !== activeLayer));
  }
  const rail = document.querySelector('.combat-rail');
  rail.inert = !['combat', 'allies', 'multi'].includes(scene);
  rail.setAttribute('aria-hidden', String(rail.inert));
  const group = document.querySelector('.enemy-group');
  group.inert = scene !== 'multi';
  group.setAttribute('aria-hidden', String(group.inert));
  const soloEnemy = document.querySelector('.enemy-anchor');
  soloEnemy.inert = ['multi','reward','route','relic','defeat'].includes(scene);
  soloEnemy.setAttribute('aria-hidden', String(soloEnemy.inert));
  const allyGroup = document.querySelector('.ally-group');
  allyGroup.inert = scene !== 'allies';
  allyGroup.setAttribute('aria-hidden', String(allyGroup.inert));
  const heroAnchor = document.querySelector('.hero-anchor');
  heroAnchor.inert = scene === 'allies';
  heroAnchor.setAttribute('aria-hidden', String(heroAnchor.inert));
  history.replaceState(null, '', `${location.pathname}?scene=${scene}${shell.dataset.effects === 'quiet' ? '&quiet=1' : ''}${shell.dataset.background !== 'existing' ? `&bg=${shell.dataset.background}` : ''}${params.get('review') === '1' ? '&review=1' : ''}${params.get('art') === 'legacy' ? '&art=legacy' : ''}`);
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
document.querySelector('.pause-button')?.addEventListener('click', () => {
  shell.classList.toggle('paused');
  const paused = shell.classList.contains('paused');
  document.querySelector('.pause-button').setAttribute('aria-pressed', String(paused));
  document.querySelector('.pause-layer').inert = !paused;
  document.querySelector('.pause-layer').setAttribute('aria-hidden', String(!paused));
  document.querySelector('.combat-rail').inert = paused || !['combat','allies','multi'].includes(shell.dataset.scene);
});
document.querySelector('.pause-resume')?.addEventListener('click', () => {
  shell.classList.remove('paused');
  document.querySelector('.pause-button')?.setAttribute('aria-pressed', 'false');
  document.querySelector('.pause-layer').inert = true;
  document.querySelector('.pause-layer').setAttribute('aria-hidden', 'true');
  document.querySelector('.combat-rail').inert = !['combat','allies','multi'].includes(shell.dataset.scene);
});
const focusPanel = document.querySelector('.group-focus');
function focusEnemy(index) {
  const enemy = [...document.querySelectorAll('.group-enemy')][index];
  if (!enemy || !focusPanel) return;
  focusPanel.querySelector('h3').textContent = enemy.querySelector('img').alt;
  focusPanel.querySelector('.group-focus-hp').textContent = `HP ${enemy.querySelector('.group-plate strong').textContent}`;
  focusPanel.querySelector('.group-focus-action').textContent = enemy.querySelector('.group-intent').getAttribute('aria-label');
  focusPanel.classList.add('active');
}
document.querySelectorAll('.group-enemy').forEach((enemy, index) => {
  enemy.tabIndex = 0; enemy.setAttribute('role', 'button'); enemy.setAttribute('aria-label', `${enemy.querySelector('img').alt}の詳細を開く`);
  enemy.addEventListener('click', () => focusEnemy(index));
  enemy.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); focusEnemy(index); } });
});
document.querySelector('.group-focus-close')?.addEventListener('click', () => focusPanel.classList.remove('active'));
if (shell.dataset.scene === 'multi' && /^[1-5]$/.test(params.get('focus') ?? '')) focusEnemy(Number(params.get('focus')) - 1);

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
if (['combat', 'allies', 'multi'].includes(shell.dataset.scene) && [...document.querySelectorAll('.cards .game-card')].some((card) => card.dataset.word.startsWith(initialTyped))) {
  buffer = initialTyped;
  renderTyping();
}
if (params.get('review') === '1') {
  const menu = document.createElement('details');
  menu.className = 'review-nav';
  const summary = document.createElement('summary'); summary.textContent = 'デザイン検証用'; menu.append(summary);
  const scenes = [['combat','戦闘'],['partial','入力途中'],['allies','味方3人'],['multi','5敵'],['impact','発動'],['turn-end','時間切れ→敵行動'],['reward','報酬'],['route','経路'],['detail','カード詳細'],['relic','レリック'],['last-hit','最後の被弾'],['defeat','敗北']];
  for (const [scene, label] of scenes) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.addEventListener('click', () => { buffer = scene === 'partial' ? 'st' : ''; renderTyping(); setScene(scene === 'partial' ? 'combat' : scene); menu.open = false; });
    menu.append(button);
  }
  const quietButton = document.createElement('button'); quietButton.type = 'button'; quietButton.textContent = '低刺激 ON/OFF'; quietButton.addEventListener('click', () => { shell.dataset.effects = shell.dataset.effects === 'quiet' ? 'standard' : 'quiet'; setScene(shell.dataset.scene); }); menu.append(quietButton);
  shell.append(menu);
}
window.addEventListener('keydown', (event) => {
  if (shell.classList.contains('paused')) { if (event.key === 'Escape') document.querySelector('.pause-resume')?.click(); return; }
  if (event.key === 'Escape') { buffer = ''; renderTyping(); if (shell.dataset.scene !== 'combat') setScene('combat'); }
  if (!['combat', 'allies', 'multi'].includes(shell.dataset.scene) || event.isComposing || !/^[a-z]$/i.test(event.key) || event.metaKey || event.ctrlKey || event.altKey) return;
  const next = `${buffer}${event.key.toLowerCase()}`;
  const words = [...document.querySelectorAll('.cards .game-card')].map((card) => card.dataset.word);
  if (!words.some((word) => word.startsWith(next))) return;
  buffer = next;
  renderTyping();
  if (words.includes(buffer)) {
    clearTimeout(transitionTimer);
    const usedCard = [...document.querySelectorAll('.cards .game-card')].find((card) => card.dataset.word === buffer);
    if (usedCard?.classList.contains('attack')) enemyHp = Math.max(0, enemyHp - Number(usedCard.querySelector('.card-effect b')?.textContent ?? 0));
    setScene('impact');
    transitionTimer = setTimeout(() => { buffer = ''; renderTyping(); setScene(enemyHp === 0 ? 'reward' : 'combat'); }, shell.dataset.effects === 'quiet' ? 650 : 900);
  }
});
