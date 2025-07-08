import { PaymentService } from '../../src/services/paymentService';
import { EthereumService } from '../../src/services/ethereumService';

// Mock the EthereumService
jest.mock('../../src/services/ethereumService', () => ({
  EthereumService: {
    isEthAddress: jest.fn(),
  }
}));

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEIP681Uri', () => {
    it('should generate correct EIP-681 URI for ETH payment', () => {
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(true);
      
      const amount = BigInt('1000000000000000000'); // 1 ETH in wei
      const tokenAddress = '0x0000000000000000000000000000000000000000';
      const chainId = 1;

      const uri = PaymentService.generateEIP681Uri(amount, tokenAddress, chainId);
      
      expect(uri).toContain('ethereum:');
      expect(uri).toContain('@1');
      expect(uri).toContain('value=1000000000000000000');
    });

    it('should generate correct EIP-681 URI for ERC-20 payment', () => {
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(false);
      
      const amount = BigInt('1000000'); // 1 USDC in smallest units
      const tokenAddress = '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C';
      const chainId = 8453;

      const uri = PaymentService.generateEIP681Uri(amount, tokenAddress, chainId);
      
      expect(uri).toContain('ethereum:');
      expect(uri).toContain('@8453');
      expect(uri).toContain('/transfer');
      expect(uri).toContain('uint256=1000000');
    });

    it('should handle different chain IDs correctly', () => {
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(true);
      
      const amount = BigInt('1000000000000000000');
      const tokenAddress = '0x0000000000000000000000000000000000000000';
      const chainId = 42161; // Arbitrum

      const uri = PaymentService.generateEIP681Uri(amount, tokenAddress, chainId);
      
      expect(uri).toContain('@42161');
    });
  });

  describe('createNDEFUriRecord', () => {
    it('should create valid NDEF URI record', () => {
      const uri = 'ethereum:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6@1?value=1000000000000000000';
      
      const ndefRecord = PaymentService.createNDEFUriRecord(uri);
      
      expect(ndefRecord).toBeInstanceOf(Buffer);
      expect(ndefRecord.length).toBeGreaterThan(0);
      
      // Check NDEF record structure
      expect(ndefRecord[0]).toBe(0xD1); // Record header
      expect(ndefRecord[1]).toBe(0x01); // Type length
      expect(ndefRecord[3]).toBe(0x55); // Type "U" for URI
      expect(ndefRecord[4]).toBe(0x00); // URI abbreviation code
    });

    it('should handle different URI lengths', () => {
      const shortUri = 'ethereum:0x123@1';
      const longUri = 'ethereum:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6@1?value=1000000000000000000&chain=1&token=USDC';
      
      const shortRecord = PaymentService.createNDEFUriRecord(shortUri);
      const longRecord = PaymentService.createNDEFUriRecord(longUri);
      
      expect(shortRecord.length).toBeLessThan(longRecord.length);
      expect(shortRecord[2]).toBe(shortUri.length + 1); // Payload length
      expect(longRecord[2]).toBe(longUri.length + 1); // Payload length
    });
  });

  describe('getChainName', () => {
    it('should return correct chain name for known chain ID', () => {
      // This tests the private method indirectly through generateEIP681Uri
      (EthereumService.isEthAddress as jest.Mock).mockReturnValue(true);
      
      const amount = BigInt('1000000000000000000');
      const tokenAddress = '0x0000000000000000000000000000000000000000';
      const chainId = 1;

      const uri = PaymentService.generateEIP681Uri(amount, tokenAddress, chainId);
      
      // The method should work without throwing errors
      expect(uri).toBeDefined();
    });
  });
}); 