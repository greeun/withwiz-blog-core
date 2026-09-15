/**
 * package.json exports 서브패스 스모크 테스트 (SC-SM-002)
 *
 * 소비자 관점에서 각 서브패스를 패키지 이름(자기 참조)으로 import·require 하고,
 * exports 가 선언한 types·default 경로 파일이 dist 에 모두 생성되었는지 확인한다.
 * 선언 파일은 런타임 export 이름을 모두 선언하는지 문자열 수준으로 대조한다(타입 컴파일은 하지 않음).
 * editor 서브패스는 선택적 peer 인 @tiptap/* 를 import 하므로 devDependencies 설치를 전제로 한다.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pkgUrl = new URL('../../package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(pkgUrl, 'utf8'));
const subpaths = Object.keys(pkg.exports);

const specifierOf = (subpath) => (subpath === '.' ? pkg.name : `${pkg.name}/${subpath.slice(2)}`);
const fileOf = (relative) => fileURLToPath(new URL(relative, pkgUrl));
const moduleKeys = (mod) => Object.keys(mod).filter((k) => k !== 'default' && k !== '__esModule').sort();

/**
 * 선언 파일이 상대 경로로 참조하는 선언 파일을 따라가며 존재하지 않는 참조를 모은다.
 * tsup 은 공유 선언을 청크로 분리하고 `.js`·`.cjs` 확장자로 참조한다(각각 `.d.ts`·`.d.cts` 로 해석).
 */
function findBrokenDeclarationRefs(entryPath) {
  const broken = new Set();
  const seen = new Set();
  const queue = [entryPath];
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const [, spec] of source.matchAll(/(?:from|import)\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const target = resolve(dirname(file), spec).replace(/\.c?js$/, (ext) => (ext === '.cjs' ? '.d.cts' : '.d.ts'));
      if (existsSync(target)) queue.push(target);
      else broken.add(`${file.slice(file.indexOf('/dist/') + 1)} → ${spec}`);
    }
  }
  return [...broken];
}

// 서브패스별 import 결과는 여러 테스트에서 재사용한다
const esmCache = new Map();
const importEsm = (subpath) => {
  if (!esmCache.has(subpath)) esmCache.set(subpath, import(specifierOf(subpath)));
  return esmCache.get(subpath);
};

test('exports 는 tsup 엔트리와 같은 14개 서브패스를 선언한다', () => {
  assert.equal(subpaths.length, 14);
  assert.ok(subpaths.includes('./components/admin/editor'));
});

for (const subpath of subpaths) {
  test(`[${subpath}] import·require 조건의 types·default 파일이 dist 에 존재한다`, () => {
    const entry = pkg.exports[subpath];
    const missing = [];
    for (const condition of ['import', 'require']) {
      for (const field of ['types', 'default']) {
        const target = entry?.[condition]?.[field];
        assert.ok(target, `${condition}.${field} 선언`);
        if (!existsSync(fileOf(target))) missing.push(`${condition}.${field}: ${target}`);
      }
    }
    assert.deepEqual(missing, [], '누락된 dist 파일');
  });

  test(`[${subpath}] ESM import 와 CJS require 가 성공하고 export 이름이 같다`, async () => {
    const esm = await importEsm(subpath);
    const cjs = require(specifierOf(subpath));
    // ./types 는 타입 전용 엔트리라 런타임 export 가 없을 수 있다
    assert.deepEqual(moduleKeys(cjs), moduleKeys(esm));
  });

  test(`[${subpath}] 선언 파일(.d.ts·.d.cts)이 런타임 export 이름을 모두 선언한다`, async () => {
    const entry = pkg.exports[subpath];
    const runtimeKeys = moduleKeys(await importEsm(subpath));
    for (const target of [entry.import.types, entry.require.types]) {
      const path = fileOf(target);
      assert.ok(existsSync(path), `${target} 존재`);
      const dts = readFileSync(path, 'utf8');
      assert.match(dts, /\bexport\b/, `${target} 에 export 선언`);
      const undeclared = runtimeKeys.filter((name) => !new RegExp(`\\b${name}\\b`).test(dts));
      assert.deepEqual(undeclared, [], `${target} 에 선언되지 않은 export`);
      assert.deepEqual(findBrokenDeclarationRefs(path), [], `${target} 의 상대 참조 선언 파일 누락`);
    }
  });
}
