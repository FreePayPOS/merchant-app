/**
 * Mock for WebSocket library
 * Prevents real WebSocket connections during testing
 */

export class WebSocket {
  public url: string;
  public readyState: number = 0; // CONNECTING
  public onopen: ((event: any) => void) | null = null;
  public onmessage: ((event: any) => void) | null = null;
  public onerror: ((event: any) => void) | null = null;
  public onclose: ((event: any) => void) | null = null;
  public send: (data: string | Buffer) => void;
  public close: (code?: number, reason?: string) => void;

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    
    // Mock send method
    this.send = jest.fn();
    
    // Mock close method
    this.close = jest.fn((code = 1000, reason = '') => {
      this.readyState = WebSocket.CLOSED;
      if (this.onclose) {
        this.onclose({ code, reason });
      }
    });

    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen({});
      }
    }, 10);
  }

  // Mock event listener methods
  addEventListener(event: string, listener: (...args: any[]) => void): void {
    switch (event) {
      case 'open':
        this.onopen = listener;
        break;
      case 'message':
        this.onmessage = listener;
        break;
      case 'error':
        this.onerror = listener;
        break;
      case 'close':
        this.onclose = listener;
        break;
    }
  }

  removeEventListener(_event: string, _listener: (...args: any[]) => void): void {
    // Mock cleanup
  }

  // Mock message sending
  mockMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  // Mock error
  mockError(error: any): void {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

export default WebSocket; 