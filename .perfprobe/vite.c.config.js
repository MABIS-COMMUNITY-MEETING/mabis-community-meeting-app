import { defineConfig } from "vite";
import path from "node:path";
const R = path.resolve(process.cwd(), ".perfprobe");
export default defineConfig({ configFile:false, logLevel:"error", resolve:{ alias:{ "partysocket": path.join(R,"stub-party.js") } }, build:{ outDir:path.join(R,"out-c"), emptyOutDir:true, rollupOptions:{ input: path.join(R,"a.js"), output:{ entryFileNames:"a.js", chunkFileNames:"[name].js" } } } });
