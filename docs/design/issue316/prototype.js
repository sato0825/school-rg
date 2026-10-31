const config = await (await globalThis.fetch("./visual-config.json")).json();
if (config.status !== "visual-experiment-only") throw new Error("This prototype requires an experiment-only config");

const shapePaths = Object.freeze({
  ring: '<circle cx="8" cy="8" r="5.2"/>',
  diamond: '<path d="M8 2 14 8 8 14 2 8Z"/>',
  spark: '<path d="M8 1 10 6 15 8 10 10 8 15 6 10 1 8 6 6Z"/>',
});
const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function cardMarkup(card, reward = false) {
  const profile = config.profiles[card.visualProfile];
  if (!profile || !shapePaths[profile.shape]) throw new Error(`Unknown visual profile: ${card.visualProfile}`);
  return `<div class="card" data-slot="${escapeHtml(card.slot)}" data-profile="${escapeHtml(card.visualProfile)}" data-frame="${escapeHtml(profile.frame)}" aria-label="表示実験、${escapeHtml(card.word)}、${escapeHtml(profile.label)}、${escapeHtml(card.effect)}">
    <div class="card-head"><span class="kind ${card.kind === "攻撃" ? "attack" : ""}">${escapeHtml(card.kind)}</span><span class="tier" data-shape="${escapeHtml(profile.shape)}"><svg viewBox="0 0 16 16" aria-hidden="true">${shapePaths[profile.shape]}</svg><span class="tier-label">${escapeHtml(profile.label)}</span></span></div>
    <span class="card-art" aria-hidden="true"><img src="${escapeHtml(card.art)}" alt=""></span><strong class="word">${escapeHtml(card.word)}</strong><span class="effect">${escapeHtml(card.effect)}</span>${reward ? `<span class="club">${escapeHtml(card.club)}・${escapeHtml(card.kind)}</span>` : ""}
  </div>`;
}

const cards = config.fixtureOnly.hand;
globalThis.document.querySelector("#hand").innerHTML = cards.map((card) => cardMarkup(card)).join("");
const bySlot = new Map(cards.map((card) => [card.slot, card]));
globalThis.document.querySelector("#rewards").innerHTML = config.fixtureOnly.rewardSlots.map((slot) => {
  const card = bySlot.get(slot);
  if (!card) throw new Error(`Unknown reward fixture slot: ${slot}`);
  return cardMarkup(card, true);
}).join("");

function setScreen(screen) {
  globalThis.document.body.classList.toggle("screen-combat", screen === "combat");
  globalThis.document.body.classList.toggle("screen-reward", screen === "reward");
  for (const button of globalThis.document.querySelectorAll("[data-mode]")) button.setAttribute("aria-pressed", String(button.dataset.mode === screen));
}
function setFilter(filter) {
  globalThis.document.body.classList.toggle("filter-grayscale", filter === "grayscale");
  globalThis.document.body.classList.toggle("filter-low-stimulus", filter === "low-stimulus");
  for (const button of globalThis.document.querySelectorAll("[data-filter]")) button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
}
function setMask(mask) {
  globalThis.document.body.classList.toggle("mask-art-only", mask === "art-only");
  globalThis.document.body.classList.toggle("mask-text-only", mask === "text-only");
  for (const button of globalThis.document.querySelectorAll("[data-mask]")) button.setAttribute("aria-pressed", String(button.dataset.mask === mask));
}
globalThis.document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => setScreen(button.dataset.mode)));
globalThis.document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => setFilter(button.dataset.filter)));
globalThis.document.querySelectorAll("[data-mask]").forEach((button) => button.addEventListener("click", () => setMask(button.dataset.mask)));
setScreen("combat");
setFilter("normal");
setMask("none");
