import { AddressProcessor } from '../../src/services/addressProcessor';

describe('AddressProcessor', () => {
  beforeEach(() => {
    // Clear processing state before each test
    AddressProcessor.clearAllProcessing();
  });

  afterEach(() => {
    // Clean up after each test
    AddressProcessor.clearAllProcessing();
  });

  describe('canProcessAddress', () => {
    it('should return true for new addresses', () => {
      expect(AddressProcessor.canProcessAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')).toBe(true);
      expect(AddressProcessor.canProcessAddress('0x1234567890123456789012345678901234567890')).toBe(true);
    });

    it('should return false for addresses already being processed', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      // Start processing
      AddressProcessor.startProcessing(address);
      
      // Should not be able to process again
      expect(AddressProcessor.canProcessAddress(address)).toBe(false);
    });

    it('should be case insensitive', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const upperAddress = '0X742D35CC6634C0532925A3B8D4C9DB96C4B4D8B6';
      
      AddressProcessor.startProcessing(address);
      
      expect(AddressProcessor.canProcessAddress(upperAddress)).toBe(false);
    });
  });

  describe('getProcessingBlockReason', () => {
    it('should return null for new addresses', () => {
      expect(AddressProcessor.getProcessingBlockReason('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')).toBeNull();
    });

    it('should return reason for addresses being processed', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      AddressProcessor.startProcessing(address);
      
      expect(AddressProcessor.getProcessingBlockReason(address)).toBe('Address is already being processed');
    });
  });

  describe('startProcessing', () => {
    it('should mark address as being processed', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      expect(AddressProcessor.canProcessAddress(address)).toBe(true);
      
      AddressProcessor.startProcessing(address);
      
      expect(AddressProcessor.canProcessAddress(address)).toBe(false);
    });

    it('should handle multiple addresses', () => {
      const address1 = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const address2 = '0x1234567890123456789012345678901234567890';
      
      AddressProcessor.startProcessing(address1);
      AddressProcessor.startProcessing(address2);
      
      expect(AddressProcessor.canProcessAddress(address1)).toBe(false);
      expect(AddressProcessor.canProcessAddress(address2)).toBe(false);
    });
  });

  describe('finishProcessing', () => {
    it('should remove address from processing state', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      AddressProcessor.startProcessing(address);
      expect(AddressProcessor.canProcessAddress(address)).toBe(false);
      
      AddressProcessor.finishProcessing(address);
      expect(AddressProcessor.canProcessAddress(address)).toBe(true);
    });

    it('should handle finishing non-processing addresses gracefully', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      // Should not throw error
      expect(() => AddressProcessor.finishProcessing(address)).not.toThrow();
      expect(AddressProcessor.canProcessAddress(address)).toBe(true);
    });
  });

  describe('clearAllProcessing', () => {
    it('should clear all processing states', () => {
      const address1 = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      const address2 = '0x1234567890123456789012345678901234567890';
      
      AddressProcessor.startProcessing(address1);
      AddressProcessor.startProcessing(address2);
      
      expect(AddressProcessor.canProcessAddress(address1)).toBe(false);
      expect(AddressProcessor.canProcessAddress(address2)).toBe(false);
      
      AddressProcessor.clearAllProcessing();
      
      expect(AddressProcessor.canProcessAddress(address1)).toBe(true);
      expect(AddressProcessor.canProcessAddress(address2)).toBe(true);
    });

    it('should handle clearing when no addresses are processing', () => {
      expect(() => AddressProcessor.clearAllProcessing()).not.toThrow();
    });
  });

  describe('debugState', () => {
    it('should not throw when called', () => {
      expect(() => AddressProcessor.debugState()).not.toThrow();
    });

    it('should show current processing state', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      AddressProcessor.startProcessing(address);
      expect(() => AddressProcessor.debugState()).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete processing lifecycle', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      // Initial state
      expect(AddressProcessor.canProcessAddress(address)).toBe(true);
      expect(AddressProcessor.getProcessingBlockReason(address)).toBeNull();
      
      // Start processing
      AddressProcessor.startProcessing(address);
      expect(AddressProcessor.canProcessAddress(address)).toBe(false);
      expect(AddressProcessor.getProcessingBlockReason(address)).toBe('Address is already being processed');
      
      // Finish processing
      AddressProcessor.finishProcessing(address);
      expect(AddressProcessor.canProcessAddress(address)).toBe(true);
      expect(AddressProcessor.getProcessingBlockReason(address)).toBeNull();
    });

    it('should handle concurrent processing attempts', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      // First attempt
      expect(AddressProcessor.canProcessAddress(address)).toBe(true);
      AddressProcessor.startProcessing(address);
      
      // Second attempt (should be blocked)
      expect(AddressProcessor.canProcessAddress(address)).toBe(false);
      expect(AddressProcessor.getProcessingBlockReason(address)).toBe('Address is already being processed');
      
      // Finish first attempt
      AddressProcessor.finishProcessing(address);
      
      // Third attempt (should work again)
      expect(AddressProcessor.canProcessAddress(address)).toBe(true);
    });
  });
}); 