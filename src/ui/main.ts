import { mountApp } from "./app.js";
import "./style.css";
import "./card-fx.css";
import "./design-v2.css";
import "./card-design.css";
import "./map-design.css";
import "./battle-hud.css";
import "./multi-enemy.css";
import "./choice-information.css";
import "./battle-objects.css";
import "./pile-tray.css";
import "./battle-map-overlay.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app root");
mountApp(root);
