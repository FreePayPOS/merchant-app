import { Alchemy, Network, Utils, AssetTransfersResult, AssetTransfersCategory } from 'alchemy-sdk';
import { RECIPIENT_ADDRESS, config } from '../config/index.js';

interface PaymentSession {
  recipientAddress: string;
  expectedAmount: bigint; // Expected amount in smallest units as BigInt
  tokenAddress: string;   // Contract address for ERC-20, or recipient address for ETH
  tokenSymbol: string;
  tokenDecimals: number;
  merchantUSD: number;    // Original USD amount merchant entered
  chainId: number;
  chainName: string;
  onPaymentReceived: (txHash: string, tokenSymbol: string, tokenAddress: string, decimals: number) => void;
  onError: (error: string) => void;
}

export class TransactionMonitoringService {
  private static currentSession: PaymentSession | null = null;
  private static monitoringInterval: NodeJS.Timeout | null = null;
  private static alchemyClients: Map<number, Alchemy> = new Map();
  private static readonly POLLING_INTERVAL = 3000; // 3 seconds
  private static lastCheckedBlock: number = 0;

  /**
   * Start monitoring for a specific payment
   */
  static async startMonitoring(
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
    console.log(`\n🔍 STARTING PAYMENT MONITORING`);
    console.log(`💰 Merchant amount: $${merchantUSD.toFixed(2)} USD`);
    console.log(`💳 Expected token: ${tokenSymbol}`);
    console.log(`🔢 Expected amount: ${expectedAmount.toString()} smallest units`);
    console.log(`📊 Display amount: ${Number(expectedAmount) / Math.pow(10, tokenDecimals)} ${tokenSymbol}`);
    console.log(`⛓️  Chain: ${chainName} (ID: ${chainId})`);
    console.log(`🏠 Recipient: ${RECIPIENT_ADDRESS}`);
    console.log(`📄 Token contract: ${tokenAddress}`);

    // Store the monitoring session
    this.currentSession = {
      recipientAddress: RECIPIENT_ADDRESS,
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

    // Get Alchemy client for this chain
    const alchemy = this.getAlchemyClient(chainId);
    if (!alchemy) {
      console.error(`❌ No Alchemy client available for chain ${chainId}`);
      errorCallback(`Unsupported chain: ${chainName}`);
      return;
    }

    try {
      // Get current block number and set starting point
      const currentBlock = await alchemy.core.getBlockNumber();
      this.lastCheckedBlock = Math.max(0, currentBlock - 2); // Start 2 blocks behind to avoid "past head" errors
      
      console.log(`🔄 Starting monitoring from block ${this.lastCheckedBlock} (current: ${currentBlock})`);
      
      // Start polling
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.checkForPayments();
        } catch (error) {
          console.error('Error during payment monitoring:', error);
        }
      }, this.POLLING_INTERVAL);

      console.log(`✅ Payment monitoring started - polling every ${this.POLLING_INTERVAL}ms`);
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      errorCallback('Failed to start payment monitoring');
    }
  }

  /**
   * Check for payments using Alchemy's Asset Transfers API
   */
  private static async checkForPayments(): Promise<void> {
    if (!this.currentSession) {
      console.log('❌ No active monitoring session');
      return;
    }

    const alchemy = this.getAlchemyClient(this.currentSession.chainId);
    if (!alchemy) {
      console.error(`❌ No Alchemy client for chain ${this.currentSession.chainId}`);
      return;
    }

    try {
      // Get current block number
      const currentBlock = await alchemy.core.getBlockNumber();
      const fromBlock = this.lastCheckedBlock + 1;
      const toBlock = Math.min(currentBlock - 1, fromBlock + 100); // Stay 1 block behind head, check max 100 blocks

      if (fromBlock > toBlock) {
        // No new blocks to check
        return;
      }

      console.log(`🔍 Checking blocks ${fromBlock} to ${toBlock} (current head: ${currentBlock})`);

      // Query asset transfers to our recipient address
      const transfers = await alchemy.core.getAssetTransfers({
        fromBlock: Utils.hexlify(fromBlock),
        toBlock: Utils.hexlify(toBlock),  
        toAddress: this.currentSession.recipientAddress,
        category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20], // Both ETH and ERC-20 token transfers
        withMetadata: true
      });

      // Check each transfer to see if it matches our expected payment
      for (const transfer of transfers.transfers) {
        await this.processTransfer(transfer);
      }

      // Update last checked block
      this.lastCheckedBlock = toBlock;

    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message?.includes('toBlock is past head')) {
          console.log('⚠️  Staying further behind blockchain head to avoid past head errors');
          this.lastCheckedBlock = Math.max(0, this.lastCheckedBlock - 1);
        } else {
          console.error('Error checking for payments:', error);
        }
      } else {
        console.error('Error checking for payments:', error);
      }
    }
  }

  /**
   * Process a single asset transfer to see if it's our expected payment
   */
  private static async processTransfer(transfer: AssetTransfersResult): Promise<void> {
    if (!this.currentSession) return;

    const session = this.currentSession;
    
    console.log(`\n📥 INCOMING TRANSFER:`);
    console.log(`💳 Asset: ${transfer.asset || 'ETH'}`);
    console.log(`💰 Raw value: ${transfer.rawContract?.value || transfer.value || '0'}`);
    console.log(`🔗 TX: ${transfer.hash}`);
    console.log(`📄 Contract: ${transfer.rawContract?.address || 'ETH'}`);

    // Get the raw transfer amount and contract address
    const transferAmount = BigInt(transfer.rawContract?.value || transfer.value || '0');
    const transferTokenAddress = transfer.rawContract?.address?.toLowerCase() || session.recipientAddress.toLowerCase();
    const expectedTokenAddress = session.tokenAddress.toLowerCase();

    console.log(`\n🔍 PAYMENT VERIFICATION:`);
    console.log(`💰 Merchant requested: $${session.merchantUSD.toFixed(2)} USD`);
    console.log(`🎯 Expected token: ${session.tokenSymbol} (${expectedTokenAddress})`);
    console.log(`🎯 Expected amount: ${session.expectedAmount.toString()} smallest units`);
    console.log(`📨 Received token: ${transfer.asset || 'ETH'} (${transferTokenAddress})`);
    console.log(`📨 Received amount: ${transferAmount.toString()} smallest units`);

    // Verify token address matches
    const tokenMatches = transferTokenAddress === expectedTokenAddress;
    console.log(`✅ Token match: ${tokenMatches ? 'YES' : 'NO'}`);

    // Verify exact amount matches using BigInt comparison
    const amountMatches = transferAmount === session.expectedAmount;
    console.log(`✅ Amount match: ${amountMatches ? 'YES' : 'NO'}`);

    if (tokenMatches && amountMatches) {
      console.log(`\n🎉 PAYMENT CONFIRMED!`);
      console.log(`💰 Received exactly $${session.merchantUSD.toFixed(2)} USD worth of ${session.tokenSymbol}`);
      console.log(`🔗 Transaction: ${transfer.hash}`);
      
      // Stop monitoring and trigger success callback
      this.stopMonitoring();
      session.onPaymentReceived(transfer.hash, session.tokenSymbol, session.tokenAddress, session.tokenDecimals);
    } else {
      console.log(`❌ Payment verification failed - continuing to monitor...`);
      
      if (!tokenMatches) {
        console.log(`   Expected token: ${session.tokenSymbol} at ${expectedTokenAddress}`);
        console.log(`   Received token: ${transfer.asset} at ${transferTokenAddress}`);
      }
      
      if (!amountMatches) {
        const expectedDisplay = Number(session.expectedAmount) / Math.pow(10, session.tokenDecimals);
        const receivedDisplay = Number(transferAmount) / Math.pow(10, session.tokenDecimals);
        console.log(`   Expected: ${expectedDisplay} ${session.tokenSymbol} (${session.expectedAmount.toString()} units)`);
        console.log(`   Received: ${receivedDisplay} ${transfer.asset || 'ETH'} (${transferAmount.toString()} units)`);
      }
    }
  }

  /**
   * Stop monitoring
   */
  static stopMonitoring(): void {
    console.log('\n🛑 Stopping payment monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.currentSession = null;
    this.lastCheckedBlock = 0;
    
    console.log('✅ Payment monitoring stopped');
  }

  /**
   * Map chain IDs to Alchemy Network enums (same as AlchemyService)
   */
  private static getAlchemyNetwork(chainId: number): Network | null {
    const networkMap: {[key: number]: Network} = {
      1: Network.ETH_MAINNET,        // Ethereum
      8453: Network.BASE_MAINNET,    // Base
      42161: Network.ARB_MAINNET,    // Arbitrum
      10: Network.OPT_MAINNET,       // Optimism
      137: Network.MATIC_MAINNET     // Polygon
    };
    
    return networkMap[chainId] || null;
  }

  /**
   * Get or create Alchemy client for a specific chain
   */
  private static getAlchemyClient(chainId: number): Alchemy | null {
    if (this.alchemyClients.has(chainId)) {
      return this.alchemyClients.get(chainId)!;
    }

    const network = this.getAlchemyNetwork(chainId);
    if (!network) {
      console.error(`❌ No Alchemy network mapping found for chain ID ${chainId}`);
      return null;
    }

    if (!config.ALCHEMY_API_KEY) {
      console.error(`❌ ALCHEMY_API_KEY not configured`);
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
    return this.currentSession !== null && this.monitoringInterval !== null;
  }

  /**
   * Get current session info
   */
  static getCurrentSession(): PaymentSession | null {
    return this.currentSession;
  }
} 