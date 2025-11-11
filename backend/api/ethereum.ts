import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
};

type App = Hono<{ Bindings: Bindings }>;

interface EthereumBlock {
  number: number;
  hash: string;
  timestamp: number;
  transactions: string[];
  gasUsed: string;
  gasLimit: string;
  miner: string;
  difficulty: string;
  txCount: number;
}

interface EthereumTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  nonce: number;
  blockNumber: number;
}

interface EthereumNetworkInfo {
  blockNumber: number;
  gasPrice: string;
  txCount: number;
}

interface GasPricePoint {
  blockNumber: number;
  gasPrice: number;
  timestamp: number;
}

interface MempoolStats {
  pendingCount: number;
  avgGasPrice: string;
  totalValue: string;
}

// Cache for blockchain data
let cachedData: {
  block: EthereumBlock | null;
  transactions: EthereumTransaction[];
  networkInfo: EthereumNetworkInfo;
  blockHistory: EthereumBlock[];
  gasPriceHistory: GasPricePoint[];
  mempoolStats: MempoolStats;
  lastUpdate: number;
} = {
  block: null,
  transactions: [],
  networkInfo: { blockNumber: 0, gasPrice: '0', txCount: 0 },
  blockHistory: [],
  gasPriceHistory: [],
  mempoolStats: { pendingCount: 0, avgGasPrice: '0', totalValue: '0' },
  lastUpdate: 0,
};

// Using public Ethereum RPC endpoint
const ETHEREUM_RPC_URL = 'https://eth.llamarpc.com';

// Helper to make RPC calls
const rpcCall = async (method: string, params: any[] = []): Promise<any> => {
  const response = await fetch(ETHEREUM_RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  
  const data = await response.json();
  return data.result;
};

// Helper functions to convert hex to decimal
const hexToDecimal = (hex: string): number => {
  return parseInt(hex, 16);
};

const hexToBigInt = (hex: string): bigint => {
  return BigInt(hex);
};

const formatEther = (weiHex: string): string => {
  const wei = hexToBigInt(weiHex);
  const ether = Number(wei) / 1e18;
  return ether.toFixed(6);
};

const formatGwei = (weiHex: string): string => {
  const wei = hexToBigInt(weiHex);
  const gwei = Number(wei) / 1e9;
  return gwei.toFixed(2);
};

const fetchLatestBlockData = async (): Promise<void> => {
  try {
    // Fetch latest block number
    const latestBlockNumberHex = await rpcCall('eth_blockNumber');
    const latestBlockNumber = hexToDecimal(latestBlockNumberHex);
    
    // Fetch block with transactions
    const block = await rpcCall('eth_getBlockByNumber', [latestBlockNumberHex, true]);
    
    if (!block) {
      console.error('Failed to fetch block');
      return;
    }

    // Process block data
    const ethBlock: EthereumBlock = {
      number: hexToDecimal(block.number),
      hash: block.hash || '',
      timestamp: hexToDecimal(block.timestamp),
      transactions: block.transactions.map((tx: any) => typeof tx === 'string' ? tx : tx.hash),
      gasUsed: hexToDecimal(block.gasUsed).toString(),
      gasLimit: hexToDecimal(block.gasLimit).toString(),
      miner: block.miner || '',
      difficulty: hexToDecimal(block.difficulty || '0x0').toString(),
      txCount: block.transactions.length,
    };

    // Fetch recent transactions with details (limit to prevent rate limiting)
    const transactions: EthereumTransaction[] = [];
    const txList = block.transactions.slice(0, 15); // Limit to 15 transactions
    
    for (const tx of txList) {
      try {
        const txData = typeof tx === 'string' ? await rpcCall('eth_getTransactionByHash', [tx]) : tx;
        
        if (txData) {
          transactions.push({
            hash: txData.hash,
            from: txData.from,
            to: txData.to || 'Contract Creation',
            value: formatEther(txData.value),
            gasPrice: formatGwei(txData.gasPrice),
            gasLimit: hexToDecimal(txData.gas).toString(),
            nonce: hexToDecimal(txData.nonce),
            blockNumber: hexToDecimal(txData.blockNumber || '0x0'),
          });
        }
      } catch (txError) {
        console.error('Error processing transaction:', txError);
      }
    }

    // Fetch current gas price
    const gasPriceHex = await rpcCall('eth_gasPrice');
    const currentGasPrice = formatGwei(gasPriceHex);

    // Network info
    const networkInfo: EthereumNetworkInfo = {
      blockNumber: latestBlockNumber,
      gasPrice: currentGasPrice,
      txCount: block.transactions.length,
    };

    // Update block history (keep last 20 blocks)
    cachedData.blockHistory.unshift(ethBlock);
    if (cachedData.blockHistory.length > 20) {
      cachedData.blockHistory = cachedData.blockHistory.slice(0, 20);
    }

    // Update gas price history
    cachedData.gasPriceHistory.unshift({
      blockNumber: latestBlockNumber,
      gasPrice: parseFloat(currentGasPrice),
      timestamp: hexToDecimal(block.timestamp),
    });
    if (cachedData.gasPriceHistory.length > 50) {
      cachedData.gasPriceHistory = cachedData.gasPriceHistory.slice(0, 50);
    }

    // Simulate mempool stats (real mempool requires special RPC endpoints)
    const mempoolStats: MempoolStats = {
      pendingCount: Math.floor(Math.random() * 50000 + 10000), // Simulated pending tx count
      avgGasPrice: currentGasPrice,
      totalValue: (Math.random() * 100 + 50).toFixed(2), // Simulated total ETH value
    };

    // Update cache
    cachedData.block = ethBlock;
    cachedData.transactions = transactions;
    cachedData.networkInfo = networkInfo;
    cachedData.mempoolStats = mempoolStats;
    cachedData.lastUpdate = Date.now();

    console.log(`✓ Updated Ethereum data - Block ${latestBlockNumber}, ${transactions.length} TXs`);
  } catch (error) {
    console.error('Error fetching Ethereum data:', error);
  }
};

// Initialize data fetch
fetchLatestBlockData();

// Update every 15 seconds (Ethereum block time is ~12s)
setInterval(() => {
  fetchLatestBlockData();
}, 15000);

export default (app: App) => {
  // API endpoint for snapshot
  app.get('/api/ethereum/snapshot', async (c) => {
    // If cache is too old (> 30 seconds), refresh it
    if (Date.now() - cachedData.lastUpdate > 30000) {
      await fetchLatestBlockData();
    }

    return c.json(cachedData);
  });

  // Health check endpoint
  app.get('/api/ethereum/health', (c) => {
    return c.json({
      status: 'ok',
      lastUpdate: cachedData.lastUpdate,
      blockNumber: cachedData.networkInfo.blockNumber,
    });
  });

  // Mempool stats endpoint
  app.get('/api/ethereum/mempool', (c) => {
    return c.json(cachedData.mempoolStats);
  });
};
