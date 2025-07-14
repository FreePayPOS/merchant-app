import { CAIP10Service } from '../../src/services/caip10Service';

describe('CAIP10Service', () => {
  describe('isCAIP10Address', () => {
    it('should identify valid CAIP-10 addresses', () => {
      expect(CAIP10Service.isCAIP10Address('eip155:1:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7')).toBe(true);
      expect(CAIP10Service.isCAIP10Address('eip155:137:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7')).toBe(true);
      expect(CAIP10Service.isCAIP10Address('eip155:10:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7')).toBe(true);
    });

    it('should reject invalid CAIP-10 addresses', () => {
      expect(CAIP10Service.isCAIP10Address('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7')).toBe(false);
      expect(CAIP10Service.isCAIP10Address('invalid:format')).toBe(false);
      expect(CAIP10Service.isCAIP10Address('')).toBe(false);
      expect(CAIP10Service.isCAIP10Address('eip155:1:')).toBe(false);
    });

    it('should accept non-EIP-155 namespaces with valid format', () => {
      expect(CAIP10Service.isCAIP10Address('bip122:000000000019d6689c085ae165831e93:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7')).toBe(true);
    });

    it('should reject addresses with invalid hex format', () => {
      expect(CAIP10Service.isCAIP10Address('eip155:1:0xinvalid')).toBe(false);
      expect(CAIP10Service.isCAIP10Address('eip155:1:0x123')).toBe(false); // Too short
    });
  });

  describe('parseCAIP10Address', () => {
    it('should parse valid CAIP-10 addresses', () => {
      const result = CAIP10Service.parseCAIP10Address('eip155:1:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
      expect(result).toEqual({
        namespace: 'eip155',
        reference: '1',
        address: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        chainId: 1
      });
    });

    it('should parse addresses with different chain IDs', () => {
      const result = CAIP10Service.parseCAIP10Address('eip155:137:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
      expect(result).toEqual({
        namespace: 'eip155',
        reference: '137',
        address: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        chainId: 137
      });
    });

    it('should return null for invalid addresses', () => {
      expect(CAIP10Service.parseCAIP10Address('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7')).toBeNull();
      expect(CAIP10Service.parseCAIP10Address('invalid:format')).toBeNull();
      expect(CAIP10Service.parseCAIP10Address('')).toBeNull();
    });

    it('should parse non-EIP-155 namespaces', () => {
      const result = CAIP10Service.parseCAIP10Address('bip122:000000000019d6689c085ae165831e93:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
      expect(result).toEqual({
        namespace: 'bip122',
        reference: '000000000019d6689c085ae165831e93',
        address: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        chainId: undefined
      });
    });

    it('should handle whitespace', () => {
      const result = CAIP10Service.parseCAIP10Address(' eip155:1:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7 ');
      expect(result?.namespace).toBe('eip155');
      expect(result?.chainId).toBe(1);
    });
  });

  describe('extractEthereumAddress', () => {
    it('should extract Ethereum address from CAIP-10 format', () => {
      const address = CAIP10Service.extractEthereumAddress('eip155:1:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
      expect(address).toBe('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
    });

    it('should add 0x prefix if missing', () => {
      const address = CAIP10Service.extractEthereumAddress('eip155:1:742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
      expect(address).toBe('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
    });

    it('should normalize address to lowercase', () => {
      const address = CAIP10Service.extractEthereumAddress('eip155:1:0x742E31B1B2B3B4B5B6B7B8B9B0B1B2B3B4B5B6B7');
      expect(address).toBe('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
    });

    it('should return null for invalid CAIP-10 addresses', () => {
      expect(CAIP10Service.extractEthereumAddress('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7')).toBeNull();
      expect(CAIP10Service.extractEthereumAddress('invalid:format')).toBeNull();
      expect(CAIP10Service.extractEthereumAddress('')).toBeNull();
    });

    it('should return null for non-EIP-155 namespaces', () => {
      expect(CAIP10Service.extractEthereumAddress('bip122:000000000019d6689c085ae165831e93:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7')).toBeNull();
    });
  });

  describe('toCAIP10Address', () => {
    it('should create CAIP-10 address from components', () => {
      const caip10Address = CAIP10Service.toCAIP10Address('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7', 1);
      expect(caip10Address).toBe('eip155:1:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
    });

    it('should handle different chain IDs', () => {
      const caip10Address = CAIP10Service.toCAIP10Address('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7', 137);
      expect(caip10Address).toBe('eip155:137:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
    });

    it('should handle addresses with different cases', () => {
      const caip10Address = CAIP10Service.toCAIP10Address('0x742E31B1B2B3B4B5B6B7B8B9B0B1B2B3B4B5B6B7', 1);
      expect(caip10Address).toBe('eip155:1:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
    });

    it('should handle addresses without 0x prefix', () => {
      const caip10Address = CAIP10Service.toCAIP10Address('742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7', 1);
      expect(caip10Address).toBe('eip155:1:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
    });

    it('should use default chain ID of 1', () => {
      const caip10Address = CAIP10Service.toCAIP10Address('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
      expect(caip10Address).toBe('eip155:1:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
    });
  });

  describe('parseCAIP10Address chainId extraction', () => {
    it('should extract chain ID from CAIP-10 address', () => {
      const parsed = CAIP10Service.parseCAIP10Address('eip155:1:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
      expect(parsed?.chainId).toBe(1);
    });

    it('should handle different chain IDs', () => {
      const parsed = CAIP10Service.parseCAIP10Address('eip155:137:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
      expect(parsed?.chainId).toBe(137);
    });

    it('should return undefined chainId for invalid addresses', () => {
      const parsed = CAIP10Service.parseCAIP10Address('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
      expect(parsed?.chainId).toBeUndefined();
    });

    it('should return undefined chainId for non-EIP-155 namespaces', () => {
      const parsed = CAIP10Service.parseCAIP10Address('bip122:000000000019d6689c085ae165831e93:0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
      expect(parsed?.chainId).toBeUndefined();
    });
  });
}); 