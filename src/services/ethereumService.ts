/**
 * Ethereum utility service for address validation and normalization
 */
export class EthereumService {
  /**
   * Check if a string is a valid Ethereum address (40 hex characters)
   */
  static isEthereumAddress(str: string): boolean {
    // Remove any whitespace and convert to lowercase
    const cleaned = str.trim().toLowerCase();
    
    // Check if it's exactly 40 hex characters (optionally with 0x prefix)
    const hexPattern = /^(0x)?[0-9a-f]{40}$/;
    return hexPattern.test(cleaned);
  }

  /**
   * Normalize Ethereum address (ensure it starts with 0x)
   */
  static normalizeEthereumAddress(address: string): string {
    const cleaned = address.trim().toLowerCase();
    return cleaned.startsWith('0x') ? cleaned : `0x${cleaned}`;
  }

  /**
   * Check if an address is the ETH placeholder address
   */
  static isEthAddress(address: string): boolean {
    return address.trim().toLowerCase() === '0x0000000000000000000000000000000000000000';
  }
} 