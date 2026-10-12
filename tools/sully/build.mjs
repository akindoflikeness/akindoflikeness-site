import {build} from 'esbuild';
import {readFile, writeFile, readdir} from 'node:fs/promises';

const result = await build({
  entryPoints: ['src/ui.jsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2022'],
  outfile: 'ui.bundle.js',
  define: {'process.env.NODE_ENV': '"production"'},
  legalComments: 'external',
  jsx: 'automatic',
  metafile: true,
});

// Include the full licences of packages actually shipped in the bundle.
const packages = [...new Set(Object.keys(result.metafile.inputs)
  .filter(path => path.startsWith('node_modules/'))
  .map(path => path.match(/^node_modules\/(@[^/]+\/[^/]+|[^/]+)/)[1]))].sort();
const notices = ['Sully UI — Third-Party Notices\n'];
for (const name of packages) {
  const root = `node_modules/${name}`;
  const metadata = JSON.parse(await readFile(`${root}/package.json`, 'utf8'));
  const files = (await readdir(root)).filter(file => /^licen[sc]e(?:\.|$)/i.test(file)).sort();
  if (!files.length) throw new Error(`Missing licence for ${name}`);
  notices.push(`${name} ${metadata.version}\n${'='.repeat(60)}\n`);
  for (const file of files) notices.push((await readFile(`${root}/${file}`, 'utf8')).replaceAll('\r\n', '\n').trim() + '\n');
}
await writeFile('THIRD-PARTY-NOTICES.txt', notices.join('\n'));
