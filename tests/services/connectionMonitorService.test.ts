import { ConnectionMonitorService } from '../../src/services/connectionMonitorService';
import { AlchemyService } from '../../src/services/alchemyService';

// Mock dependencies
jest.mock('../../src/services/alchemyService');
jest.mock('../../src/config/index', () => ({
  SUPPORTED_CHAINS: [
    {
      id: 1,
      name: 'ethereum',
      displayName: 'Ethereum',
      alchemyUrl: 'https://eth-mainnet.g.alchemy.com/v2/test-api-key'
    }
  ]
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('ConnectionMonitorService', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockOnStatusChange: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockOnStatusChange = jest.fn();

    // Setup default mocks
    (AlchemyService.isEthereumAddress as jest.Mock).mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ result: '0x123456' })
    } as any);

    // Reset service state
    ConnectionMonitorService.stopMonitoring();
  });

  afterEach(() => {
    jest.useRealTimers();
    ConnectionMonitorService.stopMonitoring();
  });

  describe('startMonitoring', () => {
    it('should not start monitoring if already monitoring', () => {
      ConnectionMonitorService.startMonitoring(mockOnStatusChange);
      const firstCallCount = mockFetch.mock.calls.length;

      ConnectionMonitorService.startMonitoring(mockOnStatusChange);
      const secondCallCount = mockFetch.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });

    it('should set up interval for periodic checks', () => {
      ConnectionMonitorService.startMonitoring(mockOnStatusChange);

      // Fast-forward time to trigger interval
      jest.advanceTimersByTime(30000);

      // Should have been called twice: once immediately, once from interval
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring and clear interval', () => {
      ConnectionMonitorService.startMonitoring(mockOnStatusChange);
      
      ConnectionMonitorService.stopMonitoring();

      // Fast-forward time - should not trigger more checks
      jest.advanceTimersByTime(30000);
      
      // Should only have been called once (initial check)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle stopping when not monitoring', () => {
      expect(() => {
        ConnectionMonitorService.stopMonitoring();
      }).not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return current connection status', () => {
      const status = ConnectionMonitorService.getStatus();

      expect(status).toEqual({
        connected: true,
        lastCheck: expect.any(Number)
      });
    });

    it('should return a copy of the status object', () => {
      const status1 = ConnectionMonitorService.getStatus();
      const status2 = ConnectionMonitorService.getStatus();

      expect(status1).not.toBe(status2); // Should be different objects
      expect(status1).toEqual(status2); // But with same values
    });
  });

  describe('forceCheck', () => {
    it('should perform connection check and return status', async () => {
      const status = await ConnectionMonitorService.forceCheck();

      expect(status).toEqual({
        connected: true,
        lastCheck: expect.any(Number)
      });
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle check failure and return error status', async () => {
      mockFetch.mockRejectedValue(new Error('Force check failed'));

      const status = await ConnectionMonitorService.forceCheck();

      expect(status).toEqual({
        connected: false,
        lastCheck: expect.any(Number),
        errorMessage: 'Force check failed'
      });
    });

    it('should work without monitoring being started', async () => {
      const status = await ConnectionMonitorService.forceCheck();

      expect(status).toEqual({
        connected: true,
        lastCheck: expect.any(Number)
      });
    });
  });

  describe('Error handling', () => {
    it('should handle AlchemyService validation failure', async () => {
      (AlchemyService.isEthereumAddress as jest.Mock).mockReturnValue(false);

      const status = await ConnectionMonitorService.forceCheck();

      expect(status).toEqual({
        connected: false,
        lastCheck: expect.any(Number),
        errorMessage: 'AlchemyService basic validation failed'
      });
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as any);

      const status = await ConnectionMonitorService.forceCheck();

      expect(status).toEqual({
        connected: false,
        lastCheck: expect.any(Number),
        errorMessage: 'HTTP 500: Internal Server Error'
      });
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';
      mockFetch.mockRejectedValue(timeoutError);

      const status = await ConnectionMonitorService.forceCheck();

      expect(status).toEqual({
        connected: false,
        lastCheck: expect.any(Number),
        errorMessage: 'Connection timeout'
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('fetch failed');
      networkError.message = 'fetch failed';
      mockFetch.mockRejectedValue(networkError);

      const status = await ConnectionMonitorService.forceCheck();

      expect(status).toEqual({
        connected: false,
        lastCheck: expect.any(Number),
        errorMessage: 'Network error'
      });
    });

    it('should handle invalid JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ error: 'Invalid response' })
      } as any);

      const status = await ConnectionMonitorService.forceCheck();

      expect(status).toEqual({
        connected: false,
        lastCheck: expect.any(Number),
        errorMessage: 'No result in Alchemy response'
      });
    });

    it('should handle fetch rejection', async () => {
      const fetchError = new Error('Network unreachable');
      mockFetch.mockRejectedValue(fetchError);

      const status = await ConnectionMonitorService.forceCheck();

      expect(status).toEqual({
        connected: false,
        lastCheck: expect.any(Number),
        errorMessage: 'Network unreachable'
      });
    });
  });

  describe('Status change notifications', () => {
    it('should not notify when not monitoring', async () => {
      // Don't start monitoring
      mockFetch.mockRejectedValue(new Error('Connection lost'));
      
      // Force a check without monitoring
      const status = await ConnectionMonitorService.forceCheck();

      expect(status.connected).toBe(false);
      expect(mockOnStatusChange).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined error objects', async () => {
      mockFetch.mockRejectedValue(undefined);

      const status = await ConnectionMonitorService.forceCheck();

      expect(status).toEqual({
        connected: false,
        lastCheck: expect.any(Number),
        errorMessage: 'Connection failed'
      });
    });

    it('should handle non-Error objects', async () => {
      mockFetch.mockRejectedValue('String error');

      const status = await ConnectionMonitorService.forceCheck();

      expect(status).toEqual({
        connected: false,
        lastCheck: expect.any(Number),
        errorMessage: 'Connection failed'
      });
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as any);

      const status = await ConnectionMonitorService.forceCheck();

      expect(status).toEqual({
        connected: false,
        lastCheck: expect.any(Number),
        errorMessage: 'Invalid JSON'
      });
    });
  });
}); 