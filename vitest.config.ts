import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/tests/**',
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'src/app/auth/**',
        'src/app/dashboard/**',
        'src/lib/supabase/middleware.ts',
        'src/lib/supabase/server.ts',
        'src/lib/types.ts',
        'src/**/*.d.ts',
      ],
      thresholds: {
        lines: 12,
        functions: 12,
        branches: 12,
        statements: 12,
      },
    },
  },
})
