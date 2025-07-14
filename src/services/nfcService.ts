import { NFC, Reader } from 'nfc-pcsc';
import { AID } from '../config/index.js';
import { CardData } from '../types/index.js';
import { EthereumService } from './ethereumService.js';
import { AddressProcessor } from './addressProcessor.js';
import { AlchemyService } from './alchemyService.js';
import { PaymentService } from './paymentService.js';
import { CAIP10Service } from './caip10Service.js';
import { broadcast } from '../utils/broadcast.js';

/**
 * Service for handling NFC reader operations
 */
export class NFCService {
  private nfc: NFC;
  private paymentArmed: boolean = false;
  private walletScanArmed: boolean = false;
  private currentPaymentAmount: number | null = null;
  private cardHandlerPromise: Promise<{ success: boolean; message: string; errorType?: string; paymentInfo?: any }> | null = null;
  private cardHandlerResolve: ((result: { success: boolean; message: string; errorType?: string; paymentInfo?: any }) => void) | null = null;
  private walletScanPromise: Promise<{ success: boolean; message: string; address?: string; errorType?: string }> | null = null;
  private walletScanResolve: ((result: { success: boolean; message: string; address?: string; errorType?: string }) => void) | null = null;
  
  // Add instance tracking
  private static instanceCount = 0;
  private instanceId: number;

  constructor() {
    NFCService.instanceCount++;
    this.instanceId = NFCService.instanceCount;
    console.log(`🏗️ DEBUG: Creating NFCService instance #${this.instanceId} (total instances: ${NFCService.instanceCount})`);
    
    this.nfc = new NFC();
    this.setupNFC();
  }

  /**
   * Setup NFC readers and event handlers
   */
  private setupNFC(): void {
    console.log(`🔧 DEBUG: Instance #${this.instanceId} - Setting up NFC readers`);
    this.nfc.on('reader', (reader: Reader) => {
      console.log(`💳 Instance #${this.instanceId} - NFC Reader Detected:`, reader.name);
      reader.aid = AID; // ★ IMPORTANT ★ Set AID immediately
      console.log(`🔑 Instance #${this.instanceId} - AID set for reader:`, AID);
      broadcast({ type: 'nfc_status', message: `Reader connected: ${reader.name}`});
      this.setupReaderEvents(reader);
    });
  }

  /**
   * Setup event handlers for a specific reader
   */
  private setupReaderEvents(reader: Reader): void {
    console.log(`🔧 DEBUG: Instance #${this.instanceId} - Setting up event handlers for reader: ${reader.name}`);
    
    // Use arrow functions to preserve 'this' context
    (reader as any).on('card', async (card: CardData) => {
      console.log(`🔧 DEBUG: Instance #${this.instanceId} - Card event handler called, this.paymentArmed = ${this.paymentArmed}`);
      await this.handleCard(reader, card);
    });

    (reader as any).on('error', (err: Error) => {
      if (err.message.includes('Cannot process ISO 14443-4 tag')) {
        console.log(`💳 Instance #${this.instanceId} - Payment card detected - ignoring tap`);
        broadcast({ type: 'nfc_status', message: 'Payment card detected - not supported' });
        return;
      }
      console.error(`❌ Instance #${this.instanceId} - Reader error:`, err);
    });

    (reader as any).on('end', () => {
      console.log(`🔌 Instance #${this.instanceId} - Reader disconnected:`, reader.name);
      broadcast({ type: 'nfc_status', message: `Reader disconnected: ${reader.name}` });
    });
  }

  /**
   * Handle card detection and processing
   */
  private async handleCard(reader: Reader, card: CardData): Promise<void> {
    console.log(`🔧 DEBUG: Instance #${this.instanceId} - Card event handler called, this.paymentArmed = ${this.paymentArmed}`);
    console.log('📱 Card Detected:', {
      type: card.type,
      standard: card.standard
    });

    // Debug: Log current armed state when card is detected
    console.log(`🔍 DEBUG: Instance #${this.instanceId} - Armed state check - paymentArmed: ${this.paymentArmed}, walletScanArmed: ${this.walletScanArmed}`);
    console.log(`🔍 DEBUG: Instance #${this.instanceId} - Current payment amount: ${this.currentPaymentAmount}`);
    console.log(`🔍 DEBUG: Instance #${this.instanceId} - Card handler resolve exists: ${!!this.cardHandlerResolve}`);

    if (!this.paymentArmed && !this.walletScanArmed) {
      console.log(`💤 Instance #${this.instanceId} - Reader not armed for payment or wallet scan, ignoring tap`);
      broadcast({ type: 'nfc_status', message: 'Reader not armed' });
      return;
    }

    let processedAddress: string | null = null;

    try {
      // Always send wallet:address command as NDEF URI to get the wallet address
      const walletUri = 'wallet:address';
      console.log(`📡 Sending NDEF URI: ${walletUri}`);
      
      // Use PaymentService's createNDEFUriRecord to format the URI
      const ndefMessage = PaymentService.createNDEFUriRecord(walletUri);
      
      // @ts-expect-error Argument of type '{}' is not assignable to parameter of type 'never'.
      const resp = await reader.transmit(ndefMessage, 256, {});
      
      // Check if we got a valid response
      if (!resp || resp.length === 0) {
        throw new Error('No response from device');
      }
      
      const phoneResponse = resp.toString();
      console.log('📱 Phone says →', phoneResponse);
      
      // Check if this is a CAIP-10 address or regular Ethereum address
      let ethAddress: string | null = null;
      
      if (CAIP10Service.isCAIP10Address(phoneResponse)) {
        // Extract Ethereum address from CAIP-10 format
        ethAddress = CAIP10Service.extractEthereumAddress(phoneResponse);
        if (ethAddress) {
          console.log(`✓ Extracted Ethereum address from CAIP-10: ${ethAddress}`);
          processedAddress = ethAddress;
        }
      } else if (EthereumService.isEthereumAddress(phoneResponse)) {
        // Handle legacy plain Ethereum address format
        ethAddress = EthereumService.normalizeEthereumAddress(phoneResponse);
        processedAddress = ethAddress;
      }
      
      if (this.walletScanArmed) {
        await this.processWalletScan(phoneResponse, reader);
      } else if (this.paymentArmed && this.currentPaymentAmount !== null) {
        await this.processPhoneResponse(phoneResponse, reader, this.currentPaymentAmount);
      }
      
    } catch (e) {
      console.error('❌ Error processing card:', e);
      
      // Clean up any address that might be stuck in processing state
      if (processedAddress) {
        AddressProcessor.finishProcessing(processedAddress);
      }
      
      if (this.cardHandlerResolve) {
        this.cardHandlerResolve({ success: false, message: 'Error processing card', errorType: 'CARD_ERROR' });
        this.cardHandlerResolve = null;
      }
    }
    // Note: Do NOT close the reader here - it needs to stay connected for future card detections
  }

  /**
   * Process the response from the phone
   */
  private async processPhoneResponse(phoneResponse: string, reader: Reader, amount: number): Promise<void> {
    let ethAddress: string | null = null;
    let chainId: number = 1; // Default to Ethereum mainnet
    
    // Check if this is a CAIP-10 address or regular Ethereum address
    if (CAIP10Service.isCAIP10Address(phoneResponse)) {
      const parsed = CAIP10Service.parseCAIP10Address(phoneResponse);
      if (parsed && parsed.namespace === 'eip155') {
        ethAddress = CAIP10Service.extractEthereumAddress(phoneResponse);
        chainId = parsed.chainId || 1;
        console.log(`✓ Detected CAIP-10 Ethereum address: ${ethAddress} on chain ${chainId}`);
      }
    } else if (EthereumService.isEthereumAddress(phoneResponse)) {
      // Handle legacy plain Ethereum address format
      ethAddress = EthereumService.normalizeEthereumAddress(phoneResponse);
      console.log(`✓ Detected Ethereum address: ${ethAddress}`);
    }
    
    if (ethAddress) {
      const transactionFlowStart = Date.now();
      console.log(`⏱️ [PROFILE] Starting transaction flow for $${amount} payment`);
      
      // Check if the address can be processed
      if (!AddressProcessor.canProcessAddress(ethAddress)) {
        const blockReason = AddressProcessor.getProcessingBlockReason(ethAddress);
        console.log(`🚫 Address ${ethAddress} cannot be processed: ${blockReason}`);
        if (this.cardHandlerResolve) {
          this.cardHandlerResolve({ success: false, message: blockReason || 'Address cannot be processed', errorType: 'DUPLICATE_ADDRESS' });
          this.cardHandlerResolve = null;
        }
        return;
      }
      
      // Mark the address as being processed
      console.log(`🔄 Starting to process address: ${ethAddress}`);
      AddressProcessor.startProcessing(ethAddress);
      
      let paymentSuccessful = false;
      
      try {
        // Update UI to show loading tokens
        broadcast({ type: 'status', message: 'Loading tokens...' });
        
        let portfolio;
        try {
          // Fetch balances from Alchemy API across all supported chains
          const balanceFetchStart = Date.now();
          portfolio = await AlchemyService.fetchMultiChainBalances(ethAddress);
          const balanceFetchTime = Date.now() - balanceFetchStart;
          console.log(`⏱️ [PROFILE] Total balance fetch time: ${balanceFetchTime}ms`);
        } catch (fetchError: any) {
          console.error('💥 Error fetching tokens from Alchemy:', fetchError);
          throw new Error('FAILED_TO_FETCH_TOKENS');
        }
        
        // Calculate and send payment request using all tokens across all chains
        const paymentStart = Date.now();
        const paymentInfo = await PaymentService.calculateAndSendPayment(portfolio.allTokens, reader, amount);
        const paymentTime = Date.now() - paymentStart;
        console.log(`⏱️ [PROFILE] Total payment processing time: ${paymentTime}ms`);
        
        // Update UI to show waiting for payment
        broadcast({ type: 'status', message: 'Waiting for payment...' });
        
        paymentSuccessful = true; // Payment request was sent successfully
        
        const totalTransactionTime = Date.now() - transactionFlowStart;
        console.log(`⏱️ [PROFILE] COMPLETE TRANSACTION FLOW: ${totalTransactionTime}ms`);
        console.log(`⏱️ [PROFILE] BREAKDOWN: Balance fetch: ${Date.now() - transactionFlowStart - paymentTime}ms, Payment: ${paymentTime}ms`);
        
        if (this.cardHandlerResolve) {
          this.cardHandlerResolve({ 
            success: true, 
            message: `Payment request for $${amount.toFixed(2)} sent to ${ethAddress}`,
            paymentInfo
          });
          this.cardHandlerResolve = null;
        }
        
      } catch (balanceError: any) {
        console.error('💥 Error processing address balances/payment:', balanceError);
        console.log(`🧹 Cleaning up address ${ethAddress} due to error: ${balanceError.message}`);
        
        if (balanceError.message === 'PHONE_MOVED_TOO_QUICKLY') {
          // For phone moved too quickly, just broadcast the error but keep waiting for another tap
          console.log('📱💨 Phone moved too quickly - broadcasting error but staying armed for retry');
          broadcast({ 
            type: 'payment_failure', 
            message: 'Phone moved too quickly', 
            errorType: 'PHONE_MOVED_TOO_QUICKLY' 
          });
          
          // Don't resolve the promise - keep waiting for another tap
          // Just clean up the current address processing
          AddressProcessor.finishProcessing(ethAddress);
          return; // Exit without resolving the promise
        }
        
        paymentSuccessful = false;
        
        if (this.cardHandlerResolve) {
          // Check for specific error types and handle them appropriately
          let errorMessage: string;
          let errorType: string;
          
          if (balanceError.message === 'FAILED_TO_FETCH_TOKENS') {
            errorMessage = 'Failed to fetch tokens';
            errorType = 'TOKEN_FETCH_ERROR';
          } else if (balanceError.message === "Customer doesn't have enough funds") {
            errorMessage = balanceError.message;
            errorType = 'PAYMENT_ERROR';
          } else {
            errorMessage = 'Error processing payment';
            errorType = 'PAYMENT_ERROR';
          }
          
          this.cardHandlerResolve({ success: false, message: errorMessage, errorType: errorType });
          this.cardHandlerResolve = null;
        }
      } finally {
        // Mark the address processing as complete
        console.log(`🏁 Finishing processing for address: ${ethAddress} (successful: ${paymentSuccessful})`);
        
        // No more cooldown - just finish processing for all cases
        if (ethAddress) {
          AddressProcessor.finishProcessing(ethAddress);
        }
      }
    } else {
      console.log('📱 Response is not a valid Ethereum address');
      if (this.cardHandlerResolve) {
        this.cardHandlerResolve({ success: false, message: 'Invalid or non-Ethereum address', errorType: 'INVALID_ADDRESS' });
        this.cardHandlerResolve = null;
      }
    }
  }

  /**
   * Start the NFC service
   */
  public startListening(): void {
    console.log('🟢 NFCService: Starting to listen for readers...');
    console.log('📡 NFC Service is now listening for readers.');
  }

  /**
   * Arm the service for payment and wait for a card tap
   */
  public async armForPaymentAndAwaitTap(amount: number): Promise<{ success: boolean; message: string; errorType?: string; paymentInfo?: any }> {
    console.log(`🔧 DEBUG: Instance #${this.instanceId} - Arming payment service for $${amount.toFixed(2)}`);
    
    // Clean up any leftover state from previous sessions
    if (this.paymentArmed || this.cardHandlerResolve || this.cardHandlerPromise) {
      console.log(`⚠️ WARNING: Instance #${this.instanceId} - Found leftover payment state, cleaning up...`);
      console.log(`🔍 Previous state - paymentArmed: ${this.paymentArmed}, cardHandlerResolve: ${!!this.cardHandlerResolve}, cardHandlerPromise: ${!!this.cardHandlerPromise}`);
      this.disarmPayment();
    }
    
    this.paymentArmed = true;
    this.currentPaymentAmount = amount;
    console.log(`💰 NFCService: Instance #${this.instanceId} - Armed for payment of $${amount.toFixed(2)}. Waiting for tap...`);
    console.log(`🔍 DEBUG: Instance #${this.instanceId} - After arming - paymentArmed: ${this.paymentArmed}, amount: ${this.currentPaymentAmount}`);
    
    // Debug: Show current address processing state
    AddressProcessor.debugState();
    
    // Create a promise that will be resolved when a card is processed
    this.cardHandlerPromise = new Promise((resolve) => {
      this.cardHandlerResolve = resolve;
    });

    // Set a timeout for the payment (30 seconds)
    const timeoutId = setTimeout(() => {
      console.log(`⏰ DEBUG: Payment timeout reached, disarming...`);
      if (this.cardHandlerResolve) {
        this.cardHandlerResolve({ success: false, message: 'Payment timeout', errorType: 'TIMEOUT' });
        this.cardHandlerResolve = null;
      }
      this.disarmPayment();
    }, 30000);

    try {
      const result = await this.cardHandlerPromise;
      console.log(`🔧 DEBUG: Card handler promise resolved, clearing timeout and disarming`);
      clearTimeout(timeoutId);
      this.disarmPayment();
      return result;
    } catch (_error) {
      console.log(`🔧 DEBUG: Card handler promise error, clearing timeout and disarming`);
      clearTimeout(timeoutId);
      this.disarmPayment();
      return { success: false, message: 'Payment processing error', errorType: 'PROCESSING_ERROR' };
    }
  }

  /**
   * Disarm the payment service
   */
  private disarmPayment(): void {
    console.log(`🔧 DEBUG: Instance #${this.instanceId} - disarmPayment() called - was armed: ${this.paymentArmed}`);
    this.paymentArmed = false;
    this.currentPaymentAmount = null;
    this.cardHandlerPromise = null;
    this.cardHandlerResolve = null;
    
    // Clean up any stuck address processing states when disarming
    // This is a safety measure to ensure addresses don't stay locked
    console.log(`🧹 Instance #${this.instanceId} - Cleaning up any stuck address processing states...`);
    AddressProcessor.clearAllProcessing();
  }

  /**
   * Process wallet address scan response
   */
  private async processWalletScan(phoneResponse: string, _reader: Reader): Promise<void> {
    let ethAddress: string | null = null;
    let chainId: number | undefined;
    
    // Check if this is a CAIP-10 address or regular Ethereum address
    if (CAIP10Service.isCAIP10Address(phoneResponse)) {
      const parsed = CAIP10Service.parseCAIP10Address(phoneResponse);
      if (parsed && parsed.namespace === 'eip155') {
        ethAddress = CAIP10Service.extractEthereumAddress(phoneResponse);
        chainId = parsed.chainId;
        console.log(`✓ Wallet CAIP-10 address scanned: ${phoneResponse}`);
        console.log(`  → Ethereum address: ${ethAddress} on chain ${chainId}`);
      } else {
        console.log(`⚠️ Non-Ethereum CAIP-10 address: ${phoneResponse}`);
      }
    } else if (EthereumService.isEthereumAddress(phoneResponse)) {
      // Handle legacy plain Ethereum address format
      ethAddress = EthereumService.normalizeEthereumAddress(phoneResponse);
      console.log(`✓ Wallet address scanned: ${ethAddress}`);
    }
    
    if (ethAddress) {
      if (this.walletScanResolve) {
        this.walletScanResolve({ 
          success: true, 
          message: `Wallet scanned successfully`,
          address: ethAddress
        });
        this.walletScanResolve = null;
      }
    } else {
      console.log('📱 Response is not a valid Ethereum address');
      if (this.walletScanResolve) {
        this.walletScanResolve({ 
          success: false, 
          message: 'Invalid or non-Ethereum address', 
          errorType: 'INVALID_ADDRESS' 
        });
        this.walletScanResolve = null;
      }
    }
  }

  /**
   * Scan for wallet address (for transaction history filtering)
   */
  public async scanForWalletAddress(): Promise<{ success: boolean; message: string; address?: string; errorType?: string }> {
    this.walletScanArmed = true;
    console.log('🔍 NFCService: Armed for wallet address scan. Waiting for tap...');
    
    // Create a promise that will be resolved when a wallet is scanned
    this.walletScanPromise = new Promise((resolve) => {
      this.walletScanResolve = resolve;
    });

    // Set a timeout for the scan (30 seconds)
    const timeoutId = setTimeout(() => {
      if (this.walletScanResolve) {
        this.walletScanResolve({ success: false, message: 'Wallet scan timeout', errorType: 'TIMEOUT' });
        this.walletScanResolve = null;
      }
      this.disarmWalletScan();
    }, 30000);

    try {
      const result = await this.walletScanPromise;
      clearTimeout(timeoutId);
      this.disarmWalletScan();
      return result;
    } catch (_error) {
      clearTimeout(timeoutId);
      this.disarmWalletScan();
      return { success: false, message: 'Wallet scan processing error', errorType: 'PROCESSING_ERROR' };
    }
  }

  /**
   * Disarm the wallet scan service
   */
  private disarmWalletScan(): void {
    this.walletScanArmed = false;
    this.walletScanPromise = null;
    this.walletScanResolve = null;
  }

  /**
   * Cancel any ongoing operations (payment or wallet scan)
   */
  public cancelCurrentOperation(): void {
    console.log('🚫 Cancelling current NFC operation...');
    console.log(`🔧 DEBUG: cancelCurrentOperation() - paymentArmed: ${this.paymentArmed}, walletScanArmed: ${this.walletScanArmed}`);
    
    // Cancel payment operation if active
    if (this.paymentArmed && this.cardHandlerResolve) {
      console.log('🚫 Cancelling ongoing payment operation');
      this.cardHandlerResolve({ 
        success: false, 
        message: 'Payment cancelled by user', 
        errorType: 'USER_CANCELLED' 
      });
      this.cardHandlerResolve = null;
      this.disarmPayment();
    }
    
    // Cancel wallet scan operation if active
    if (this.walletScanArmed && this.walletScanResolve) {
      console.log('🚫 Cancelling ongoing wallet scan operation');
      this.walletScanResolve({ 
        success: false, 
        message: 'Wallet scan cancelled by user', 
        errorType: 'USER_CANCELLED' 
      });
      this.walletScanResolve = null;
      this.disarmWalletScan();
    }
    
    // Clean up any stuck address processing states
    AddressProcessor.clearAllProcessing();
    
    console.log('✅ NFC operation cancelled successfully');
  }

  /**
   * Stop the NFC service
   */
  public stopListening(): void {
    console.log('🔴 NFCService: Stopping listeners...');
    // Add any cleanup logic here if needed
  }
}