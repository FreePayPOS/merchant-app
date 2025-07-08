declare module 'pcsclite' {
    import { EventEmitter } from 'events';
    interface CardConnectOpts { share_mode: number; protocol: number }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Reader extends EventEmitter {
      name: string;
      state: number;
      SCARD_STATE_PRESENT: number;
      SCARD_SHARE_SHARED: number;
      SCARD_PROTOCOL_T0: number;
      SCARD_PROTOCOL_T1: number;
      SCARD_LEAVE_CARD: number;
      connect(opts: CardConnectOpts, cb: (err: any) => void): void;
      disconnect(disposition: number, cb: (err: any) => void): void;
      transmit(data: Buffer, recvLen: number, protocol: number,
               cb: (err: any, res: Buffer) => void): void;
    }
    const pcsc: () => EventEmitter;  // returns pcsc instance emitting 'reader'
    export = pcsc;
}