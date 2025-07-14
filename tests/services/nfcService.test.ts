import { NFCService } from '../../src/services/nfcService';
import { NFC, Reader } from 'nfc-pcsc';
import { EthereumService } from '../../src/services/ethereumService';
import { AddressProcessor } from '../../src/services/addressProcessor';
import { CAIP10Service } from '../../src/services/caip10Service';
import { PaymentService } from '../../src/services/paymentService';
import { AlchemyService } from '../../src/services/alchemyService';

// Mock dependencies
jest.mock('nfc-pcsc', () => ({
  NFC: jest.fn().mockImplementation(() => ({
    on: jest.fn()
  })),
  Reader: jest.fn()
}));
jest.mock('../../src/services/ethereumService');
jest.mock('../../src/services/addressProcessor');
jest.mock('../../src/services/caip10Service');
jest.mock('../../src/services/paymentService');
jest.mock('../../src/services/alchemyService');
jest.mock('../../src/server', () => ({
  broadcast: jest.fn()
}));

const mockNFC = NFC as jest.MockedClass<typeof NFC>;
const mockReader = {
  name: 'Test Reader',
  aid: '',
  on: jest.fn(),
  transmit: jest.fn(),
  close: jest.fn()
} as unknown as jest.Mocked<Reader>;

describe('NFCService', () => {
  let nfcService: NFCService;
  let mockNFCInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup mock NFC instance
    mockNFCInstance = {
      on: jest.fn()
    };
    mockNFC.mockImplementation(() => mockNFCInstance);

    // Setup service dependencies
    (EthereumService.isEthereumAddress as jest.Mock).mockReturnValue(true);
    (EthereumService.normalizeEthereumAddress as jest.Mock).mockImplementation((addr) => addr);
    (CAIP10Service.isCAIP10Address as jest.Mock).mockReturnValue(false);
    (AddressProcessor.canProcessAddress as jest.Mock).mockReturnValue(true);
    (AddressProcessor.startProcessing as jest.Mock).mockImplementation(() => {});
    (AddressProcessor.finishProcessing as jest.Mock).mockImplementation(() => {});
    (PaymentService.createNDEFUriRecord as jest.Mock).mockReturnValue(Buffer.from('test'));
    (PaymentService.calculateAndSendPayment as jest.Mock).mockResolvedValue({ success: true });
    (AlchemyService.fetchMultiChainBalances as jest.Mock).mockResolvedValue({
      allTokens: [{ address: '0x123', balance: '1000000000000000000', chainId: 1 }]
    });

    nfcService = new NFCService();
  });

  afterEach(() => {
    if (nfcService) {
      nfcService.stopListening();
    }
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Constructor and Setup', () => {
    it('should create NFC instance and setup event handlers', () => {
      expect(mockNFC).toHaveBeenCalled();
      expect(mockNFCInstance.on).toHaveBeenCalledWith('reader', expect.any(Function));
    });

    it('should setup reader events when reader is detected', () => {
      // Simulate reader detection
      const readerCallback = mockNFCInstance.on.mock.calls[0][1];
      readerCallback(mockReader);

      expect(mockReader.on).toHaveBeenCalledWith('card', expect.any(Function));
      expect(mockReader.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockReader.on).toHaveBeenCalledWith('end', expect.any(Function));
    });
  });

  describe('Payment Operations', () => {
    beforeEach(() => {
      // Setup reader detection
      const readerCallback = mockNFCInstance.on.mock.calls[0][1];
      readerCallback(mockReader);
    });

    it('should arm for payment and await tap', async () => {
      const amount = 25.50;
      const paymentPromise = nfcService.armForPaymentAndAwaitTap(amount);

      // Verify service is armed
      expect(nfcService['paymentArmed']).toBe(true);
      expect(nfcService['currentPaymentAmount']).toBe(amount);

      // Simulate card tap with successful response
      const cardCallback = mockReader.on.mock.calls.find((call: any) => call[0] === 'card')?.[1];
      mockReader.transmit.mockResolvedValue(Buffer.from('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7'));

      if (cardCallback) {
        await cardCallback({ type: 'card', standard: 'T4T' });
      }

      // Run any pending timers to handle async operations
      jest.runOnlyPendingTimers();
      await Promise.resolve(); // Flush microtasks

      const result = await paymentPromise;
      expect(result.success).toBe(true);
      expect(result.message).toContain('Payment request for $25.50 sent to');
    });

    it('should handle payment card detection and ignore', async () => {
      const amount = 25.50;
      nfcService.armForPaymentAndAwaitTap(amount);

      // Simulate payment card error
      const errorCallback = mockReader.on.mock.calls.find((call: any) => call[0] === 'error')?.[1];
      const paymentCardError = new Error('Cannot process ISO 14443-4 tag');

      if (errorCallback) {
        errorCallback(paymentCardError);
      }

      // Should not throw and should continue monitoring
      expect(mockReader.transmit).not.toHaveBeenCalled();
    });

    it('should handle reader errors', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const amount = 25.50;
      nfcService.armForPaymentAndAwaitTap(amount);

      // Simulate reader error
      const errorCallback = mockReader.on.mock.calls.find((call: any) => call[0] === 'error')?.[1];
      const readerError = new Error('Reader communication error');

      if (errorCallback) {
        errorCallback(readerError);
      }

      // Run any pending timers to handle async operations
      jest.runOnlyPendingTimers();
      await Promise.resolve(); // Flush microtasks

      // Should log error but not throw
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should handle reader disconnection', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      // Setup reader detection first
      const readerCallback = mockNFCInstance.on.mock.calls[0][1];
      readerCallback(mockReader);
      
      // Simulate reader disconnection
      const endCallback = mockReader.on.mock.calls.find((call: any) => call[0] === 'end')?.[1];
      
      if (endCallback) {
        endCallback();
      }

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Reader disconnected:'), expect.any(String));
      logSpy.mockRestore();
    });
  });

  describe('Wallet Scanning', () => {
    beforeEach(() => {
      // Setup reader detection
      const readerCallback = mockNFCInstance.on.mock.calls[0][1];
      readerCallback(mockReader);
    });

    it('should scan for wallet address', async () => {
      const scanPromise = nfcService.scanForWalletAddress();

      // Verify service is armed for wallet scan
      expect(nfcService['walletScanArmed']).toBe(true);

      // Simulate card tap with wallet address
      const cardCallback = mockReader.on.mock.calls.find((call: any) => call[0] === 'card')?.[1];
      mockReader.transmit.mockResolvedValue(Buffer.from('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7'));

      if (cardCallback) {
        await cardCallback({ type: 'card', standard: 'T4T' });
      }

      // Run any pending timers to handle async operations
      jest.runOnlyPendingTimers();
      await Promise.resolve(); // Flush microtasks

      const result = await scanPromise;
      expect(result.success).toBe(true);
      expect(result.address).toBe('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
    });

    it('should handle CAIP-10 addresses', async () => {
      (CAIP10Service.isCAIP10Address as jest.Mock).mockReturnValue(true);
      (CAIP10Service.parseCAIP10Address as jest.Mock).mockReturnValue({ namespace: 'eip155', chainId: 1 });
      (CAIP10Service.extractEthereumAddress as jest.Mock).mockReturnValue('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');

      const scanPromise = nfcService.scanForWalletAddress();

      // Simulate card tap with CAIP-10 address
      const cardCallback = mockReader.on.mock.calls.find((call: any) => call[0] === 'card')?.[1];
      mockReader.transmit.mockResolvedValue(Buffer.from('eip155:1:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7'));

      if (cardCallback) {
        await cardCallback({ type: 'card', standard: 'T4T' });
      }

      // Run any pending timers to handle async operations
      jest.runOnlyPendingTimers();
      await Promise.resolve(); // Flush microtasks

      const result = await scanPromise;
      expect(result.success).toBe(true);
      expect(result.address).toBe('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Setup reader detection
      const readerCallback = mockNFCInstance.on.mock.calls[0][1];
      readerCallback(mockReader);
    });

    it('should handle transmission errors', async () => {
      const amount = 25.50;
      const paymentPromise = nfcService.armForPaymentAndAwaitTap(amount);

      // Simulate transmission error
      const cardCallback = mockReader.on.mock.calls.find((call: any) => call[0] === 'card')?.[1];
      mockReader.transmit.mockRejectedValue(new Error('Transmission failed'));

      if (cardCallback) {
        await cardCallback({ type: 'card', standard: 'T4T' });
      }

      // Run any pending timers to handle async operations
      jest.runOnlyPendingTimers();
      await Promise.resolve(); // Flush microtasks

      const result = await paymentPromise;
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('CARD_ERROR');
    });

    it('should handle empty response from device', async () => {
      const amount = 25.50;
      const paymentPromise = nfcService.armForPaymentAndAwaitTap(amount);

      // Simulate empty response
      const cardCallback = mockReader.on.mock.calls.find((call: any) => call[0] === 'card')?.[1];
      mockReader.transmit.mockResolvedValue(Buffer.alloc(0));

      if (cardCallback) {
        await cardCallback({ type: 'card', standard: 'T4T' });
      }

      // Run any pending timers to handle async operations
      jest.runOnlyPendingTimers();
      await Promise.resolve(); // Flush microtasks

      const result = await paymentPromise;
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('CARD_ERROR');
    });

    it('should handle duplicate address processing', async () => {
      (AddressProcessor.canProcessAddress as jest.Mock).mockReturnValue(false);
      (AddressProcessor.getProcessingBlockReason as jest.Mock).mockReturnValue('Address already being processed');

      const amount = 25.50;
      const paymentPromise = nfcService.armForPaymentAndAwaitTap(amount);

      // Simulate card tap
      const cardCallback = mockReader.on.mock.calls.find((call: any) => call[0] === 'card')?.[1];
      mockReader.transmit.mockResolvedValue(Buffer.from('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7'));

      if (cardCallback) {
        await cardCallback({ type: 'card', standard: 'T4T' });
      }

      // Run any pending timers to handle async operations
      jest.runOnlyPendingTimers();
      await Promise.resolve(); // Flush microtasks

      const result = await paymentPromise;
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('DUPLICATE_ADDRESS');
    });
  });

  describe('Service Lifecycle', () => {
    it('should start listening', () => {
      nfcService.startListening();
      // Verify no errors are thrown
      expect(true).toBe(true);
    });

    it('should cancel current operation', () => {
      const amount = 25.50;
      nfcService.armForPaymentAndAwaitTap(amount);

      nfcService.cancelCurrentOperation();

      expect(nfcService['paymentArmed']).toBe(false);
      expect(nfcService['walletScanArmed']).toBe(false);
      expect(nfcService['currentPaymentAmount']).toBeNull();
    });

    it('should stop listening', () => {
      nfcService.stopListening();
      // Verify no errors are thrown
      expect(true).toBe(true);
    });
  });

  describe('Instance Management', () => {
    it('should track multiple instances', () => {
      const service1 = new NFCService();
      const service2 = new NFCService();
      
      // Instance IDs should be sequential but we can't predict exact values due to global counter
      expect(service1['instanceId']).toBeGreaterThan(0);
      expect(service2['instanceId']).toBeGreaterThan(service1['instanceId']);
      
      service1.stopListening();
      service2.stopListening();
    });
  });
}); 