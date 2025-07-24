/**
 * Mock for nfc-pcsc library
 * Prevents real NFC hardware calls during testing
 */

export class Reader {
  public name: string;
  public connected: boolean = false;
  public card: any = null;

  constructor(name: string) {
    this.name = name;
  }

  connect(): Promise<void> {
    this.connected = true;
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    this.connected = false;
    return Promise.resolve();
  }

  transmit(_data: Buffer, _maxLength: number): Promise<Buffer> {
    // Mock NFC response - simulate wallet address
    const mockResponse = Buffer.from([
      0x90, 0x00, // Status OK
      // Mock wallet address: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
      0x37, 0x34, 0x32, 0x64, 0x33, 0x35, 0x43, 0x63, 0x36, 0x36, 0x33, 0x34, 0x43, 0x30, 0x35, 0x33, 0x32, 0x39, 0x32, 0x35, 0x61, 0x33, 0x62, 0x38, 0x44, 0x34, 0x43, 0x39, 0x64, 0x62, 0x39, 0x36, 0x43, 0x34, 0x62, 0x34, 0x64, 0x38, 0x62, 0x36
    ]);
    return Promise.resolve(mockResponse);
  }

  on(event: string, callback: (...args: any[]) => void): void {
    // Mock event handling
    if (event === 'card') {
      // Simulate card detection after a short delay
      setTimeout(() => {
        this.card = { uid: 'mock-card-uid' };
        callback(this.card);
      }, 100);
    }
  }

  removeAllListeners(): void {
    // Mock cleanup
  }
}

export class Card {
  public uid: string;

  constructor(uid: string) {
    this.uid = uid;
  }

  getUID(): string {
    return this.uid;
  }
}

// Mock the library exports
export default {
  Reader,
  Card,
}; 