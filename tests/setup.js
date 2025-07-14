// Test setup file
// CommonJS-compatible setup
require('@testing-library/jest-dom');

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

// Setup and teardown functions
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Mock timers to prevent real intervals
jest.useFakeTimers();

// Global test timeout
jest.setTimeout(10000);

// Cleanup after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
}); 