# Broker API Layer

A comprehensive broker API integration layer that supports MT4/MT5, cTrader, and multiple brokers.

## Architecture

The broker API layer uses a **Strategy Pattern** with adapters for different trading platforms:

```
BrokerAdapter (abstract)
├── MT4MT5BrokerAdapter (MetaTrader 4/5)
├── CTraderBrokerAdapter (cTrader)
└── MockBrokerAdapter (Testing)
```

## Supported Features

### Broker Platforms
- ✅ **MT4/MT5** - Via REST API bridge
- ✅ **cTrader** - Via OpenAPI
- ✅ **Mock** - For testing without real brokers

### Operations
- ✅ Account Connection/Disconnection
- ✅ Get Account Details (balance, equity, margin)
- ✅ Fetch Open Trades
- ✅ Fetch Closed Trades
- ✅ Close Trade
- ✅ Open Trade
- ✅ Real-time Synchronization

## Usage

### Creating a Broker Connection

```typescript
import { BrokerFactory } from '@/lib/brokerApi';

// Create an adapter for a specific broker
const adapter = BrokerFactory.createAdapter(
  'FTMO',           // Broker name
  '123456789',      // Account ID
  'MT5'             // Platform
);

// Connect to broker
await adapter.connect({
  accountId: '123456789',
  password: 'your-password',
  server: 'FTMO-Demo'
});

// Get account details
const account = await adapter.getAccount();
console.log(account.balance, account.equity);

// Get open trades
const trades = await adapter.getTrades();

// Close a trade
await adapter.closeTrade('ticket123', 1.0);

// Open a trade
const trade = await adapter.openTrade('EURUSD', 'BUY', 1.0);

// Disconnect
await adapter.disconnect();
```

### Using the Sync Service

```typescript
import { brokerSyncService } from '@/lib/brokerSyncService';

// Sync a single account
const result = await brokerSyncService.syncAccount({
  id: 'account-id',
  user_id: 'user-id',
  broker_id: 'broker-id',
  broker_name: 'FTMO',
  platform: 'MT5',
  account_id: '123456789',
  password: 'your-password',
  sync_enabled: true,
});

// Sync all accounts for a user
const results = await brokerSyncService.syncAllAccounts('user-id');

// Start continuous auto-syncing (every 60 seconds)
await brokerSyncService.startAutoSync(config, 60000);

// Stop auto-syncing
brokerSyncService.stopAutoSync('user-id', 'account-id');
```

### React Hooks

```typescript
import { useBrokerSync, useBrokerSyncAll } from '@/hooks/useBrokerSync';

function MyComponent() {
  // Single account sync
  const { syncResult, isSyncing, error, manualSync } = useBrokerSync({
    accountId: 'account-123',
    enabled: true,
  });

  // Sync all accounts
  const { results, isSyncing: allSyncing, syncAll } = useBrokerSyncAll();

  return (
    <div>
      <button onClick={() => manualSync(config)} disabled={isSyncing}>
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
```

## Adding a New Broker

1. **Register API Endpoint** in `factory.ts`:

```typescript
BrokerFactory.registerBrokerEndpoint(
  'My Broker',
  'https://api.mybroker.com/v1'
);
```

2. **Create Custom Adapter** (optional):

```typescript
export class MyBrokerAdapter extends BrokerAdapter {
  async connect(credentials: BrokerConnection): Promise<void> {
    // Custom connection logic
  }
  
  async getAccount(): Promise<BrokerAccount> {
    // Custom account fetching
  }
  
  // ... implement other methods
}
```

## Testing with Mock Broker

Use the mock broker for development and testing:

```typescript
const adapter = BrokerFactory.createAdapter(
  'Test Broker',
  '999999',
  'mock'  // Use mock platform
);

// Works exactly like real brokers but generates fake data
await adapter.connect({ accountId: '999999', password: 'test123' });
```

## MT4/MT5 Bridge Server

For real MT4/MT5 connections, you need a bridge server running locally or remotely:

1. Install MT4/MT5 API server (ZeroMQ or REST bridge)
2. Update `baseUrl` in `MT4MT5BrokerAdapter`
3. Configure account credentials

## cTrader Integration

For cTrader, you need:

1. cTrader OpenAPI credentials
2. CTID Trader Account ID
3. OAuth2 setup for authentication

## Error Handling

All operations throw errors that should be caught:

```typescript
try {
  await adapter.connect(credentials);
} catch (error) {
  if (error instanceof Error) {
    console.error('Connection failed:', error.message);
  }
}
```

## Database Integration

The sync service automatically:
- Updates `trading_accounts` table with balance/equity
- Inserts new trades into `trades` table
- Updates closed trades
- Records last sync timestamp

## Security Notes

⚠️ **Important**:
- Never log passwords or API keys
- Store credentials encrypted in database
- Use HTTPS for all API connections
- Validate all inputs before sending to broker APIs
- Implement rate limiting for API calls
