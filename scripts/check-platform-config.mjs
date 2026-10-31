import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
const project = readFileSync(new URL("../src-tauri/gen/apple/project.yml", import.meta.url), "utf8");
const xcodeProject = readFileSync(new URL("../src-tauri/gen/apple/school_rg.xcodeproj/project.pbxproj", import.meta.url), "utf8");

assert.equal(config.identifier, "com.sato0825.schoolrg");
assert.equal(config.build.frontendDist, "../dist");
assert.ok(config.app.windows[0].minWidth >= 960);
assert.ok(config.app.windows[0].minHeight >= 640);
assert.ok(config.bundle.icon.every((icon) => icon.startsWith("app-icons/")));
assert.match(project, /TARGETED_DEVICE_FAMILY:\s*2\b/);
assert.equal((xcodeProject.match(/TARGETED_DEVICE_FAMILY = 2;/g) ?? []).length, 2);

console.log("Tauri desktop and iPad package configuration is consistent.");
