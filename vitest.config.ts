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
        // Next.js infrastructure — not unit-testable
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'src/app/auth/**',
        'src/app/dashboard/**',
        // API route handlers — require integration tests, not unit tests
        'src/app/api/**',
        // Thin provider wrappers — no logic to assert
        'src/components/providers/**',
        'src/components/ErrorBoundary.tsx',
        // Server-only utilities
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
