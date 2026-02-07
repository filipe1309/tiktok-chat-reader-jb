/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/backend'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/backend/domain/$1',
    '^@application/(.*)$': '<rootDir>/backend/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/backend/infrastructure/$1',
    '^@presentation/(.*)$': '<rootDir>/backend/presentation/$1',
    '^@config/(.*)$': '<rootDir>/backend/config/$1',
    '^@shared/(.*)$': '<rootDir>/backend/shared/$1',
  },
  collectCoverageFrom: [
    'backend/**/*.ts',
    '!backend/**/*.d.ts',
    '!backend/**/index.ts',
    '!backend/main.ts',
    '!backend/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 40,
      lines: 35,
      statements: 35,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/backend/__tests__/setup.ts'],
  verbose: true,
};
