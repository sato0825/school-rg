import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const register = JSON.parse(await readFile('docs/art/issue252-defeat-candidates.json', 'utf8'));
assert.equal(register.version, 1);
assert.equal(register.assets.length, 2);
for (const asset of register.assets) {
  assert.equal(asset.status, 'candidate');
  assert.equal(asset.pose, 'defeat');
  assert.equal(asset.editableSource, null);
  assert(asset.id.endsWith('-v1') && asset.file.endsWith(`${asset.id}.png`));
  const bytes = await readFile(resolve(asset.file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, `${asset.id}: SHA`);
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
  assert.equal(bytes.readUInt32BE(16), asset.width, `${asset.id}: width`);
  assert.equal(bytes.readUInt32BE(20), asset.height, `${asset.id}: height`);
  assert.equal(bytes[25], 6, `${asset.id}: RGBA color type`);
  await access(asset.promptFile);
  for (const ref of asset.referenceFiles) await access(ref);
}
console.log('Issue #252: 2 candidate PNGs, SHA, dimensions, references and provenance passed.');
