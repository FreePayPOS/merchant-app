import { EthereumService } from '../../src/services/ethereumService';

describe('EthereumService', () => {
  describe('isEthereumAddress', () => {
    it('should validate correct Ethereum addresses with 0x prefix', () => {
      const validAddresses = [
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6',
        '0x0000000000000000000000000000000000000000',
        '0x1234567890123456789012345678901234567890',
      ];

      validAddresses.forEach(address => {
        expect(EthereumService.isEthereumAddress(address)).toBe(true);
      });
    });

    it('should validate correct Ethereum addresses without 0x prefix', () => {
      const validAddresses = [
        '742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        '742d35cc6634c0532925a3b8d4c9db96c4b4d8b6',
        '0000000000000000000000000000000000000000',
        '1234567890123456789012345678901234567890',
      ];

      validAddresses.forEach(address => {
        expect(EthereumService.isEthereumAddress(address)).toBe(true);
      });
    });

    it('should reject invalid addresses', () => {
      const invalidAddresses = [
        'invalid',
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b', // too short
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6a', // too long
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8bG', // invalid character
        '',
        '   ',
        '0x',
        '0xg',
      ];

      invalidAddresses.forEach(address => {
        expect(EthereumService.isEthereumAddress(address)).toBe(false);
      });
    });

    it('should handle whitespace correctly', () => {
      expect(EthereumService.isEthereumAddress('  0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6  ')).toBe(true);
      expect(EthereumService.isEthereumAddress('  742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6  ')).toBe(true);
    });
  });

  describe('normalizeEthereumAddress', () => {
    it('should add 0x prefix if missing', () => {
      expect(EthereumService.normalizeEthereumAddress('742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'))
        .toBe('0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6');
    });

    it('should keep 0x prefix if present', () => {
      expect(EthereumService.normalizeEthereumAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'))
        .toBe('0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6');
    });

    it('should handle whitespace and convert to lowercase', () => {
      expect(EthereumService.normalizeEthereumAddress('  0X742D35CC6634C0532925A3B8D4C9DB96C4B4D8B6  '))
        .toBe('0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6');
    });
  });

  describe('isEthAddress', () => {
    it('should return true for ETH placeholder address', () => {
      expect(EthereumService.isEthAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    it('should return false for other addresses', () => {
      expect(EthereumService.isEthAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')).toBe(false);
      expect(EthereumService.isEthAddress('0x1234567890123456789012345678901234567890')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(EthereumService.isEthAddress('0X0000000000000000000000000000000000000000')).toBe(true);
    });
  });
}); 