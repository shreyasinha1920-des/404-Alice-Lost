import { defineConfig, type Plugin } from 'vite';
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ILLUSTRATIONS_DIR = resolve(import.meta.dirname, 'public/illustrations');
const VIRTUAL_ID = 'virtual:illustrations';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/**
 * Lists the illustration layer files that actually exist, so pages only
 * request real files and fall back to placeholders for the rest.
 * Shape: { "page-07": { bg: "/illustrations/page-07/bg.png", ... } }
 */
function illustrationManifest(): Plugin {
  const scan = () => {
    const manifest: Record<string, Record<string, string>> = {};
    if (!existsSync(ILLUSTRATIONS_DIR)) return manifest;
    for (const dir of readdirSync(ILLUSTRATIONS_DIR, { withFileTypes: true })) {
      if (!dir.isDirectory() || !/^page-\d{2}$/.test(dir.name)) continue;
      const layers: Record<string, string> = {};
      for (const file of readdirSync(resolve(ILLUSTRATIONS_DIR, dir.name))) {
        const match = /^(bg|mid|fg)\.(png|svg|webp|jpg)$/.exec(file);
        if (match) layers[match[1]] = `/illustrations/${dir.name}/${file}`;
      }
      manifest[dir.name] = layers;
    }
    return manifest;
  };

  return {
    name: 'illustration-manifest',
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load: (id) => (id === RESOLVED_ID ? `export default ${JSON.stringify(scan())};` : undefined),
    configureServer(server) {
      server.watcher.add(ILLUSTRATIONS_DIR);
      const reload = (file: string) => {
        if (!file.startsWith(ILLUSTRATIONS_DIR)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', reload);
      server.watcher.on('unlink', reload);
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [illustrationManifest()],
  build: {
    target: 'es2022',
  },
});
