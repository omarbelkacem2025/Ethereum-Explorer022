import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, Wallet, Box, Zap, TrendingUp, Clock, User, Hash, Activity, Database, Coins, Settings, DollarSign, AlertCircle, CheckCircle, XCircle, Bell } from 'lucide-react';
import type { EthereumBlock, EthereumTransaction, EthereumNetworkInfo } from '../ethereum/backend_client';

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

const EthereumViz = () => {
  const [block, setBlock] = useState<EthereumBlock | null>(null);
  const [transactions, setTransactions] = useState<EthereumTransaction[]>([]);
  const [blockHistory, setBlockHistory] = useState<EthereumBlock[]>([]);
  const [gasPriceHistory, setGasPriceHistory] = useState<GasPricePoint[]>([]);
  const [mempoolStats, setMempoolStats] = useState<MempoolStats>({
    pendingCount: 0,
    avgGasPrice: '0',
    totalValue: '0',
  });
  const [networkInfo, setNetworkInfo] = useState<EthereumNetworkInfo>({
    blockNumber: 0,
    gasPrice: '0',
    txCount: 0,
  });
  const [connected, setConnected] = useState(false);
  const [selectedTx, setSelectedTx] = useState<EthereumTransaction | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<EthereumBlock | null>(null);
  const [blockTransactions, setBlockTransactions] = useState<EthereumTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [walletFilter, setWalletFilter] = useState('');
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [refreshRate, setRefreshRate] = useState(5000); // 5 seconds default
  const [gasEstimate, setGasEstimate] = useState({ slow: 0, standard: 0, fast: 0 });
  const [congestionLevel, setCongestionLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [gasAlert, setGasAlert] = useState<string | null>(null);
  const [alertThreshold, setAlertThreshold] = useState(50); // Gwei threshold

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/ethereum/snapshot');
        if (response.ok) {
          const data = await response.json();
          if (data.block) setBlock(data.block);
          if (data.transactions) setTransactions(data.transactions);
          if (data.networkInfo) setNetworkInfo(data.networkInfo);
          if (data.blockHistory) {
            console.log('Block history received:', data.blockHistory.length);
            setBlockHistory(data.blockHistory);
          }
          if (data.gasPriceHistory) setGasPriceHistory(data.gasPriceHistory);
          if (data.mempoolStats) {
            setMempoolStats(data.mempoolStats);
            // Calculate gas fee estimates based on mempool
            const baseGas = parseFloat(data.mempoolStats.avgGasPrice) || 10;
            setGasEstimate({
              slow: parseFloat((baseGas * 0.8).toFixed(2)),
              standard: parseFloat(baseGas.toFixed(2)),
              fast: parseFloat((baseGas * 1.2).toFixed(2)),
            });

            // Calculate congestion level based on pending transactions
            const pending = data.mempoolStats.pendingCount;
            if (pending < 20000) {
              setCongestionLevel('low');
            } else if (pending < 40000) {
              setCongestionLevel('medium');
            } else {
              setCongestionLevel('high');
            }

            // Check gas price alert
            if (baseGas < alertThreshold && gasAlert !== 'below') {
              setGasAlert('below');
            } else if (baseGas >= alertThreshold && gasAlert === 'below') {
              setGasAlert(null);
            }
          }
          setConnected(true);
        } else {
          setConnected(false);
        }
      } catch (error) {
        console.error('Error fetching Ethereum data:', error);
        setConnected(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshRate);
    return () => clearInterval(interval);
  }, [refreshRate]);

  const formatTimestamp = (timestamp: number) => {
    return format(new Date(timestamp * 1000), 'PPpp');
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const getBlockAge = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = searchTerm === '' || 
      tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.to.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWallet = walletFilter === '' ||
      tx.from.toLowerCase() === walletFilter.toLowerCase() ||
      tx.to.toLowerCase() === walletFilter.toLowerCase();
    
    return matchesSearch && matchesWallet;
  });

  const trackWallet = (address: string) => {
    setWalletFilter(address);
    setShowWalletDialog(false);
  };

  const openBlockDetails = async (blk: EthereumBlock) => {
    setSelectedBlock(blk);
    setBlockTransactions(transactions.filter(tx => tx.blockNumber === blk.number));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header - Orange/Brown Style */}
      <header className="border-b border-orange-500/20 bg-[#0f0f0f] sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-gradient-to-br from-[#f97316] to-[rgba(249, 115, 22, 0.3)] flex items-center justify-center shadow-lg">
                <Box className="text-white w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-white">Ethereum Explorer</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search tx hash, address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)] text-white placeholder:text-gray-500"
                />
              </div>
              
              <Button
                onClick={() => setShowWalletDialog(true)}
                variant="outline"
                className="border-[rgba(249, 115, 22, 0.3)] hover:bg-[#1a1a1a] text-white"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Track Wallet
              </Button>

              {walletFilter && (
                <Button
                  onClick={() => setWalletFilter('')}
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 hover:bg-red-500/10 text-red-400"
                >
                  Clear Filter
                </Button>
              )}

              <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] rounded-lg">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-sm text-gray-300">
                  {connected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Gas Price Alert */}
        {gasAlert === 'below' && (
          <div className="mb-4 bg-gradient-to-r from-green-900/30 to-green-800/20 border border-green-500/40 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div className="flex-1">
              <div className="text-green-400 font-semibold">Gas Price Alert!</div>
              <div className="text-green-400/80 text-sm">
                Gas price is below your threshold of {alertThreshold} Gwei. Good time to make transactions!
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setGasAlert(null)}
              className="text-green-400 hover:text-green-300"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Network Congestion Indicator */}
        <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)] mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-[#fb923c] flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Network Congestion Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#9a6b3e]">Congestion Level</span>
                  <Badge className={`
                    ${congestionLevel === 'low' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
                    ${congestionLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : ''}
                    ${congestionLevel === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' : ''}
                  `}>
                    {congestionLevel === 'low' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {congestionLevel === 'medium' && <AlertCircle className="w-3 h-3 mr-1" />}
                    {congestionLevel === 'high' && <XCircle className="w-3 h-3 mr-1" />}
                    {congestionLevel.toUpperCase()}
                  </Badge>
                </div>
                <div className="w-full h-4 bg-[#0f0f0f] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      congestionLevel === 'low' ? 'bg-gradient-to-r from-green-500 to-green-400 w-1/3' : 
                      congestionLevel === 'medium' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 w-2/3' : 
                      'bg-gradient-to-r from-red-500 to-red-400 w-full'
                    }`}
                  />
                </div>
                <div className="text-xs text-[#9a6b3e] mt-2">
                  {congestionLevel === 'low' && 'Network is flowing smoothly. Good time for transactions!'}
                  {congestionLevel === 'medium' && 'Moderate network activity. Expect normal confirmation times.'}
                  {congestionLevel === 'high' && 'High network congestion. Transactions may take longer to confirm.'}
                </div>
              </div>
              <div className="border-l border-[rgba(249, 115, 22, 0.3)] pl-6">
                <div className="text-sm text-[#fb923c] mb-2">Gas Alert Threshold</div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(Number(e.target.value))}
                    className="w-24 bg-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)] text-white"
                  />
                  <span className="text-sm text-[#9a6b3e]">Gwei</span>
                  <Bell className="w-4 h-4 text-[#fb923c]" />
                </div>
                <div className="text-xs text-[#9a6b3e] mt-1">Alert when gas drops below</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network Stats - Mempool Blue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#fb923c] flex items-center gap-2">
                <Box className="w-4 h-4" />
                Block Height
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{networkInfo.blockNumber.toLocaleString()}</div>
              <div className="text-xs text-[#9a6b3e] mt-1">Latest block</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#fb923c] flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Gas Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {parseFloat(networkInfo.gasPrice).toFixed(1)} 
                <span className="text-lg ml-1 text-[#9a6b3e]">Gwei</span>
              </div>
              <div className="text-xs text-[#9a6b3e] mt-1">Current average</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#fb923c] flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{networkInfo.txCount}</div>
              <div className="text-xs text-[#9a6b3e] mt-1">In latest block</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#fb923c] flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Network Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">Active</div>
              <div className="text-xs text-[#9a6b3e] mt-1">{blockHistory.length} blocks tracked</div>
            </CardContent>
          </Card>
        </div>

        {/* Mempool Statistics with Enhanced Features */}
        <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)] mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[#fb923c] flex items-center gap-2">
                <Database className="w-5 h-5" />
                Mempool Statistics & Fee Estimator
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-[#9a6b3e]">
                  <Settings className="w-4 h-4" />
                  <span>Refresh:</span>
                  <select 
                    value={refreshRate} 
                    onChange={(e) => setRefreshRate(Number(e.target.value))}
                    className="bg-[#0f0f0f] border border-[rgba(249, 115, 22, 0.3)] rounded px-2 py-1 text-white text-xs"
                  >
                    <option value="3000">3s</option>
                    <option value="5000">5s</option>
                    <option value="10000">10s</option>
                    <option value="15000">15s</option>
                    <option value="30000">30s</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Mempool Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#0f0f0f] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-4">
                <div className="text-sm text-[#fb923c] mb-2">Pending Transactions</div>
                <div className="text-2xl font-bold text-white">{mempoolStats.pendingCount.toLocaleString()}</div>
                <div className="text-xs text-[#9a6b3e] mt-1">Waiting to be mined</div>
              </div>
              <div className="bg-[#0f0f0f] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-4">
                <div className="text-sm text-[#fb923c] mb-2">Average Gas Price</div>
                <div className="text-2xl font-bold text-white">
                  {parseFloat(mempoolStats.avgGasPrice).toFixed(2)} 
                  <span className="text-sm ml-1 text-[#9a6b3e]">Gwei</span>
                </div>
                <div className="text-xs text-[#9a6b3e] mt-1">In mempool</div>
              </div>
              <div className="bg-[#0f0f0f] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-4">
                <div className="text-sm text-[#fb923c] mb-2">Total ETH Value</div>
                <div className="text-2xl font-bold text-white">
                  {mempoolStats.totalValue} 
                  <span className="text-sm ml-1 text-[#9a6b3e]">ETH</span>
                </div>
                <div className="text-xs text-[#9a6b3e] mt-1">Pending transfers</div>
              </div>
            </div>

            {/* Transaction Fee Estimator */}
            <div className="border-t border-[rgba(249, 115, 22, 0.3)] pt-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-[#fb923c]" />
                <h3 className="text-[#fb923c] font-semibold">Transaction Fee Estimator</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Slow */}
                <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-blue-400 font-semibold">🐢 Slow</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">~30 min</Badge>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{gasEstimate.slow}</div>
                  <div className="text-xs text-blue-400">Gwei</div>
                  <div className="text-xs text-blue-400/60 mt-2">
                    Est. cost: ${(gasEstimate.slow * 21000 * 0.000000001 * 2500).toFixed(2)}
                  </div>
                </div>

                {/* Standard */}
                <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-green-400 font-semibold">⚡ Standard</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">~3 min</Badge>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{gasEstimate.standard}</div>
                  <div className="text-xs text-green-400">Gwei</div>
                  <div className="text-xs text-green-400/60 mt-2">
                    Est. cost: ${(gasEstimate.standard * 21000 * 0.000000001 * 2500).toFixed(2)}
                  </div>
                </div>

                {/* Fast */}
                <div className="bg-gradient-to-br from-orange-900/20 to-orange-800/10 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-orange-400 font-semibold">🚀 Fast</span>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">~30 sec</Badge>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{gasEstimate.fast}</div>
                  <div className="text-xs text-orange-400">Gwei</div>
                  <div className="text-xs text-orange-400/60 mt-2">
                    Est. cost: ${(gasEstimate.fast * 21000 * 0.000000001 * 2500).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-[#9a6b3e] mt-4 text-center">
                * Estimates based on 21000 gas (standard ETH transfer) @ $2500/ETH
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mempool Transaction Bubble Map */}
        <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)] mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-[#fb923c] flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Mempool Transaction Visualization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-64 bg-[#0f0f0f] rounded-lg border border-[rgba(249, 115, 22, 0.3)] overflow-hidden">
              {/* Bubble visualization */}
              <div className="absolute inset-0 flex items-center justify-center flex-wrap gap-2 p-4">
                {[...Array(Math.min(50, Math.floor(mempoolStats.pendingCount / 500)))].map((_, i) => {
                  const size = Math.random() * 40 + 20;
                  const gasLevel = Math.random();
                  const color = gasLevel > 0.7 ? '#f97316' : gasLevel > 0.4 ? '#fbbf24' : '#22c55e';
                  const opacity = 0.3 + Math.random() * 0.4;
                  
                  return (
                    <div
                      key={i}
                      className="rounded-full animate-pulse"
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        backgroundColor: color,
                        opacity: opacity,
                        animation: `pulse ${2 + Math.random() * 2}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                      }}
                      title={`Gas: ${(gasLevel * 100).toFixed(0)} Gwei`}
                    />
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="absolute bottom-2 left-2 bg-[#0f0f0f]/90 backdrop-blur-sm border border-[rgba(249, 115, 22, 0.3)] rounded px-3 py-2 flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-[#9a6b3e]">Low Gas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-[#9a6b3e]">Medium Gas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-[#9a6b3e]">High Gas</span>
                </div>
              </div>
              
              {/* Stats overlay */}
              <div className="absolute top-2 right-2 bg-[#0f0f0f]/90 backdrop-blur-sm border border-[rgba(249, 115, 22, 0.3)] rounded px-3 py-2">
                <div className="text-[#fb923c] text-xs font-semibold">Live Transactions</div>
                <div className="text-white text-xl font-bold">{Math.floor(mempoolStats.pendingCount / 500)}</div>
                <div className="text-[#9a6b3e] text-xs">Bubbles</div>
              </div>
            </div>
            <div className="text-xs text-[#9a6b3e] mt-2 text-center">
              Each bubble represents ~500 pending transactions. Size and color indicate gas price levels.
            </div>
          </CardContent>
        </Card>

        {/* Gas Price Chart */}
        {gasPriceHistory.length > 0 && (
          <Card className="bg-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)] mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-[#fb923c] flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Gas Price History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={gasPriceHistory}>
                    <defs>
                      <linearGradient id="gasGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(249, 115, 22, 0.3)" />
                    <XAxis 
                      dataKey="blockNumber" 
                      stroke="#9a6b3e"
                      tick={{ fill: '#9a6b3e', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#9a6b3e"
                      tick={{ fill: '#9a6b3e', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #f97316', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="gasPrice" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      fill="url(#gasGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Block History - Exact Mempool Style */}
        <Card className="bg-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)] mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-[#fb923c] flex items-center gap-2">
              <Database className="w-5 h-5" />
              Recent Blocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {blockHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="animate-pulse mb-2">
                  <Box className="w-12 h-12 mx-auto text-[rgba(249, 115, 22, 0.3)]" />
                </div>
                <div>Loading blocks...</div>
                <div className="text-xs mt-2">Waiting for new blocks to arrive</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
                {blockHistory.map((blk) => {
                  const gasPercentage = (parseInt(blk.gasUsed) / parseInt(blk.gasLimit)) * 100;
                  const isFullBlock = gasPercentage > 90;
                  
                  return (
                    <div
                      key={blk.hash}
                      onClick={() => openBlockDetails(blk)}
                      className="relative overflow-hidden bg-gradient-to-br from-[rgba(249, 115, 22, 0.3)] to-[#1a1a1a] border border-[#f97316] rounded-lg p-3 hover:border-[#fbbf24] hover:shadow-lg hover:shadow-[#f97316]/20 transition-all cursor-pointer group"
                    >
                      {/* Gas Usage Background Indicator */}
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#f97316]/30 to-transparent transition-all"
                        style={{ height: `${gasPercentage}%` }}
                      />
                      
                      <div className="relative z-10 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant="outline" 
                            className={`text-xs border-[#f97316] ${isFullBlock ? 'text-yellow-400' : 'text-[#fb923c]'}`}
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {getBlockAge(blk.timestamp)}
                          </Badge>
                        </div>
                        
                        <div className="text-2xl font-bold text-white group-hover:text-[#fb923c] transition-colors">
                          {blk.number.toLocaleString()}
                        </div>
                        
                        <div className="text-xs text-[#fb923c] space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              TXs:
                            </span>
                            <span className="text-white font-semibold">{blk.txCount}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Gas:
                            </span>
                            <span className="text-white font-semibold">{(parseInt(blk.gasUsed) / 1e6).toFixed(1)}M</span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-[#9a6b3e] truncate font-mono flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {blk.miner.slice(0, 10)}...
                        </div>

                        {/* Gas usage indicator bar */}
                        <div className="w-full h-1 bg-[#1a1a1a] rounded-full overflow-hidden mt-1">
                          <div 
                            className={`h-full transition-all ${
                              gasPercentage > 90 ? 'bg-yellow-400' : 
                              gasPercentage > 70 ? 'bg-blue-400' : 
                              'bg-green-400'
                            }`}
                            style={{ width: `${gasPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="bg-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[#fb923c] flex items-center gap-2">
                <Coins className="w-5 h-5" />
                {walletFilter ? 'Filtered Transactions' : 'Recent Transactions'}
              </CardTitle>
              {walletFilter && (
                <Badge className="bg-[rgba(249, 115, 22, 0.3)] text-[#fb923c] border-[#f97316]">
                  Tracking: {truncateHash(walletFilter)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {transactions.length === 0 ? 'Waiting for transactions...' : 'No transactions match your filters'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(249, 115, 22, 0.3)]">
                      <th className="text-left py-3 px-2 text-[#fb923c]">
                        <Hash className="w-4 h-4 inline mr-1" />
                        Tx Hash
                      </th>
                      <th className="text-left py-3 px-2 text-[#fb923c]">From</th>
                      <th className="text-left py-3 px-2 text-[#fb923c]">To</th>
                      <th className="text-right py-3 px-2 text-[#fb923c]">Value (ETH)</th>
                      <th className="text-right py-3 px-2 text-[#fb923c]">Gas (Gwei)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr 
                        key={tx.hash} 
                        className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors cursor-pointer group"
                        onClick={() => setSelectedTx(tx)}
                      >
                        <td className="py-3 px-2">
                          <code className="text-xs text-[#fb923c] group-hover:text-white font-mono">
                            {truncateHash(tx.hash)}
                          </code>
                        </td>
                        <td className="py-3 px-2">
                          <code className="text-xs text-gray-300 font-mono">{truncateHash(tx.from)}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-5 w-5 p-0 text-[#fb923c] hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              trackWallet(tx.from);
                            }}
                          >
                            <Wallet className="w-3 h-3" />
                          </Button>
                        </td>
                        <td className="py-3 px-2">
                          {tx.to === 'Contract Creation' ? (
                            <Badge variant="outline" className="text-xs border-[#f97316] text-yellow-400">
                              Contract
                            </Badge>
                          ) : (
                            <>
                              <code className="text-xs text-gray-300 font-mono">{truncateHash(tx.to)}</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-2 h-5 w-5 p-0 text-[#fb923c] hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  trackWallet(tx.to);
                                }}
                              >
                                <Wallet className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right text-white font-mono">
                          {parseFloat(tx.value).toFixed(4)}
                        </td>
                        <td className="py-3 px-2 text-right text-white font-mono">
                          {parseFloat(tx.gasPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Transaction Details Modal */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="bg-[#0f0f0f] border-[#f97316] text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#fb923c]">Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-[#fb923c]">Transaction Hash</span>
                  <code className="text-sm text-white bg-[#1a1a1a] p-3 rounded border border-[rgba(249, 115, 22, 0.3)] break-all font-mono">
                    {selectedTx.hash}
                  </code>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-[#fb923c]">Block Number</span>
                    <span className="text-white font-mono text-lg">{selectedTx.blockNumber.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-[#fb923c]">Nonce</span>
                    <span className="text-white font-mono text-lg">{selectedTx.nonce}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#fb923c]">From</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => trackWallet(selectedTx.from)}
                      className="border-[rgba(249, 115, 22, 0.3)] hover:bg-[#1a1a1a] text-[#fb923c]"
                    >
                      <Wallet className="w-3 h-3 mr-2" />
                      Track Wallet
                    </Button>
                  </div>
                  <code className="text-sm text-white bg-[#1a1a1a] p-3 rounded border border-[rgba(249, 115, 22, 0.3)] break-all font-mono">
                    {selectedTx.from}
                  </code>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#fb923c]">To</span>
                    {selectedTx.to !== 'Contract Creation' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => trackWallet(selectedTx.to)}
                        className="border-[rgba(249, 115, 22, 0.3)] hover:bg-[#1a1a1a] text-[#fb923c]"
                      >
                        <Wallet className="w-3 h-3 mr-2" />
                        Track Wallet
                      </Button>
                    )}
                  </div>
                  <code className="text-sm text-white bg-[#1a1a1a] p-3 rounded border border-[rgba(249, 115, 22, 0.3)] break-all font-mono">
                    {selectedTx.to}
                  </code>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-[#fb923c]">Value</span>
                    <span className="text-white font-mono text-2xl">{parseFloat(selectedTx.value).toFixed(6)} ETH</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-[#fb923c]">Gas Price</span>
                    <span className="text-white font-mono text-2xl">{parseFloat(selectedTx.gasPrice).toFixed(4)} Gwei</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-[#fb923c]">Gas Limit</span>
                  <span className="text-white font-mono text-lg">{selectedTx.gasLimit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Block Details Modal */}
      <Dialog open={!!selectedBlock} onOpenChange={() => setSelectedBlock(null)}>
        <DialogContent className="bg-[#0f0f0f] border-[#f97316] text-white max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#fb923c] flex items-center gap-2">
              <Box className="w-6 h-6" />
              Block #{selectedBlock?.number.toLocaleString()}
            </DialogTitle>
          </DialogHeader>
          {selectedBlock && (
            <div className="space-y-6">
              {/* Block Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#fb923c] flex items-center gap-2">
                      <Box className="w-4 h-4" />
                      Block Height
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{selectedBlock.number.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#fb923c] flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{selectedBlock.txCount}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[rgba(249, 115, 22, 0.3)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#fb923c] flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Gas Used
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">
                      {((parseInt(selectedBlock.gasUsed) / parseInt(selectedBlock.gasLimit)) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-[#9a6b3e] mt-1">
                      {(parseInt(selectedBlock.gasUsed) / 1e6).toFixed(2)}M / {(parseInt(selectedBlock.gasLimit) / 1e6).toFixed(2)}M
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Block Details */}
              <Card className="bg-[#1a1a1a] border-[rgba(249, 115, 22, 0.3)]">
                <CardHeader>
                  <CardTitle className="text-lg text-[#fb923c]">Block Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <span className="text-[#fb923c]">Block Hash</span>
                      <div className="text-white bg-[#0f0f0f] p-2 rounded border border-[rgba(249, 115, 22, 0.3)] font-mono text-xs break-all">
                        {selectedBlock.hash}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[#fb923c]">Timestamp</span>
                      <div className="text-white">
                        {formatTimestamp(selectedBlock.timestamp)}
                        <div className="text-xs text-[#9a6b3e] mt-1">({getBlockAge(selectedBlock.timestamp)} ago)</div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[#fb923c]">Miner</span>
                      <div className="flex items-center gap-2">
                        <code className="text-white bg-[#0f0f0f] p-2 rounded border border-[rgba(249, 115, 22, 0.3)] font-mono text-xs flex-1 break-all">
                          {selectedBlock.miner}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#fb923c] hover:text-white"
                          onClick={() => trackWallet(selectedBlock.miner)}
                        >
                          <Wallet className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[#fb923c]">Difficulty</span>
                      <div className="text-white font-mono">{selectedBlock.difficulty}</div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[#fb923c]">Gas Used</span>
                      <div className="text-white font-mono">{parseInt(selectedBlock.gasUsed).toLocaleString()}</div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[#fb923c]">Gas Limit</span>
                      <div className="text-white font-mono">{parseInt(selectedBlock.gasLimit).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Gas Usage Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#fb923c]">Gas Usage</span>
                      <span className="text-white">
                        {((parseInt(selectedBlock.gasUsed) / parseInt(selectedBlock.gasLimit)) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-[#0f0f0f] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#f97316] to-[#fbbf24] transition-all"
                        style={{ width: `${(parseInt(selectedBlock.gasUsed) / parseInt(selectedBlock.gasLimit)) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions in Block */}
              <Card className="bg-[#1a1a1a] border-[rgba(249, 115, 22, 0.3)]">
                <CardHeader>
                  <CardTitle className="text-lg text-[#fb923c]">
                    Transactions ({selectedBlock.txCount})
                  </CardTitle>
                  {selectedBlock.transactions.length > 20 && (
                    <p className="text-sm text-[#9a6b3e]">Showing first 20 of {selectedBlock.txCount} transactions</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedBlock.transactions.slice(0, 20).map((txHash, idx) => (
                      <div
                        key={txHash}
                        className="flex items-center justify-between p-3 bg-[#0f0f0f] hover:bg-[rgba(249, 115, 22, 0.3)] border border-[rgba(249, 115, 22, 0.3)] rounded transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="border-[#f97316] text-[#fb923c]">
                            #{idx + 1}
                          </Badge>
                          <code className="text-xs text-white font-mono">{truncateHash(txHash)}</code>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#fb923c] hover:text-white"
                          onClick={() => {
                            const tx = transactions.find(t => t.hash === txHash);
                            if (tx) {
                              setSelectedTx(tx);
                              setSelectedBlock(null);
                            }
                          }}
                        >
                          View Details →
                        </Button>
                      </div>
                    ))}
                    
                    {blockTransactions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm text-[#fb923c] mb-3">Transaction Details Available</h4>
                        <div className="space-y-2">
                          {blockTransactions.map((tx) => (
                            <div
                              key={tx.hash}
                              onClick={() => {
                                setSelectedTx(tx);
                                setSelectedBlock(null);
                              }}
                              className="p-3 bg-[#0f0f0f] hover:bg-[rgba(249, 115, 22, 0.3)] border border-[rgba(249, 115, 22, 0.3)] rounded cursor-pointer transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <code className="text-xs text-[#fb923c] font-mono">{truncateHash(tx.hash)}</code>
                                <span className="text-white font-mono text-sm">{parseFloat(tx.value).toFixed(4)} ETH</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-[#9a6b3e]">
                                <span>From: {truncateHash(tx.from)}</span>
                                <span>To: {tx.to === 'Contract Creation' ? 'Contract' : truncateHash(tx.to)}</span>
                                <span>Gas: {parseFloat(tx.gasPrice).toFixed(2)} Gwei</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Wallet Tracking Dialog */}
      <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
        <DialogContent className="bg-[#0f0f0f] border-[#f97316] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#fb923c]">Track Wallet Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#9a6b3e]">
              Enter an Ethereum address to filter all transactions involving this wallet.
            </p>
            <Input
              type="text"
              placeholder="0x..."
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              className="bg-[#1a1a1a] border-[rgba(249, 115, 22, 0.3)] text-white font-mono"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => setShowWalletDialog(false)}
                className="flex-1 bg-[#f97316] hover:bg-[#fbbf24] text-white"
              >
                Track
              </Button>
              <Button
                onClick={() => {
                  setWalletFilter('');
                  setShowWalletDialog(false);
                }}
                variant="outline"
                className="border-[rgba(249, 115, 22, 0.3)] hover:bg-[#1a1a1a] text-white"
              >
                Clear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] bg-[#0a0a0a] mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-[#9a6b3e]">
          <p>Real-time Ethereum Mainnet • Built by <a href="https://x.com/abdo69mx" className="text-[#fb923c] hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">@abdo69mx</a></p>
        </div>
      </footer>
    </div>
  );
};

export default EthereumViz;
