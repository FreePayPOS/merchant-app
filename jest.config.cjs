module.exports = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        noImplicitAny: false,
        strict: false,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts', // Exclude server entry point from coverage
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  // Mock external modules
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^nfc-pcsc$': '<rootDir>/tests/mocks/nfc-pcsc.mock.ts',
    '^ws$': '<rootDir>/tests/mocks/ws.mock.ts',
  },
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
}; 