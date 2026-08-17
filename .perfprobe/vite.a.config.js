import { defineConfig } from 'vite';
import path from 'node:path';
const R = path.resolve(process.cwd(), '.perfprobe');
export default defineConfig({ configFile:false, logLevel:'error',
  build:{ outDir:path.join(R,'out-a'), emptyOutDir:true,
    rollupOptions:{ input: path.join(R,'a.js'), output:{ entryFileNames:'a.js', chunkFileNames:'[name].js' } } } });
