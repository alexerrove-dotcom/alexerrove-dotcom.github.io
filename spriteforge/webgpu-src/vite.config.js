import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({
  base:'/spriteforge/webgpu/',
  build:{
    outDir:'../webgpu',
    emptyOutDir:true,
    target:'es2022',
    lib:{entry:resolve(import.meta.dirname,'bridge.js'),formats:['es'],fileName:()=> 'bundle.js'},
    rollupOptions:{output:{assetFileNames:'assets/[name]-[hash][extname]'}}
  },
  worker:{format:'es'}
});
