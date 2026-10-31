import { mountApp } from "./app.js";
import "./style.css";
import "./card-fx.css";
import "./design-v2.css";
import "./card-design.css";
import "./map-design.css";
import "./battle-hud.css";
import "./multi-enemy.css";
import "./result-fx.css";
import "./choice-information.css";
import "./battle-objects.css";
import "./battle-map-overlay.css";
import "./game-shell.css";
import "./card-visuals.css";
import "./visual-system.css";

import "./victory-view.css";
import "./loss-view.css";
import "./location-stage.css";
import "./intent-glyphs.css";

import "./item-art.css";

import "./actor-motion.css";
import "./literature-rig.css";

import "./enemy-action-art.css";


const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app root");
mountApp(root);
