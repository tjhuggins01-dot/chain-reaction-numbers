import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/chain-reaction-numbers/',
  test: {
    environment: 'node',
    globals: true,
  },
});
