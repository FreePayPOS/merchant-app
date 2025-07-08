declare module 'nfc-pcsc' {
  export interface Reader {
    name: string;
    protocols: number[];
    aid?: string; // Added to match usage in nfcService
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    transmit(data: Buffer, maxResponseLength: number): Promise<Buffer>;
    on(event: string, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string): this;
  }

  export class NFC {
    constructor();
    on(event: string, listener: (...args: any[]) => void): this;
    start(): void;
    stop(): void;
  }
}
  