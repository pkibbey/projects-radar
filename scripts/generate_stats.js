#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IGNORE_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'out']);

async function walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    if (ent.name === '.' || ent.name === '..') continue;
    const full = path.join(dir, ent.name);
    const rel = path.relative(ROOT, full);
    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) continue;
      files.push(...(await walk(full)));
    } else if (ent.isFile()) {
      files.push({ full, rel });
    }
  }
  return files;
}

function extFrom(p) {
  const ext = path.extname(p).toLowerCase();
  return ext.startsWith('.') ? ext.slice(1) : (ext || 'noext');
}

(async () => {
  const files = await walk(ROOT);
  let totals = { files: 0, lines: 0, bytes: 0 };
  const languages = Object.create(null);
  let testFiles = 0, testLines = 0;
  const fileStats = [];

  for (const f of files) {
    try {
      const stat = await fs.promises.stat(f.full);
      const bytes = stat.size;
      let lines = 0;
      let content = null;
      try {
        content = await fs.promises.readFile(f.full, 'utf8');
        if (content.length === 0) {
          lines = 0;
        } else {
          lines = content.split('\n').length;
        }
      } catch (err) {
        // binary or unreadable as utf8
        lines = 0;
      }

      totals.files += 1;
      totals.lines += lines;
      totals.bytes += bytes;

      const ext = extFrom(f.rel);
      if (!languages[ext]) languages[ext] = { files: 0, lines: 0 };
      languages[ext].files += 1;
      languages[ext].lines += lines;

      const isTest = /(^|\/)__tests__\//.test(f.rel) || /test|spec/i.test(path.basename(f.rel));
      if (isTest) {
        testFiles += 1;
        testLines += lines;
      }

      fileStats.push({ path: f.rel, bytes, lines });
    } catch (err) {
      // ignore
    }
  }

  // indicators
  const indicators = {
    README: fs.existsSync(path.join(ROOT, 'README.md')),
    LICENSE: fs.existsSync(path.join(ROOT, 'LICENSE')) || fs.existsSync(path.join(ROOT, 'LICENSE.md')),
    CONTRIBUTING: fs.existsSync(path.join(ROOT, 'CONTRIBUTING.md')) || fs.existsSync(path.join(ROOT, 'CONTRIBUTING')),
    CI: fs.existsSync(path.join(ROOT, '.github', 'workflows')) || fs.existsSync(path.join(ROOT, '.gitlab-ci.yml')),
    package_manifest: fs.existsSync(path.join(ROOT, 'package.json')) || fs.existsSync(path.join(ROOT, 'pyproject.toml')),
    build_script: false,
    docs_folder: fs.existsSync(path.join(ROOT, 'docs')) && fs.statSync(path.join(ROOT, 'docs')).isDirectory(),
  };

  // build script detection
  try {
    if (fs.existsSync(path.join(ROOT, 'package.json'))) {
      const pj = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
      indicators.build_script = !!(pj.scripts && pj.scripts.build);
    } else if (fs.existsSync(path.join(ROOT, 'pyproject.toml'))) {
      // not checking Python build script specifically
      indicators.build_script = false;
    }
  } catch (err) {
    indicators.build_script = false;
  }

  // completeness score weights
  const weights = {
    README: 20,
    LICENSE: 5,
    CI: 15,
    tests: 20,
    package_manifest: 15,
    build_script: 10,
    docs_folder: 15,
  };

  let score = 0;
  if (indicators.README) score += weights.README;
  if (indicators.LICENSE) score += weights.LICENSE;
  if (indicators.CI) score += weights.CI;
  if (testFiles > 0) score += weights.tests;
  if (indicators.package_manifest) score += weights.package_manifest;
  if (indicators.build_script) score += weights.build_script;
  if (indicators.docs_folder) score += weights.docs_folder;
  if (score > 100) score = 100;

  // top 3 largest files
  fileStats.sort((a,b) => b.bytes - a.bytes);
  const top3 = fileStats.slice(0,3).map(f => ({ path: f.path.replace(/^(\.\/|\.)?\/?/, ''), bytes: f.bytes, lines: f.lines }));

  const notes = (totals.files === 0)
    ? 'No files discovered.'
    : `Repository contains ${totals.files} files; analysis is conservative and treats unreadable/binary files as 0 lines.`;

  const out = {
    repository: path.basename(ROOT),
    analyzed_at: new Date().toISOString(),
    totals,
    languages,
    tests: {
      has_tests: testFiles > 0,
      test_files: testFiles,
      test_lines: testLines,
    },
    completeness_score: Math.round(score),
    indicators,
    top_3_largest_files: top3,
    notes,
  };

  console.log(JSON.stringify(out));
})();
