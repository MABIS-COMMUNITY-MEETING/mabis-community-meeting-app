import { defineConfig } from 'vite';
import path from 'node:path';
const R = path.resolve(process.cwd(), '.perfprobe');
export default defineConfig({ configFile:false, logLevel:'error',
  build:{ target:'esnext', outDir:path.join(R,'out-a'), emptyOutDir:true, minify:'esbuild',
    lib:{ entry:path.join(R,'a.js'), formats:['es'], fileName:'a' } } });
