import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: './plugin/index.ts',
            name: 'InertiaOverlayPlugin',
            fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
            formats: ['es', 'cjs']
        },
        cssCodeSplit: false,
        rollupOptions: {
            external: ['vue', '@inertiajs/vue3', '@inertiajs/core']
        }
    },
    plugins: [
        vue(),
        dts({
            include: ['plugin/**/*.ts', 'plugin/**/*.d.ts'],
            copyDtsFiles: true
        })
    ]
});