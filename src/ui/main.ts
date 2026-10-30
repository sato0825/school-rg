import { mountApp } from "./app.js";
import "./style.css";
import "./card-fx.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app root");
mountApp(root);
