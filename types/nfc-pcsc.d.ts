declare module 'nfc-pcsc' {
  export class NFC {
    constructor();
    on(event: string, listener: (...args: any[]) => void): this;
    start(): void;
    stop(): void;
  }

  export class Reader {
    name: string;
    aid?: string;
    constructor(name: string, nfc: NFC);
    on(event: string, listener: (...args: any[]) => void): this;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    transmit(data: Buffer, maxLength?: number): Promise<Buffer>;
  }

  export interface CardData {
    atr: Buffer;
    type: string;
    standard: string;
  }

  export interface ReaderEvent {
    reader: Reader;
    card: CardData;
  }
}
  