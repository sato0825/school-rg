const scenes = {
  treasure: { label: "宝箱", title: "資料保管庫", instruction: "品を一つ選ぶ", exit: "何も取らず進む", choices: [
    ["✦", "しおりの護符", "レリック", "戦闘開始時に防御 +2", "受け取る"],
    ["✚", "保健室の小瓶", "ポーション", "回復 8 · 所持 1/2", "受け取る"],
  ] },
  shop: { label: "購買", title: "校内購買", instruction: "棚から品を選ぶ", exit: "購買を出る", choices: [
    ["▣", "leaf", "カード", "防御 4・1枚ドロー", "40 G"],
    ["✦", "しおりの護符", "レリック", "戦闘開始時に防御 +2", "90 G"],
    ["✚", "保健室の小瓶", "ポーション", "回復 8 · 所持 1/2", "35 G"],
    ["▤", "カードを整理", "一度だけ", "デッキから1枚削除", "60 G"],
  ] },
  rest: { label: "休憩", title: "窓辺の休憩席", instruction: "この地点で一つ選ぶ", exit: "", choices: [
    ["♥", "ひと休み", "回復", "HP 36 → 40 / 40", "+4 HP"],
    ["↑", "ノートを手直し", "強化", "カードを1枚選んで強化", "選ぶ"],
  ] },
  event: { label: "イベント", title: "放課後の掲示板", instruction: "貼り紙を読む · 選択は一つ", exit: "", choices: [
    ["▤", "手伝いを申し出る", "選択肢", "+20 G · HP -3", "決める"],
    ["✦", "忘れ物を届ける", "選択肢", "レリックを得る", "決める"],
    ["↗", "見送る", "選択肢", "効果なし", "進む"],
  ] },
};
const scene = document.querySelector(".scene");
const place = new URL(location.href).searchParams.get("scene") ?? "treasure";
const selected = scenes[place] ? place : "treasure";
const data = scenes[selected];
scene.dataset.place = selected;
scene.querySelector(".location-label").textContent = `ACT 1 · 2F · ${data.label}`;
scene.querySelector(".scene-title h1").textContent = data.title;
scene.querySelector(".scene-title p").textContent = data.instruction;
scene.querySelector(".scene-exit").innerHTML = data.exit ? `${data.exit} <span aria-hidden="true">→</span>` : "";
scene.querySelector(".choices").innerHTML = data.choices.map(([symbol, name, kind, effect, action], index) => `<div class="choice choice-${index + 1}"><span class="choice-symbol" aria-hidden="true">${symbol}</span><div class="choice-text"><small>${kind}</small><strong>${name}</strong><span>${effect}</span></div><b class="choice-action">${action}</b></div>`).join("");
