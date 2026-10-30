import { mountApp } from "./app.js";
import "./style.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app root");
mountApp(root);
