import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: [],
        include: ['**/*.test.{ts,tsx}'],
        // e2e/ is the Playwright suite; it needs a server and a browser
        exclude: [...configDefaults.exclude, 'e2e/**'],
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
