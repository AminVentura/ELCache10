import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');

test('.reveal must stay visible without waiting for IntersectionObserver', () => {
  assert.equal(
    /\.reveal\s*\{[^}]*opacity:\s*0/s.test(css),
    false,
    '.reveal { opacity: 0 } hides ATM/Notary/Tax, gallery, and barber phones when is-visible never fires'
  );
  assert.match(css, /\.reveal\s*\{[^}]*opacity:\s*1\s*!important/s);
});
