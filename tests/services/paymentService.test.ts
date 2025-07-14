import { PaymentService } from '../../src/services/paymentService';
import { TokenWithPrice } from '../../src/types/index';
import { Reader } from 'nfc-pcsc';
import { EthereumService } from '../../src/services/ethereumService';

// Mock dependencies
jest.mock('nfc-pcsc', () => ({
  Reader: jest.fn()
}));

jest.mock('../../src/config/index', () => ({
  RECIPIENT_ADDRESS: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
  SUPPORTED_CHAINS: [
    { id: 1, name: 'ethereum', displayName: 'Ethereum' },
    { id: 137, name: 'polygon', displayName: 'Polygon' },
    { id: 8453, name: 'base', displayName: 'Base' },
    { id: 42161, name: 'arbitrum', displayName: 'Arbitrum' },
    { id: 10, name: 'optimism', displayName: 'Optimism' },
  ]
}));

jest.mock('../../src/services/ethereumService');

describe('PaymentService', () => {
  let mockReader: jest.Mocked<Reader>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReader = {
      name: 'Test Reader',
      aid: '',
      on: jest.fn(),
      transmit: jest.fn(),
      close: jest.fn()
    } as unknown as jest.Mocked<Reader>;

    // Setup default mocks
    (EthereumService.isEthAddress as jest.Mock).mockReturnValue(false);
  });

  describe('getChainName', () => {
    it('should return chain name for supported chains', () => {
      const result = (PaymentService as any).getChainName(1);
      expect(result).toBe('Ethereum');
    });

    it('should return fallback for unsupported chains', () => {
      const result = (PaymentService as any).getChainName(999);
      expect(result).toBe('Chain 999');
    });
  });

  describe('generateEIP681Uri', () => {
    it('should generate ETH payment URI with chain ID', () => {
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(true);

      const result = PaymentService.generateEIP681Uri(
        BigInt('1000000000000000000'), // 1 ETH
        '0x0000000000000000000000000000000000000000', // ETH address
        1 // Ethereum mainnet
      );

      expect(result).toBe('ethereum:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7@1?value=1000000000000000000');
    });

    it('should generate ERC-20 token payment URI with chain ID', () => {
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(false);

      const result = PaymentService.generateEIP681Uri(
        BigInt('1000000'), // 1 USDC (6 decimals)
        '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C8', // USDC contract
        1 // Ethereum mainnet
      );

      expect(result).toBe('ethereum:0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C8@1/transfer?address=0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7&uint256=1000000');
    });

    it('should handle different chain IDs', () => {
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(true);

      const result = PaymentService.generateEIP681Uri(
        BigInt('1000000000000000000'),
        '0x0000000000000000000000000000000000000000',
        137 // Polygon
      );

      expect(result).toBe('ethereum:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7@137?value=1000000000000000000');
    });
  });

  describe('createNDEFUriRecord', () => {
    it('should create valid NDEF URI record', () => {
      const uri = 'ethereum:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7@1?value=1000000000000000000';
      const result = PaymentService.createNDEFUriRecord(uri);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Check NDEF structure
      expect(result[0]).toBe(0xD1); // Record header
      expect(result[1]).toBe(0x01); // Type length
      expect(result[2]).toBe(uri.length + 1); // Payload length (URI + abbreviation byte)
      expect(result[3]).toBe(0x55); // Type 'U' in ASCII
      expect(result[4]).toBe(0x00); // URI abbreviation code
    });

    it('should handle different URI types', () => {
      const uri = 'https://example.com';
      const result = PaymentService.createNDEFUriRecord(uri);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty URI', () => {
      const uri = '';
      const result = PaymentService.createNDEFUriRecord(uri);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBe(5); // Header + type + length + type byte + abbreviation (no URI bytes)
    });
  });

  describe('sendPaymentRequest', () => {
    it('should send ETH payment request successfully', async () => {
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(true);
      
      mockReader.transmit.mockResolvedValue(Buffer.from('success'));

      await PaymentService.sendPaymentRequest(
        mockReader,
        BigInt('1000000000000000000'),
        '0x0000000000000000000000000000000000000000',
        18,
        1
      );

      expect(mockReader.transmit).toHaveBeenCalled();
      expect(mockReader.transmit.mock.calls[0][0]).toBeInstanceOf(Buffer);
    });

    it('should send ERC-20 payment request successfully', async () => {
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(false);
      
      mockReader.transmit.mockResolvedValue(Buffer.from('success'));

      await PaymentService.sendPaymentRequest(
        mockReader,
        BigInt('1000000'),
        '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C8',
        6,
        1
      );

      expect(mockReader.transmit).toHaveBeenCalled();
    });

    it('should handle phone moved too quickly error', async () => {
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(true);
      
      const error = new Error('An error occurred while transmitting');
      (error as any).code = 'failure';
      mockReader.transmit.mockRejectedValue(error);

      await expect(PaymentService.sendPaymentRequest(
        mockReader,
        BigInt('1000000000000000000'),
        '0x0000000000000000000000000000000000000000',
        18,
        1
      )).rejects.toThrow('PHONE_MOVED_TOO_QUICKLY');
    });

    it('should handle other transmission errors', async () => {
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(true);
      
      const error = new Error('Generic error');
      mockReader.transmit.mockRejectedValue(error);

      await expect(PaymentService.sendPaymentRequest(
        mockReader,
        BigInt('1000000000000000000'),
        '0x0000000000000000000000000000000000000000',
        18,
        1
      )).rejects.toThrow('Generic error');
    });

    it('should handle no response from device', async () => {
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(true);
      
      mockReader.transmit.mockResolvedValue(Buffer.alloc(0));

      await PaymentService.sendPaymentRequest(
        mockReader,
        BigInt('1000000000000000000'),
        '0x0000000000000000000000000000000000000000',
        18,
        1
      );

      expect(mockReader.transmit).toHaveBeenCalled();
    });
  });

  describe('calculateAndSendPayment', () => {
    const mockTokens: TokenWithPrice[] = [
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
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        balance: 1000000000000000000,
        valueUSD: 2500.00,
        priceUSD: 2500.00,
        chainId: 1,
        chainName: 'ethereum',
        chainDisplayName: 'Ethereum',
        isNativeToken: true
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C8',
        decimals: 6,
        balance: 1000000,
        valueUSD: 1.00,
        priceUSD: 1.00,
        chainId: 8453,
        chainName: 'base',
        chainDisplayName: 'Base',
        isNativeToken: false
      }
    ];

    beforeEach(() => {
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(false);
      mockReader.transmit.mockResolvedValue(Buffer.from('success'));
    });

    it('should calculate and send payment successfully', async () => {
      const result = await PaymentService.calculateAndSendPayment(mockTokens, mockReader, 0.50);

      expect(result.selectedToken.symbol).toBe('USDC');
      expect(result.requiredAmount).toBe(BigInt('500000')); // 0.5 USDC in smallest units
      expect(result.chainId).toBe(8453); // Should prefer L2 stablecoin
      expect(result.chainName).toBe('Base');
      expect(mockReader.transmit).toHaveBeenCalled();
    });

    it('should throw error when no tokens have sufficient balance', async () => {
      const lowBalanceTokens = mockTokens.map(token => ({
        ...token,
        valueUSD: 0.10 // All tokens have low balance
      }));

      await expect(PaymentService.calculateAndSendPayment(lowBalanceTokens, mockReader, 0.50))
        .rejects.toThrow('Customer doesn\'t have enough funds');
    });

    it('should throw error when no tokens have valid prices', async () => {
      const noPriceTokens = mockTokens.map(token => ({
        ...token,
        priceUSD: 0 // No valid prices
      }));

      await expect(PaymentService.calculateAndSendPayment(noPriceTokens, mockReader, 0.50))
        .rejects.toThrow('Customer doesn\'t have enough funds');
    });

    it('should prefer L2 stablecoins over L1 tokens', async () => {
      const result = await PaymentService.calculateAndSendPayment(mockTokens, mockReader, 0.50);

      expect(result.chainId).toBe(8453); // Base (L2) over Ethereum (L1)
      expect(result.selectedToken.symbol).toBe('USDC');
    });

    it('should handle transmission errors during payment', async () => {
      const error = new Error('Transmission failed');
      mockReader.transmit.mockRejectedValue(error);

      await expect(PaymentService.calculateAndSendPayment(mockTokens, mockReader, 0.50))
        .rejects.toThrow('Transmission failed');
    });

    it('should handle empty token list', async () => {
      await expect(PaymentService.calculateAndSendPayment([], mockReader, 0.50))
        .rejects.toThrow('Customer doesn\'t have enough funds');
    });

    it('should handle zero target USD amount', async () => {
      const result = await PaymentService.calculateAndSendPayment(mockTokens, mockReader, 0);

      expect(result.requiredAmount).toBe(BigInt('0'));
      expect(mockReader.transmit).toHaveBeenCalled();
    });
  });

  describe('selectBestPaymentToken', () => {
    it('should prioritize L2 stablecoins', () => {
      const tokens: TokenWithPrice[] = [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C8',
          decimals: 6,
          balance: 1000000,
          valueUSD: 1.00,
          priceUSD: 1.00,
          chainId: 8453, // L2
          chainName: 'base',
          chainDisplayName: 'Base',
          isNativeToken: false
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          balance: 1000000000000000000,
          valueUSD: 2500.00,
          priceUSD: 2500.00,
          chainId: 1, // L1
          chainName: 'ethereum',
          chainDisplayName: 'Ethereum',
          isNativeToken: true
        }
      ];

      const result = (PaymentService as any).selectBestPaymentToken(tokens);

      expect(result.symbol).toBe('USDC');
      expect(result.chainId).toBe(8453); // Should select L2 stablecoin
    });

    it('should fall back to L1 when no L2 tokens available', () => {
      const tokens: TokenWithPrice[] = [
        {
          symbol: 'ETH',
          name: 'Ethereum',
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          balance: 1000000000000000000,
          valueUSD: 2500.00,
          priceUSD: 2500.00,
          chainId: 1, // L1 only
          chainName: 'ethereum',
          chainDisplayName: 'Ethereum',
          isNativeToken: true
        }
      ];

      const result = (PaymentService as any).selectBestPaymentToken(tokens);

      expect(result.symbol).toBe('ETH');
      expect(result.chainId).toBe(1);
    });

    it('should handle single token', () => {
      const tokens: TokenWithPrice[] = [
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
      ];

      const result = (PaymentService as any).selectBestPaymentToken(tokens);

      expect(result.symbol).toBe('USDC');
    });
  });

  describe('Error Handling', () => {
    it('should handle reader transmission errors gracefully', async () => {
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(true);
      
      const error = new Error('SCardTransmit error');
      (error as any).code = 'failure';
      (error as any).previous = { message: 'SCardTransmit error' };
      mockReader.transmit.mockRejectedValue(error);

      await expect(PaymentService.sendPaymentRequest(
        mockReader,
        BigInt('1000000000000000000'),
        '0x0000000000000000000000000000000000000000',
        18,
        1
      )).rejects.toThrow('PHONE_MOVED_TOO_QUICKLY');
    });

    it('should handle different error message formats', async () => {
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(true);
      
      const error = new Error('Transaction failed');
      (error as any).code = 'failure';
      (error as any).previous = { message: 'Transaction failed' };
      mockReader.transmit.mockRejectedValue(error);

      await expect(PaymentService.sendPaymentRequest(
        mockReader,
        BigInt('1000000000000000000'),
        '0x0000000000000000000000000000000000000000',
        18,
        1
      )).rejects.toThrow('PHONE_MOVED_TOO_QUICKLY');
    });
  });
}); 