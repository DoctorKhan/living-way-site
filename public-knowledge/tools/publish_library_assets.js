const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLICATIONS_FILE = path.join(ROOT, 'tools', 'publications.tsv');
const WORKS_DIR = path.join(ROOT, 'works');
const MANIFEST_FILE = path.join(ROOT, 'library_manifest.json');

function parsePublications() {
  const raw = fs.readFileSync(PUBLICATIONS_FILE, 'utf8').trim();
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const [, ...rows] = lines;

  return rows.map((line) => {
    const [id, kind, source, publicBase, title, section, voice, formatsRaw] = line.split('\t');

    if (!id || !kind || !source || !publicBase || !title) {
      throw new Error(`Invalid publications.tsv row: ${line}`);
    }

    return {
      id,
      kind,
      source,
      publicBase,
      title,
      section,
      voice,
      formats: (formatsRaw || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    };
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFileIfChanged(target, contents) {
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === contents) {
    return;
  }

  fs.writeFileSync(target, contents);
}

function copyFileIfChanged(source, target) {
  const sourceBuffer = fs.readFileSync(source);
  if (fs.existsSync(target)) {
    const targetBuffer = fs.readFileSync(target);
    if (Buffer.compare(sourceBuffer, targetBuffer) === 0) {
      return;
    }
  }

  fs.copyFileSync(source, target);
}

function makeRedirectHtml(title, targetPath) {
  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapedTitle}</title>
    <meta http-equiv="refresh" content="0; url=${targetPath}" />
    <link rel="canonical" href="${targetPath}" />
    <script>window.location.replace(${JSON.stringify(targetPath)});</script>
  </head>
  <body>
    <p>Redirecting to <a href="${targetPath}">${escapedTitle}</a>...</p>
  </body>
</html>
`;
}

function publishAssets(publications) {
  ensureDir(WORKS_DIR);

  const works = [];

  for (const publication of publications) {
    const sourcePath = path.join(ROOT, publication.source);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Missing publication source: ${publication.source}`);
    }

    const formats = {};

    if (publication.formats.includes('html')) {
      const htmlPublicPath = `${publication.publicBase}.html`;
      if (!fs.existsSync(path.join(ROOT, htmlPublicPath))) {
        throw new Error(`Missing published HTML asset: ${htmlPublicPath}`);
      }

      const htmlAliasPath = path.join(WORKS_DIR, `${publication.id}.html`);
      writeFileIfChanged(
        htmlAliasPath,
        makeRedirectHtml(publication.title, `../${htmlPublicPath}`)
      );

      formats.html = {
        publicPath: htmlPublicPath,
        stablePath: path.relative(ROOT, htmlAliasPath)
      };
    }

    if (publication.formats.includes('pdf')) {
      const pdfPublicPath = `${publication.publicBase}.pdf`;
      const pdfSourcePath = path.join(ROOT, pdfPublicPath);
      if (!fs.existsSync(pdfSourcePath)) {
        throw new Error(`Missing published PDF asset: ${pdfPublicPath}`);
      }

      const pdfAliasPath = path.join(WORKS_DIR, `${publication.id}.pdf`);
      copyFileIfChanged(pdfSourcePath, pdfAliasPath);

      formats.pdf = {
        publicPath: pdfPublicPath,
        stablePath: path.relative(ROOT, pdfAliasPath)
      };
    }

    works.push({
      id: publication.id,
      kind: publication.kind,
      title: publication.title,
      section: publication.section,
      voice: publication.voice,
      sourcePath: publication.source,
      publicBase: publication.publicBase,
      formats
    });
  }

  const manifest = {
    contractVersion: 2,
    series: {
      name: 'The Living Way',
      indexPath: 'index.html'
    },
    works
  };

  writeFileIfChanged(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
}

publishAssets(parsePublications());
