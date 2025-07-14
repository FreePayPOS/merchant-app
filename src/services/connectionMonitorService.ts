import { AlchemyService } from './alchemyService';
import { SUPPORTED_CHAINS } from '../config/index';

interface ConnectionStatus {
    connected: boolean;
    lastCheck: number;
    errorMessage?: string;
}

export class ConnectionMonitorService {
    private static isMonitoring = false;
    private static monitorInterval: NodeJS.Timeout | null = null;
    private static connectionStatus: ConnectionStatus = { connected: true, lastCheck: Date.now() };
    private static onStatusChange?: (status: ConnectionStatus) => void;

    /**
     * Start monitoring Alchemy connection status
     */
    static startMonitoring(onStatusChange: (status: ConnectionStatus) => void) {
        if (this.isMonitoring) return;

        this.onStatusChange = onStatusChange;
        this.isMonitoring = true;

        console.log('🔍 Starting Alchemy connection monitoring...');

        // Check immediately
        this.checkConnection();

        // Check every 30 seconds
        this.monitorInterval = setInterval(() => {
            this.checkConnection();
        }, 30000);
    }

    /**
     * Stop monitoring
     */
    static stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        this.isMonitoring = false;
        console.log('⏹️ Stopped Alchemy connection monitoring');
    }

    /**
     * Check connection status by attempting a simple API call to Alchemy
     */
    private static async checkConnection() {
        try {
            // Test connection by trying to validate an Ethereum address
            // This is a simple API call that doesn't require much data
            const testAddress = '0x0000000000000000000000000000000000000000';
            const isValid = AlchemyService.isEthereumAddress(testAddress);
            
            if (!isValid) {
                throw new Error('AlchemyService basic validation failed');
            }

            // Try a simple fetch to one of the Alchemy endpoints
            const mainnetChain = SUPPORTED_CHAINS.find(chain => chain.id === 1);
            if (!mainnetChain) {
                throw new Error('No mainnet chain configuration found');
            }

            const response = await fetch(mainnetChain.alchemyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_blockNumber',
                    params: []
                }),
                // Add timeout
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (!data.result) {
                throw new Error('No result in Alchemy response');
            }

            // Connection successful
            this.updateStatus(true);

        } catch (error) {
            console.error('❌ Alchemy connection check failed:', error);
            
            let errorMessage = 'Connection failed';
            if (error instanceof Error) {
                if (error.name === 'TimeoutError') {
                    errorMessage = 'Connection timeout';
                } else if (error.message.includes('fetch')) {
                    errorMessage = 'Network error';
                } else {
                    errorMessage = error.message;
                }
            }

            this.updateStatus(false, errorMessage);
        }
    }

    /**
     * Update connection status and notify if changed
     */
    private static updateStatus(connected: boolean, errorMessage?: string) {
        const previousStatus = this.connectionStatus.connected;
        
        this.connectionStatus = {
            connected,
            lastCheck: Date.now(),
            errorMessage
        };

        // Notify if status changed
        if (previousStatus !== connected) {
            console.log(`🔄 Connection status changed: ${connected ? 'Connected' : 'Disconnected'}`);
            if (this.onStatusChange) {
                this.onStatusChange(this.connectionStatus);
            }
        }
    }

    /**
     * Get current connection status
     */
    static getStatus(): ConnectionStatus {
        return { ...this.connectionStatus };
    }

    /**
     * Force a connection check
     */
    static async forceCheck(): Promise<ConnectionStatus> {
        await this.checkConnection();
        return this.getStatus();
    }
} 