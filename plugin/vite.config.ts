import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        outDir: 'build',
        lib: {
            entry: './src/index.ts',
            name: '@jessegall/inertia-overlay',
            fileName: () => `index.mjs`,
            formats: ['es']
        },
        cssCodeSplit: false,
        rollupOptions: {
            external: ['vue', '@inertiajs/vue3', '@inertiajs/core']
        }
    },
    plugins: [
        vue(),
        dts({
            include: ['src/**/*.ts', 'src/**/*.d.ts'],
            copyDtsFiles: true,
            outDir: 'build'
        })
    ]
});