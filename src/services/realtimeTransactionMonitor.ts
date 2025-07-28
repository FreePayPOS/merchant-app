import WebSocket from 'ws';
import { Alchemy, Network, Utils, AssetTransfersResult, AssetTransfersCategory, SortingOrder } from 'alchemy-sdk';
import { MERCHANT_ADDRESS, config, getWebSocketUrl, getAlchemyNetwork, getChainById } from '../config/index.js';

interface PaymentSession {
  recipientAddress: string;
  expectedAmount: bigint;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  merchantUSD: number;
  chainId: number;
  chainName: string;
  onPaymentReceived: (txHash: string, tokenSymbol: string, tokenAddress: string, decimals: number) => void;
  onError: (error: string) => void;
}

interface PendingTransaction {
  hash: string;
  to: string;
  value: string;
  input: string;
  blockNumber?: string;
}

export class RealtimeTransactionMonitor {
  private static currentSession: PaymentSession | null = null;
  private static wsConnection: WebSocket | null = null;
  private static alchemyClients: Map<number, Alchemy> = new Map();
  private static reconnectAttempts = 0;
  private static readonly MAX_RECONNECT_ATTEMPTS = 5;
  private static readonly RECONNECT_DELAY = 2000; // 2 seconds
  private static fallbackInterval: NodeJS.Timeout | null = null;
  private static readonly FALLBACK_POLLING_INTERVAL = 5000; // 5 seconds as fallback

  /**
   * Start real-time monitoring for a specific payment using WebSockets
   */
  static async startMonitoring(
    recipientAddress: string,
    tokenAddress: string,
    expectedAmount: bigint,
    tokenSymbol: string,
    tokenDecimals: number,
    merchantUSD: number,
    chainId: number,
    chainName: string,
    callback: (txHash: string, tokenSymbol: string, tokenAddress: string, decimals: number) => void,
    errorCallback: (error: string) => void
  ): Promise<void> {
    console.log(`\n🚀 STARTING REAL-TIME PAYMENT MONITORING`);
    console.log(`💰 Merchant amount: $${merchantUSD.toFixed(2)} USD`);
    console.log(`💳 Expected token: ${tokenSymbol}`);
    console.log(`🔢 Expected amount: ${expectedAmount.toString()} smallest units`);
    console.log(`📊 Display amount: ${Number(expectedAmount) / Math.pow(10, tokenDecimals)} ${tokenSymbol}`);
    console.log(`⛓️  Chain: ${chainName} (ID: ${chainId})`);
    console.log(`🏠 Recipient: ${recipientAddress}`);
    console.log(`📄 Token contract: ${tokenAddress}`);

    // Store the monitoring session
    this.currentSession = {
      recipientAddress,
      expectedAmount,
      tokenAddress,
      tokenSymbol,
      tokenDecimals,
      merchantUSD,
      chainId,
      chainName,
      onPaymentReceived: callback,
      onError: errorCallback
    };

    // Try to establish WebSocket connection first
    try {
      await this.connectWebSocket(chainId);
      console.log(`✅ Real-time monitoring started via WebSocket`);
    } catch (error) {
      console.warn(`⚠️  WebSocket connection failed, falling back to polling:`, error);
      this.startFallbackPolling();
    }
  }

  /**
   * Establish WebSocket connection to Alchemy
   */
  private static async connectWebSocket(chainId: number): Promise<void> {
    const wsUrl = getWebSocketUrl(chainId);
    if (!wsUrl) {
      throw new Error(`No WebSocket URL available for chain ${chainId}`);
    }

    console.log(`🔌 [WS DEBUG] Attempting to connect to: ${wsUrl}`);

    return new Promise((resolve, reject) => {
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.on('open', () => {
        console.log(`🔌 [WS DEBUG] WebSocket CONNECTED successfully to Alchemy`);
        console.log(`🔌 [WS DEBUG] Connection state: ${this.wsConnection?.readyState} (1=OPEN)`);
        this.reconnectAttempts = 0;
        
        // Subscribe to pending transactions to our recipient address
        this.subscribeToPendingTransactions();
        
        // Also subscribe to new blocks as a backup
        this.subscribeToNewBlocks();
        
        resolve();
      });

      this.wsConnection.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ [WS DEBUG] Error parsing WebSocket message:', error);
          console.error('❌ [WS DEBUG] Raw data:', data.toString());
        }
      });

      this.wsConnection.on('error', (error) => {
        console.error('❌ [WS DEBUG] WebSocket ERROR:', error);
        console.error('❌ [WS DEBUG] Error details:', {
          message: error.message,
          code: (error as any).code,
          type: (error as any).type
        });
        reject(error);
      });

      this.wsConnection.on('close', (code, reason) => {
        console.log(`🔌 [WS DEBUG] WebSocket connection CLOSED`);
        console.log(`🔌 [WS DEBUG] Close code: ${code}, reason: ${reason}`);
        console.log(`🔌 [WS DEBUG] Active session exists: ${!!this.currentSession}`);
        console.log(`🔌 [WS DEBUG] Reconnect attempts: ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
        this.wsConnection = null;
        
        // Only attempt reconnection if we have an active session
        if (this.currentSession && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          console.log(`🔄 [WS DEBUG] Scheduling reconnection in ${this.RECONNECT_DELAY}ms`);
          setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`🔄 [WS DEBUG] Attempting WebSocket reconnection (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
            this.connectWebSocket(this.currentSession!.chainId).catch((reconnectError) => {
              console.error(`❌ [WS DEBUG] Reconnection attempt ${this.reconnectAttempts} failed:`, reconnectError);
              if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
                console.warn('⚠️ [WS DEBUG] Max reconnection attempts reached, falling back to polling');
                this.startFallbackPolling();
              }
            });
          }, this.RECONNECT_DELAY);
        } else {
          console.log(`🛑 [WS DEBUG] Not attempting reconnection (session: ${!!this.currentSession}, attempts: ${this.reconnectAttempts})`);
        }
      });

      // Set connection timeout
      setTimeout(() => {
        if (this.wsConnection?.readyState !== WebSocket.OPEN) {
          console.error(`⏰ [WS DEBUG] WebSocket connection timeout after 10 seconds`);
          console.error(`⏰ [WS DEBUG] Connection state: ${this.wsConnection?.readyState}`);
          this.wsConnection?.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000); // 10 second timeout
    });
  }

  /**
   * Subscribe to pending transactions filtered by recipient address
   */
  private static subscribeToPendingTransactions(): void {
    if (!this.wsConnection || !this.currentSession) {
      console.error(`❌ [WS DEBUG] Cannot subscribe - wsConnection: ${!!this.wsConnection}, currentSession: ${!!this.currentSession}`);
      return;
    }

    // Check if chain supports alchemy_pendingTransactions
    // This method is NOT supported on Ethereum mainnet, but works on L2s and sidechains
    const chainsNotSupportingPendingTx = [1]; // Ethereum mainnet doesn't support it
    
    if (chainsNotSupportingPendingTx.includes(this.currentSession.chainId)) {
      console.log(`⚠️ [WS DEBUG] Chain ${this.currentSession.chainId} doesn't support alchemy_pendingTransactions`);
      console.log(`📡 [WS DEBUG] Will rely on new block detection for transaction monitoring`);
      return;
    }

    // First subscription: alchemy_pendingTransactions (mainly for ETH transfers)
    const pendingTxSubscription = {
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_pendingTransactions",
      params: [{
        toAddress: this.currentSession.recipientAddress,
        category: ["erc20", "external"]
      }]
    };

    console.log(`📡 [WS DEBUG] Subscribing to pending transactions for ${this.currentSession.recipientAddress}`);
    console.log(`📡 [WS DEBUG] Subscription payload:`, JSON.stringify(pendingTxSubscription, null, 2));
    
    try {
      this.wsConnection.send(JSON.stringify(pendingTxSubscription));
      console.log(`✅ [WS DEBUG] Pending transaction subscription sent successfully`);
    } catch (error) {
      console.error(`❌ [WS DEBUG] Failed to send pending transaction subscription:`, error);
    }

    // For ERC-20 tokens, we'll rely on checking blocks when they arrive
    // because ERC-20 transfers have the token contract as 'to' address, not the recipient
    console.log(`📡 [WS DEBUG] Note: ERC-20 transfers will be detected when new blocks arrive`);
  }

  /**
   * Subscribe to new blocks for confirmation monitoring
   */
  private static subscribeToNewBlocks(): void {
    if (!this.wsConnection) {
      console.error(`❌ [WS DEBUG] Cannot subscribe to new blocks - no WebSocket connection`);
      return;
    }

    const subscription = {
      jsonrpc: "2.0",
      id: 2,
      method: "eth_subscribe",
      params: ["newHeads"]
    };

    console.log(`📡 [WS DEBUG] Subscribing to new blocks for confirmation tracking`);
    console.log(`📡 [WS DEBUG] Block subscription payload:`, JSON.stringify(subscription, null, 2));
    
    try {
      this.wsConnection.send(JSON.stringify(subscription));
      console.log(`✅ [WS DEBUG] New blocks subscription sent successfully`);
    } catch (error) {
      console.error(`❌ [WS DEBUG] Failed to send new blocks subscription:`, error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private static handleWebSocketMessage(message: any): void {
    console.log(`🔍 [WS DEBUG] Processing WebSocket message - type: ${message.method || 'response'}`);
    
    if (!this.currentSession) {
      console.warn(`⚠️ [WS DEBUG] Received message but no active session - ignoring`);
      return;
    }

    // Handle subscription confirmations
    if (message.id && message.result) {
      console.log(`✅ [WS DEBUG] Subscription confirmed for ID ${message.id}: ${message.result}`);
      
      // Log what this subscription is for
      if (message.id === 1) {
        console.log(`✅ [WS DEBUG] Pending transactions subscription active`);
      } else if (message.id === 2) {
        console.log(`✅ [WS DEBUG] New blocks subscription active`);
      }
      return;
    }

    // Handle subscription errors
    if (message.id && message.error) {
      console.error(`❌ [WS DEBUG] Subscription error for ID ${message.id}:`, message.error);
      
      // If alchemy_pendingTransactions is not supported, that's OK - we'll rely on block monitoring
      if (message.id === 1 && message.error.message?.includes('alchemy_pendingTransactions')) {
        console.log(`ℹ️ [WS DEBUG] This chain doesn't support pending transaction subscriptions`);
        console.log(`ℹ️ [WS DEBUG] Will monitor transactions when blocks are mined instead`);
      }
      
      return;
    }

    // Handle pending transaction notifications
    if (message.method === "alchemy_pendingTransactions" && message.params?.result) {
      const tx: PendingTransaction = message.params.result;
      console.log(`📥 [WS DEBUG] PENDING TRANSACTION DETECTED: ${tx.hash}`);
      console.log(`📥 [WS DEBUG] Transaction details:`, {
        hash: tx.hash,
        to: tx.to,
        value: tx.value,
        input: tx.input?.substring(0, 20) + '...' // Truncate input for readability
      });
      console.log(`📥 [WS DEBUG] Expected recipient: ${this.currentSession.recipientAddress}`);
      console.log(`📥 [WS DEBUG] Expected token: ${this.currentSession.tokenSymbol} (${this.currentSession.tokenAddress})`);
      console.log(`📥 [WS DEBUG] Expected amount: ${this.currentSession.expectedAmount.toString()}`);
      
      this.processPendingTransaction(tx);
      return;
    }

    // Handle new block notifications - check for transfers in the new block
    if (message.method === "eth_subscription" && message.params?.result?.number) {
      const blockNumber = parseInt(message.params.result.number, 16);
      console.log(`🧱 [WS DEBUG] New block: ${blockNumber}`);
      console.log(`🧱 [WS DEBUG] Checking for transfers in block ${blockNumber}`);
      
      // Check for transfers in this new block
      this.checkBlockForTransfers(blockNumber);
      return;
    }

    // Handle unrecognized messages
    console.warn(`⚠️ [WS DEBUG] Unrecognized message format:`, {
      method: message.method,
      hasId: !!message.id,
      hasResult: !!message.result,
      hasError: !!message.error,
      hasParams: !!message.params
    });
  }

  /**
   * Check a specific block for transfers to our merchant address
   */
  private static async checkBlockForTransfers(blockNumber: number): Promise<void> {
    if (!this.currentSession) {
      console.log(`❌ [WS DEBUG] No active session for block checking`);
      return;
    }

    // Store session data locally to avoid null reference if session is cleared during async operations
    const session = this.currentSession;
    const chainId = session.chainId;
    const recipientAddress = session.recipientAddress;

    const alchemy = this.getAlchemyClient(chainId);
    if (!alchemy) {
      console.log(`❌ [WS DEBUG] No Alchemy client for block checking`);
      return;
    }

    // For chains without pending transaction support, check more aggressively
    const chainsNotSupportingPendingTx = [1]; // Ethereum mainnet
    const needsAggressiveChecking = chainsNotSupportingPendingTx.includes(chainId);
    
    if (needsAggressiveChecking) {
      console.log(`🔍 [WS DEBUG] Chain ${chainId} needs aggressive block checking`);
    }

    // Add a shorter delay for chains that need aggressive checking
    const delay = needsAggressiveChecking ? 1000 : 2000;
    console.log(`⏳ [WS DEBUG] Waiting ${delay}ms for block ${blockNumber} to be fully processed...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Check again if session still exists after the delay
    if (!this.currentSession) {
      console.log(`⚠️ [WS DEBUG] Session cancelled during block processing`);
      return;
    }

    try {
      console.log(`🔍 [WS DEBUG] Fetching transfers in recent blocks to ${recipientAddress}`);
      
      // For chains without pending tx support, check last 5 blocks to catch any recent transactions
      const blocksToCheck = needsAggressiveChecking ? 5 : 2;
      const safeFromBlock = Math.max(0, blockNumber - blocksToCheck);
      const safeToBlock = blockNumber - 1; // Always check up to previous block to avoid "past head"
      
      const transfers = await alchemy.core.getAssetTransfers({
        toAddress: recipientAddress,
        fromBlock: Utils.hexlify(safeFromBlock),
        toBlock: Utils.hexlify(safeToBlock),
        category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
        withMetadata: true,
        order: SortingOrder.DESCENDING // Get newest transfers first
      });

      console.log(`🔍 [WS DEBUG] Found ${transfers.transfers.length} transfers in blocks ${safeFromBlock}-${safeToBlock}`);
      
      // Process each transfer
      for (const transfer of transfers.transfers) {
        // Check if session still exists before processing
        if (!this.currentSession) {
          console.log(`⚠️ [WS DEBUG] Session cancelled during transfer processing`);
          return;
        }
        
        console.log(`📥 [WS DEBUG] Transfer found:`, {
          hash: transfer.hash,
          from: transfer.from,
          to: transfer.to,
          value: transfer.value,
          asset: transfer.asset,
          tokenAddress: transfer.rawContract?.address || 'ETH',
          blockNum: transfer.blockNum
        });
        
        await this.processAssetTransfer(transfer);
      }
    } catch (error: any) {
      // If we still get "past head" error, it means we're too close to the chain tip
      if (error.message?.includes('past head')) {
        console.log(`⏳ [WS DEBUG] Block ${blockNumber} still too new, will check in next block`);
      } else {
        console.error(`❌ [WS DEBUG] Error checking blocks for transfers:`, error);
      }
    }
  }

  /**
   * Process a pending transaction to see if it matches our payment
   */
  private static async processPendingTransaction(tx: PendingTransaction): Promise<void> {
    if (!this.currentSession) return;

    const session = this.currentSession;
    
    console.log(`\n📥 PROCESSING PENDING TRANSACTION:`);
    console.log(`🔗 TX Hash: ${tx.hash}`);
    console.log(`📮 To: ${tx.to}`);
    console.log(`💰 Value: ${tx.value}`);

    // For ETH transfers, check value directly
    if (session.tokenAddress.toLowerCase() === session.recipientAddress.toLowerCase()) {
      const transferAmount = BigInt(tx.value || '0');
      if (this.verifyPayment(transferAmount, session.tokenAddress, tx.hash)) {
        return;
      }
    }

    // For ERC-20 transfers, decode the transaction input
    if (tx.input && tx.input.length > 10) {
      const erc20Transfer = this.decodeERC20Transfer(tx.input);
      if (erc20Transfer) {
        const { to, amount } = erc20Transfer;
        if (to.toLowerCase() === session.recipientAddress.toLowerCase()) {
          if (this.verifyPayment(amount, session.tokenAddress, tx.hash)) {
            return;
          }
        }
      }
    }

    // If pending transaction doesn't match, wait for it to be mined and check via API
    console.log(`⏳ Transaction doesn't match in pending state, will verify when mined`);
    this.scheduleTransactionVerification(tx.hash);
  }

  /**
   * Decode ERC-20 transfer function call from transaction input
   */
  private static decodeERC20Transfer(input: string): { to: string; amount: bigint } | null {
    try {
      // ERC-20 transfer function signature: 0xa9059cbb
      if (!input.startsWith('0xa9059cbb')) {
        return null;
      }

      // Remove function signature (first 4 bytes / 8 hex chars)
      const data = input.slice(10);
      
      // Extract recipient address (first 32 bytes, last 20 bytes are the address)
      const toAddress = '0x' + data.slice(24, 64);
      
      // Extract amount (second 32 bytes)
      const amountHex = data.slice(64, 128);
      const amount = BigInt('0x' + amountHex);

      return { to: toAddress, amount };
    } catch (error) {
      console.error('Error decoding ERC-20 transfer:', error);
      return null;
    }
  }

  /**
   * Verify if a payment matches our expected criteria
   */
  private static verifyPayment(amount: bigint, tokenAddress: string, txHash: string): boolean {
    if (!this.currentSession) return false;

    const session = this.currentSession;
    
    console.log(`\n🔍 PAYMENT VERIFICATION:`);
    console.log(`💰 Expected amount: ${session.expectedAmount.toString()}`);
    console.log(`📨 Received amount: ${amount.toString()}`);
    console.log(`🎯 Expected token: ${session.tokenAddress.toLowerCase()}`);
    console.log(`📨 Received token: ${tokenAddress.toLowerCase()}`);

    const tokenMatches = tokenAddress.toLowerCase() === session.tokenAddress.toLowerCase();
    const amountMatches = amount === session.expectedAmount;

    console.log(`✅ Token match: ${tokenMatches ? 'YES' : 'NO'}`);
    console.log(`✅ Amount match: ${amountMatches ? 'YES' : 'NO'}`);

    if (tokenMatches && amountMatches) {
      console.log(`\n🎉 PAYMENT CONFIRMED IN REAL-TIME!`);
      console.log(`💰 Received exactly $${session.merchantUSD.toFixed(2)} USD worth of ${session.tokenSymbol}`);
      console.log(`🔗 Transaction: ${txHash}`);
      
      this.stopMonitoring();
      session.onPaymentReceived(txHash, session.tokenSymbol, session.tokenAddress, session.tokenDecimals);
      return true;
    }

    return false;
  }

  /**
   * Schedule verification of a transaction once it's mined
   */
  private static scheduleTransactionVerification(txHash: string): void {
    setTimeout(async () => {
      if (!this.currentSession) return;
      
      const alchemy = this.getAlchemyClient(this.currentSession.chainId);
      if (!alchemy) return;

      try {
        const receipt = await alchemy.core.getTransactionReceipt(txHash);
        if (receipt) {
          console.log(`✅ Transaction ${txHash} mined, verifying via asset transfers API`);
          await this.verifyMinedTransaction(txHash);
        }
      } catch (error) {
        console.error(`Error verifying mined transaction ${txHash}:`, error);
      }
    }, 15000); // Wait 15 seconds for transaction to be mined
  }

  /**
   * Verify a mined transaction using Alchemy's asset transfers API
   */
  private static async verifyMinedTransaction(txHash: string): Promise<void> {
    if (!this.currentSession) return;

    const alchemy = this.getAlchemyClient(this.currentSession.chainId);
    if (!alchemy) return;

    try {
      const transfers = await alchemy.core.getAssetTransfers({
        toAddress: this.currentSession.recipientAddress,
        category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
        withMetadata: true,
        maxCount: 100
      });

      const matchingTransfer = transfers.transfers.find(t => t.hash === txHash);
      if (matchingTransfer) {
        await this.processAssetTransfer(matchingTransfer);
      }
    } catch (error) {
      console.error('Error verifying mined transaction:', error);
    }
  }

  /**
   * Process asset transfer (similar to existing polling logic)
   */
  private static async processAssetTransfer(transfer: AssetTransfersResult): Promise<void> {
    if (!this.currentSession) return;

    const session = this.currentSession;
    const transferAmount = BigInt(transfer.rawContract?.value || transfer.value || '0');
    const transferTokenAddress = transfer.rawContract?.address?.toLowerCase() || session.recipientAddress.toLowerCase();
    const expectedTokenAddress = session.tokenAddress.toLowerCase();

    const tokenMatches = transferTokenAddress === expectedTokenAddress;
    const amountMatches = transferAmount === session.expectedAmount;

    if (tokenMatches && amountMatches) {
      console.log(`\n🎉 MINED TRANSACTION CONFIRMED!`);
      console.log(`💰 Received exactly $${session.merchantUSD.toFixed(2)} USD worth of ${session.tokenSymbol}`);
      console.log(`🔗 Transaction: ${transfer.hash}`);
      
      this.stopMonitoring();
      session.onPaymentReceived(transfer.hash, session.tokenSymbol, session.tokenAddress, session.tokenDecimals);
    }
  }

  /**
   * Start fallback polling if WebSocket fails
   */
  private static startFallbackPolling(): void {
    if (this.fallbackInterval) {
      console.log(`🔄 [WS DEBUG] Fallback polling already active`);
      return;
    }

    console.log(`🔄 [WS DEBUG] Starting fallback polling every ${this.FALLBACK_POLLING_INTERVAL}ms`);
    console.log(`🔄 [WS DEBUG] WebSocket has failed, using API polling as backup`);
    
    this.fallbackInterval = setInterval(async () => {
      if (!this.currentSession) {
        console.log(`🛑 [WS DEBUG] No active session during fallback polling - stopping`);
        if (this.fallbackInterval) {
          clearInterval(this.fallbackInterval);
          this.fallbackInterval = null;
        }
        return;
      }

      // Store session data locally to avoid null reference if session is cleared during async operations
      const session = this.currentSession;
      const chainId = session.chainId;
      const recipientAddress = session.recipientAddress;

      const alchemy = this.getAlchemyClient(chainId);
      if (!alchemy) {
        console.error(`❌ [WS DEBUG] No Alchemy client available for fallback polling`);
        return;
      }

      try {
        console.log(`🔄 [WS DEBUG] Polling for transactions to ${recipientAddress}`);
        const transfers = await alchemy.core.getAssetTransfers({
          toAddress: recipientAddress,
          category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
          withMetadata: true,
          maxCount: 10
        });

        console.log(`🔄 [WS DEBUG] Found ${transfers.transfers.length} recent transfers in polling`);
        for (const transfer of transfers.transfers) {
          // Check if session still exists before processing
          if (!this.currentSession) {
            console.log(`⚠️ [WS DEBUG] Session cancelled during polling transfer processing`);
            return;
          }
          await this.processAssetTransfer(transfer);
        }
      } catch (error) {
        console.error('❌ [WS DEBUG] Error during fallback polling:', error);
      }
    }, this.FALLBACK_POLLING_INTERVAL);
  }

  /**
   * Stop all monitoring (WebSocket and fallback polling)
   */
  static stopMonitoring(): void {
    console.log('\n🛑 [WS DEBUG] Stopping real-time payment monitoring...');
    console.log(`🛑 [WS DEBUG] Current state - WS: ${!!this.wsConnection}, Polling: ${!!this.fallbackInterval}, Session: ${!!this.currentSession}`);
    
    // Clear session FIRST to prevent reconnection attempts
    this.currentSession = null;
    this.reconnectAttempts = 0;
    
    if (this.wsConnection) {
      console.log(`🛑 [WS DEBUG] Closing WebSocket connection (state: ${this.wsConnection.readyState})`);
      // Remove all listeners before closing to prevent any callbacks
      this.wsConnection.removeAllListeners();
      this.wsConnection.close();
      this.wsConnection = null;
    }
    
    if (this.fallbackInterval) {
      console.log(`🛑 [WS DEBUG] Stopping fallback polling interval`);
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
    
    console.log('✅ [WS DEBUG] Real-time monitoring stopped completely');
  }


  /**
   * Get or create Alchemy client for a specific chain
   */
  private static getAlchemyClient(chainId: number): Alchemy | null {
    if (this.alchemyClients.has(chainId)) {
      return this.alchemyClients.get(chainId)!;
    }

    const network = getAlchemyNetwork(chainId);
    if (!network || !config.ALCHEMY_API_KEY) {
      return null;
    }

    const alchemy = new Alchemy({
      apiKey: config.ALCHEMY_API_KEY,
      network: network,
    });
    
    this.alchemyClients.set(chainId, alchemy);
    return alchemy;
  }

  /**
   * Check if currently monitoring
   */
  static isMonitoring(): boolean {
    return this.currentSession !== null;
  }

  /**
   * Get current session info
   */
  static getCurrentSession(): PaymentSession | null {
    return this.currentSession;
  }
}