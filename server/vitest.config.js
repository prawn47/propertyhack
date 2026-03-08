import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['__tests__/**/*.test.js'],
    pool: 'forks',
    deps: {
      interopDefault: true,
      inline: true,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules', '__tests__'],
    },
  },
})
