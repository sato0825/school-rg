/* global document, URLSearchParams, location, history, requestAnimationFrame */
/** Review-only composition: no run state, turn rule, targeting, or save mutation. */
const params = new URLSearchParams(location.search);
await import('./issue242-game-screen.js');
const shell = document.querySelector('.game-shell');
const allies = params.get('allies') === '3' ? 3 : 1;
const enemies = params.get('enemies') === '5' ? 5 : 1;
const pose = ['idle', 'activate', 'hit'].includes(params.get('pose')) ? params.get('pose') : 'idle';
const quiet = params.get('quiet') === '1';
const typed = pose === 'idle' ? (params.get('typed') ?? 'st').toLowerCase() : '';
const lead = ['literature', 'science', 'kendo'].includes(params.get('lead')) ? params.get('lead') : 'literature';

shell.dataset.study = '347';
shell.dataset.allies = String(allies);
shell.dataset.enemies = String(enemies);
shell.dataset.pose = pose;
shell.dataset.scene = enemies === 5 ? 'multi' : allies === 3 ? 'allies' : 'combat';
shell.dataset.effects = quiet ? 'quiet' : 'standard';
history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
for (const [selector, active] of [
  ['.hero-anchor', allies === 1], ['.ally-group', allies === 3],
  ['.enemy-anchor', enemies === 1], ['.enemy-group', enemies === 5],
]) {
  const node = shell.querySelector(selector);
  node.inert = !active;
  node.setAttribute('aria-hidden', String(!active));
}

const characterPoses = {
  literature: { idle: 'literature-idle-candidate-v1.png', activate: 'literature-activate-candidate-v2.png', hit: 'literature-hit-candidate-v2.png', label: '吉野こはる · 文芸部' },
  science: { idle: 'serious-student-idle-candidate-v2.png', activate: 'serious-student-activate-candidate-v2.png', hit: 'serious-student-hit-candidate-v2.png', label: '科学部の候補生徒' },
  kendo: { idle: 'kendo-idle-candidate-v1.png', activate: 'kendo-activate-candidate-v2.png', hit: 'kendo-hit-candidate-v2.png', label: '剣道部の候補生徒' },
};
// Anchors use each visible actor's own unchanging slot. Pose assets exchange inside it.
for (const [index, actor] of [...shell.querySelectorAll('.ally-group .ally')].entries()) {
  actor.dataset.actorId = ['literature', 'science', 'kendo'][index];
  actor.style.setProperty('--ground-x', '50%');
  actor.style.setProperty('--cast-x', ['77%', '72%', '69%'][index]);
  actor.style.setProperty('--cast-y', ['48%', '49%', '47%'][index]);
  actor.style.setProperty('--hit-x', '18%');
  actor.style.setProperty('--hit-y', '55%');
}
const soloActor = shell.querySelector('.hero-anchor');
soloActor.dataset.actorId = lead;
soloActor.style.setProperty('--ground-x', '50%');
soloActor.style.setProperty('--cast-x', '74%');
soloActor.style.setProperty('--cast-y', '45%');
soloActor.style.setProperty('--hit-x', '18%');
soloActor.style.setProperty('--hit-y', '55%');
if (allies === 1) {
  const hero = shell.querySelector('.hero-image');
  hero.src = `../../docs/art/candidates/${characterPoses[lead][pose]}`;
  hero.alt = characterPoses[lead].label;
  shell.querySelector('.hero-badge strong').textContent = lead === 'literature' ? '吉野こはる' : `${lead === 'science' ? '科学部' : '剣道部'}候補`;
}
if (pose !== 'idle') {
  const activeAlly = shell.querySelector('.ally:first-child img');
  activeAlly.src = `../../docs/art/candidates/${characterPoses.literature[pose]}`;
  if (pose === 'hit') {
    shell.querySelector('.hero-hud .health-numbers b').textContent = '32';
    shell.querySelector('.hero-hud .health-track i').style.width = '80%';
  }
}

if (pose === 'activate') {
  shell.querySelector('.action-arc b').textContent = '−6';
  if (enemies === 1) {
    shell.querySelector('.enemy-hud-name strong').textContent = '18';
    shell.querySelector('.enemy-hp-track i').style.width = '75%';
  } else {
    const first = shell.querySelector('.group-enemy:first-child');
    first.querySelector('.group-plate strong').textContent = '19/25';
    first.querySelector('.group-hp').style.width = '76%';
    const result = document.createElement('span');
    result.className = 'formation-target-cue';
    result.textContent = '−6';
    result.setAttribute('aria-hidden', 'true');
    first.append(result);
  }
}
if (pose !== 'idle') {
  const actor = allies === 3 ? shell.querySelector('.ally:first-child') : soloActor;
  const cue = document.createElement('div');
  cue.className = 'formation-actor-cue';
  cue.textContent = pose === 'hit' ? '−6' : '✦';
  cue.setAttribute('aria-hidden', 'true');
  actor.append(cue);
}

if (typed && [...shell.querySelectorAll('.cards .game-card')].some((card) => card.dataset.word?.startsWith(typed))) {
  shell.querySelector('.typed-prefix').textContent = typed;
  for (const card of shell.querySelectorAll('.cards .game-card')) {
    if (!card.dataset.word?.startsWith(typed)) continue;
    const word = card.querySelector('.card-word');
    const prefix = document.createElement('span');
    prefix.className = 'typed';
    prefix.textContent = typed;
    word.replaceChildren(prefix, document.createTextNode(card.dataset.word.slice(typed.length)));
    card.classList.add('candidate');
  }
}

const note = shell.querySelector('.concept-note');
note.textContent = `#347 配置候補 · ${allies}味方 × ${enemies}敵 · ${pose}${quiet ? ' · 低刺激' : ''}`;

// Captures wait for actual image decoding and two paint frames, not just element creation.
await Promise.all([...shell.querySelectorAll('img')].filter((image) => !image.closest('[aria-hidden="true"]')).map((image) => image.decode().catch(() => {})));
await document.fonts.ready;
await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
shell.dataset.assetsReady = 'true';
