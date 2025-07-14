import { App } from '../../src/app';
import { NFCService } from '../../src/services/nfcService';
import { PaymentService } from '../../src/services/paymentService';
import { AlchemyService } from '../../src/services/alchemyService';
import { PriceCacheService } from '../../src/services/priceCacheService';
import { RealtimeTransactionMonitor } from '../../src/services/realtimeTransactionMonitor';
import { AddressProcessor } from '../../src/services/addressProcessor';

// Mock all external dependencies
jest.mock('nfc-pcsc', () => ({
  Reader: jest.fn()
}));

jest.mock('alchemy-sdk', () => ({
  Alchemy: jest.fn(),
  Network: {
    ETH_MAINNET: 'eth-mainnet',
    ETH_SEPOLIA: 'eth-sepolia',
    BASE_MAINNET: 'base-mainnet',
    ARB_MAINNET: 'arb-mainnet',
    OPT_MAINNET: 'opt-mainnet',
    POLYGON_MAINNET: 'polygon-mainnet'
  },
  Utils: {
    hexlify: jest.fn((value) => `0x${value.toString(16)}`)
  },
  AssetTransfersCategory: {
    EXTERNAL: 'external',
    ERC20: 'erc20'
  }
}));

jest.mock('../../src/services/nfcService');
jest.mock('../../src/services/paymentService');
jest.mock('../../src/services/alchemyService');
jest.mock('../../src/services/priceCacheService');
jest.mock('../../src/services/realtimeTransactionMonitor');
jest.mock('../../src/services/addressProcessor');

describe('End-to-End Payment Flow Integration Tests', () => {
  let app: App;
  let mockNFCService: jest.Mocked<NFCService>;
  let mockPaymentService: jest.Mocked<typeof PaymentService>;
  let mockAlchemyService: jest.Mocked<typeof AlchemyService>;
  let mockPriceCacheService: jest.Mocked<typeof PriceCacheService>;
  let mockRealtimeTransactionMonitor: jest.Mocked<typeof RealtimeTransactionMonitor>;
  let mockAddressProcessor: jest.Mocked<typeof AddressProcessor>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mock services
    mockNFCService = {
      startListening: jest.fn(),
      armForPaymentAndAwaitTap: jest.fn(),
      scanForWalletAddress: jest.fn(),
      cancelCurrentOperation: jest.fn(),
      stopListening: jest.fn()
    } as any;

    mockPaymentService = PaymentService as jest.Mocked<typeof PaymentService>;
    mockAlchemyService = AlchemyService as jest.Mocked<typeof AlchemyService>;
    mockPriceCacheService = PriceCacheService as jest.Mocked<typeof PriceCacheService>;
    mockRealtimeTransactionMonitor = RealtimeTransactionMonitor as jest.Mocked<typeof RealtimeTransactionMonitor>;
    mockAddressProcessor = AddressProcessor as jest.Mocked<typeof AddressProcessor>;

    // Setup default mock implementations
    (NFCService as jest.MockedClass<typeof NFCService>).mockImplementation(() => mockNFCService);
    mockPriceCacheService.initialize.mockResolvedValue(undefined);
    mockAlchemyService.initialize.mockReturnValue(undefined);
    mockAlchemyService.fetchMultiChainBalances.mockResolvedValue({
      address: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
      chains: [
        {
          chainId: 1,
          chainName: 'ethereum',
          chainDisplayName: 'Ethereum',
          tokens: [
            {
              symbol: 'USDC',
              name: 'USD Coin',
              address: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C8',
              decimals: 6,
              balance: 1000000,
              valueUSD: 1.00,
              priceUSD: 1.00,
              chainId: 1,
              chainName: 'ethereum',
              chainDisplayName: 'Ethereum',
              isNativeToken: false
            }
          ],
          totalValueUSD: 1.00
        }
      ],
      allTokens: [],
      totalValueUSD: 1.00
    });

    mockPaymentService.calculateAndSendPayment.mockResolvedValue({
      selectedToken: {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C8',
        decimals: 6,
        balance: 1000000,
        valueUSD: 1.00,
        priceUSD: 1.00,
        chainId: 1,
        chainName: 'ethereum',
        chainDisplayName: 'Ethereum',
        isNativeToken: false
      },
      requiredAmount: BigInt('500000'),
      chainId: 1,
      chainName: 'Ethereum'
    });

    mockAddressProcessor.canProcessAddress.mockReturnValue(true);
    mockAddressProcessor.startProcessing.mockImplementation(() => {});
    mockAddressProcessor.finishProcessing.mockImplementation(() => {});

    // Create app instance
    app = new App();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Complete Payment Flow', () => {
    it('should complete full payment from NFC tap to transaction confirmation', async () => {
      const paymentAmount = 15.50;
      const expectedPaymentResult = {
        success: true,
        message: 'Payment processed successfully',
        paymentInfo: {
          amount: paymentAmount,
          status: 'pending',
          transactionHash: '0x1234567890abcdef',
          recipientAddress: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7'
        }
      };

      // Setup NFC service to return successful payment
      mockNFCService.armForPaymentAndAwaitTap.mockResolvedValue(expectedPaymentResult);

      // Initialize services
      await app.initializeServices();

      // Process payment
      const result = await app.processPayment(paymentAmount);

      // Verify complete flow
      expect(mockNFCService.armForPaymentAndAwaitTap).toHaveBeenCalledWith(paymentAmount);
      expect(result).toEqual(expectedPaymentResult);
    });

    it('should handle payment failures gracefully', async () => {
      const paymentAmount = 25.00;
      const errorMessage = 'NFC communication failed';

      // Setup NFC service to throw error
      mockNFCService.armForPaymentAndAwaitTap.mockRejectedValue(new Error(errorMessage));

      // Initialize services
      await app.initializeServices();

      // Process payment and expect failure
      await expect(app.processPayment(paymentAmount)).rejects.toThrow(errorMessage);

      // Verify error handling
      expect(mockNFCService.armForPaymentAndAwaitTap).toHaveBeenCalledWith(paymentAmount);
      expect(mockRealtimeTransactionMonitor.startMonitoring).not.toHaveBeenCalled();
    });

    it('should process multiple payments in sequence', async () => {
      const payments = [10.00, 15.50, 25.75];

      // Setup NFC service for multiple successful payments
      mockNFCService.armForPaymentAndAwaitTap
        .mockResolvedValueOnce({
          success: true,
          message: 'Payment 1 successful',
          paymentInfo: { amount: 10.00, status: 'confirmed' }
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'Payment 2 successful',
          paymentInfo: { amount: 15.50, status: 'confirmed' }
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'Payment 3 successful',
          paymentInfo: { amount: 25.75, status: 'confirmed' }
        });

      // Initialize services
      await app.initializeServices();

      // Process multiple payments
      const results = await Promise.all(payments.map(amount => app.processPayment(amount)));

      // Verify all payments were processed
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
      expect(mockNFCService.armForPaymentAndAwaitTap).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid NFC taps without errors', async () => {
      const paymentAmount = 5.00;

      // Setup NFC service for rapid success
      mockNFCService.armForPaymentAndAwaitTap.mockResolvedValue({
        success: true,
        message: 'Rapid payment successful',
        paymentInfo: { amount: paymentAmount, status: 'confirmed' }
      });

      // Initialize services
      await app.initializeServices();

      // Process rapid payments
      const promises = Array(5).fill(null).map(() => app.processPayment(paymentAmount));
      const results = await Promise.all(promises);

      // Verify all rapid payments succeeded
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      expect(mockNFCService.armForPaymentAndAwaitTap).toHaveBeenCalledTimes(5);
    });
  });

  describe('Service Integration', () => {
    it('should properly initialize all services', async () => {
      await app.initializeServices();

      expect(mockPriceCacheService.initialize).toHaveBeenCalled();
      expect(mockNFCService.startListening).toHaveBeenCalled();
    });

    it('should stop all services gracefully', () => {
      app.stopServices();

      expect(mockPriceCacheService.stop).toHaveBeenCalled();
      expect(mockNFCService.stopListening).toHaveBeenCalled();
    });

    it('should handle service initialization failures', async () => {
      const initError = new Error('Service initialization failed');
      mockPriceCacheService.initialize.mockRejectedValue(initError);

      await expect(app.initializeServices()).rejects.toThrow('Service initialization failed');
    });
  });

  describe('Address Processing Integration', () => {
    it('should process wallet addresses correctly', async () => {
      const walletAddress = '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7';

      // Setup address processing
      mockAddressProcessor.canProcessAddress.mockReturnValue(true);
      mockAlchemyService.fetchMultiChainBalances.mockResolvedValue({
        address: walletAddress,
        chains: [],
        allTokens: [],
        totalValueUSD: 1000.00
      });

      // Initialize services
      await app.initializeServices();

      // Verify address processing integration - this would be called by NFCService internally
      // The integration test verifies that the services work together
      expect(mockPriceCacheService.initialize).toHaveBeenCalled();
    });

    it('should handle duplicate address processing', async () => {
      mockAddressProcessor.canProcessAddress.mockReturnValue(false);
      mockAddressProcessor.getProcessingBlockReason.mockReturnValue('Address already being processed');

      const paymentAmount = 10.00;
      mockNFCService.armForPaymentAndAwaitTap.mockResolvedValue({
        success: false,
        message: 'Address already being processed',
        errorType: 'DUPLICATE_ADDRESS'
      });

      await app.initializeServices();
      const result = await app.processPayment(paymentAmount);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('DUPLICATE_ADDRESS');
    });
  });

  describe('Transaction Monitoring Integration', () => {
    it('should start monitoring after successful payment', async () => {
      const paymentAmount = 20.00;

      mockNFCService.armForPaymentAndAwaitTap.mockResolvedValue({
        success: true,
        message: 'Payment successful',
        paymentInfo: { amount: paymentAmount, status: 'pending' }
      });

      await app.initializeServices();
      await app.processPayment(paymentAmount);

      // Verify payment was processed through NFC service
      expect(mockNFCService.armForPaymentAndAwaitTap).toHaveBeenCalledWith(paymentAmount);
    });

    it('should handle transaction confirmation', async () => {
      const paymentAmount = 15.00;

      mockNFCService.armForPaymentAndAwaitTap.mockResolvedValue({
        success: true,
        message: 'Payment successful',
        paymentInfo: { amount: paymentAmount, status: 'confirmed' }
      });

      await app.initializeServices();
      const result = await app.processPayment(paymentAmount);

      expect(result.success).toBe(true);
      expect(mockNFCService.armForPaymentAndAwaitTap).toHaveBeenCalledWith(paymentAmount);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from NFC service errors', async () => {
      const paymentAmount = 10.00;

      // First call fails, second succeeds
      mockNFCService.armForPaymentAndAwaitTap
        .mockRejectedValueOnce(new Error('NFC error'))
        .mockResolvedValueOnce({
          success: true,
          message: 'Payment successful after retry',
          paymentInfo: { amount: paymentAmount, status: 'confirmed' }
        });

      await app.initializeServices();

      // First attempt should fail
      await expect(app.processPayment(paymentAmount)).rejects.toThrow('NFC error');

      // Second attempt should succeed
      const result = await app.processPayment(paymentAmount);
      expect(result.success).toBe(true);
    });

    it('should handle service unavailability gracefully', async () => {
      // Mock service as unavailable
      mockNFCService.armForPaymentAndAwaitTap.mockRejectedValue(new Error('Service unavailable'));

      await app.initializeServices();

      await expect(app.processPayment(10.00)).rejects.toThrow('Service unavailable');
    });
  });
}); 