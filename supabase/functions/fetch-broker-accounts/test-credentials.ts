/**
 * Test credentials for broker API testing
 * These are demo/sandbox credentials for testing broker integrations
 */

export interface TestCredentials {
  broker: string;
  platform: string;
  accountId: string;
  password: string;
  server: string;
  description: string;
}

export const testCredentials: TestCredentials[] = [
  // OANDA Demo Account (sandbox)
  {
    broker: "OANDA",
    platform: "MT5",
    accountId: "001-001-123456-001", // Demo account format
    password: "demotoken123", // Would be actual API token
    server: "OANDA Practice",
    description:
      "OANDA practice (sandbox) environment. Replace accountId and password with your actual OANDA API credentials.",
  },

  // Generic MT4/MT5 Demo (works with most brokers)
  {
    broker: "FTMO",
    platform: "MT4",
    accountId: "2489500",
    password: "demo12345",
    server: "FTMO Live",
    description:
      "FTMO demo account. Replace credentials with your actual FTMO trading account details.",
  },

  {
    broker: "Exness",
    platform: "MT5",
    accountId: "1234567",
    password: "demo12345",
    server: "Exness-MT5 Real",
    description:
      "Exness MT5 account. Replace with your actual Exness account number and password.",
  },

  {
    broker: "IC Markets",
    platform: "MT5",
    accountId: "1000123",
    password: "demo12345",
    server: "IC Markets Live",
    description:
      "IC Markets MT5 account. Replace with your actual IC Markets credentials.",
  },

  // cTrader Demo
  {
    broker: "Spotware",
    platform: "cTrader",
    accountId: "clientid123",
    password: "clientsecret123",
    server: "cTrader Live",
    description:
      "cTrader OpenAPI credentials. Use your cTrader client ID and secret.",
  },
];

/**
 * Get test credentials for a specific broker
 */
export function getTestCredentials(broker: string): TestCredentials | null {
  return testCredentials.find((c) => c.broker === broker) || null;
}

/**
 * Get all brokers that have test credentials available
 */
export function getAvailableTestBrokers(): string[] {
  return testCredentials.map((c) => c.broker);
}

/**
 * Format test credentials for display in UI
 */
export function formatTestCredentials(creds: TestCredentials): string {
  return `
Broker: ${creds.broker}
Platform: ${creds.platform}
Account ID: ${creds.accountId}
Server: ${creds.server}

${creds.description}
`;
}
