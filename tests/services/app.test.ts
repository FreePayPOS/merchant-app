import { App } from '../../src/app';
import { NFCService } from '../../src/services/nfcService';
import { PriceCacheService } from '../../src/services/priceCacheService';

// Mock dependencies
jest.mock('nfc-pcsc', () => ({
  NFC: jest.fn(),
  Reader: jest.fn(),
}));
jest.mock('../../src/services/nfcService');
jest.mock('../../src/services/priceCacheService');

const mockNFCService = {
  startListening: jest.fn(),
  armForPaymentAndAwaitTap: jest.fn(),
  scanForWalletAddress: jest.fn(),
  cancelCurrentOperation: jest.fn(),
  stopListening: jest.fn()
} as any;

const mockPriceCacheService = {
  initialize: jest.fn(),
  stop: jest.fn()
};

describe('App', () => {
  let app: App;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    (NFCService as jest.MockedClass<typeof NFCService>).mockImplementation(() => mockNFCService);
    (PriceCacheService.initialize as jest.Mock) = mockPriceCacheService.initialize;
    (PriceCacheService.stop as jest.Mock) = mockPriceCacheService.stop;
    
    app = new App();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize NFCService', () => {
      expect(NFCService).toHaveBeenCalledTimes(1);
      expect(app).toBeInstanceOf(App);
    });
  });

  describe('initializeServices', () => {
    it('should initialize PriceCacheService and start NFC listening', async () => {
      mockPriceCacheService.initialize.mockResolvedValue(undefined);
      mockNFCService.startListening.mockReturnValue(undefined);

      await app.initializeServices();

      expect(PriceCacheService.initialize).toHaveBeenCalledTimes(1);
      expect(mockNFCService.startListening).toHaveBeenCalledTimes(1);
    });

    it('should handle PriceCacheService initialization errors', async () => {
      const error = new Error('Price cache initialization failed');
      mockPriceCacheService.initialize.mockRejectedValue(error);

      await expect(app.initializeServices()).rejects.toThrow('Price cache initialization failed');
    });

    it('should handle NFCService startListening errors', async () => {
      const error = new Error('NFC listening failed');
      mockPriceCacheService.initialize.mockResolvedValue(undefined);
      mockNFCService.startListening.mockImplementation(() => {
        throw error;
      });

      await expect(app.initializeServices()).rejects.toThrow('NFC listening failed');
    });
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const amount = 15.50;
      const expectedResult = {
        success: true,
        message: 'Payment processed successfully',
        paymentInfo: { amount, status: 'pending' }
      };

      mockNFCService.armForPaymentAndAwaitTap.mockResolvedValue(expectedResult);

      const result = await app.processPayment(amount);

      expect(mockNFCService.armForPaymentAndAwaitTap).toHaveBeenCalledWith(amount);
      expect(result).toEqual(expectedResult);
    });

    it('should handle NFC service not initialized', async () => {
      // Create app without NFC service
      const appWithoutNFC = new App();
      (appWithoutNFC as any).nfcService = null;

      const result = await appWithoutNFC.processPayment(15.50);

      expect(result).toEqual({
        success: false,
        message: 'NFC Service not ready',
        errorType: 'NFC_SERVICE_ERROR'
      });
    });

    it('should handle NFC service errors', async () => {
      const error = new Error('NFC operation failed');
      mockNFCService.armForPaymentAndAwaitTap.mockRejectedValue(error);

      await expect(app.processPayment(15.50)).rejects.toThrow('NFC operation failed');
    });
  });

  describe('scanWalletAddress', () => {
    it('should scan wallet address successfully', async () => {
      const expectedResult = {
        success: true,
        message: 'Wallet address scanned',
        address: '0x1234567890123456789012345678901234567890'
      };

      mockNFCService.scanForWalletAddress.mockResolvedValue(expectedResult);

      const result = await app.scanWalletAddress();

      expect(mockNFCService.scanForWalletAddress).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle NFC service not initialized', async () => {
      // Create app without NFC service
      const appWithoutNFC = new App();
      (appWithoutNFC as any).nfcService = null;

      const result = await appWithoutNFC.scanWalletAddress();

      expect(result).toEqual({
        success: false,
        message: 'NFC Service not ready',
        errorType: 'NFC_SERVICE_ERROR'
      });
    });

    it('should handle NFC service errors', async () => {
      const error = new Error('Wallet scan failed');
      mockNFCService.scanForWalletAddress.mockRejectedValue(error);

      await expect(app.scanWalletAddress()).rejects.toThrow('Wallet scan failed');
    });
  });

  describe('cancelCurrentOperation', () => {
    it('should cancel current NFC operation', () => {
      app.cancelCurrentOperation();

      expect(mockNFCService.cancelCurrentOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle NFC service not initialized gracefully', () => {
      // Create app without NFC service
      const appWithoutNFC = new App();
      (appWithoutNFC as any).nfcService = null;

      // Should not throw error
      expect(() => appWithoutNFC.cancelCurrentOperation()).not.toThrow();
    });
  });

  describe('stopServices', () => {
    it('should stop all services gracefully', () => {
      app.stopServices();

      expect(PriceCacheService.stop).toHaveBeenCalledTimes(1);
      expect(mockNFCService.stopListening).toHaveBeenCalledTimes(1);
    });

    it('should handle NFC service not initialized gracefully', () => {
      // Create app without NFC service
      const appWithoutNFC = new App();
      (appWithoutNFC as any).nfcService = null;

      // Should not throw error
      expect(() => appWithoutNFC.stopServices()).not.toThrow();
      expect(PriceCacheService.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete payment flow', async () => {
      // Initialize services
      mockPriceCacheService.initialize.mockResolvedValue(undefined);
      mockNFCService.startListening.mockReturnValue(undefined);
      await app.initializeServices();

      // Process payment
      const paymentResult = {
        success: true,
        message: 'Payment successful',
        paymentInfo: { amount: 25.00, status: 'confirmed' }
      };
      mockNFCService.armForPaymentAndAwaitTap.mockResolvedValue(paymentResult);

      const result = await app.processPayment(25.00);

      expect(result).toEqual(paymentResult);

      // Stop services
      app.stopServices();
      expect(PriceCacheService.stop).toHaveBeenCalled();
      expect(mockNFCService.stopListening).toHaveBeenCalled();
    });

    it('should handle wallet scanning flow', async () => {
      // Initialize services
      mockPriceCacheService.initialize.mockResolvedValue(undefined);
      mockNFCService.startListening.mockReturnValue(undefined);
      await app.initializeServices();

      // Scan wallet
      const scanResult = {
        success: true,
        message: 'Wallet found',
        address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      };
      mockNFCService.scanForWalletAddress.mockResolvedValue(scanResult);

      const result = await app.scanWalletAddress();

      expect(result).toEqual(scanResult);
    });
  });
}); 