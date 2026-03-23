import {
  Info,
  Copy,
  ExternalLink,
  TestTube,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { brokerService } from "../lib/brokerService";

interface BrokerTestInfo {
  name: string;
  platform: string;
  description: string;
  setupUrl: string;
  testAccountUrl: string;
  notes: string[];
}

const brokerTestInfo: { [key: string]: BrokerTestInfo } = {
  OANDA: {
    name: "OANDA",
    platform: "MT5",
    description:
      "Real public API with free practice accounts. Recommended for testing.",
    setupUrl: "https://practice.oanda.com",
    testAccountUrl: "https://practice.oanda.com",
    notes: [
      "Create free practice account",
      "Generate API token in Account Settings",
      "Use API token as password (not your trading password)",
      "Perfect for development and testing",
    ],
  },
  FTMO: {
    name: "FTMO",
    platform: "MT4/MT5",
    description:
      "Popular prop trading firm. Complete challenge to get funded account.",
    setupUrl: "https://ftmo.com",
    testAccountUrl: "https://ftmo.com",
    notes: [
      "Register and complete trading challenge",
      "Get funded account or use demo",
      "Use your account number as Account ID",
      "Use your MT4/MT5 password",
    ],
  },
  Exness: {
    name: "Exness",
    platform: "MT5",
    description: "Major retail broker with MT4/MT5 support.",
    setupUrl: "https://exness.com",
    testAccountUrl: "https://exness.com",
    notes: [
      "Create account (demo or live)",
      "Create MT5 trading account",
      "Note your account number",
      "Use your password",
    ],
  },
  "IC Markets": {
    name: "IC Markets",
    platform: "MT5/cTrader",
    description: "Supports both MT5 and cTrader platforms.",
    setupUrl: "https://icmarkets.com",
    testAccountUrl: "https://icmarkets.com",
    notes: [
      "Open account at IC Markets",
      "Create MT5 or cTrader account",
      "Get credentials from dashboard",
    ],
  },
  Spotware: {
    name: "Spotware",
    platform: "cTrader",
    description: "Full cTrader OpenAPI support.",
    setupUrl: "https://ctrader.com",
    testAccountUrl: "https://auth.ctid.io",
    notes: [
      "Create cTrader account at Spotware",
      "Register application to get Client ID/Secret",
      "Use for OpenAPI access",
    ],
  },
};

export function BrokerTestingInfo({ broker }: { broker: string }) {
  const [copied, setCopied] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);
  const [testCredentials, setTestCredentials] = useState({
    accountId: "",
    password: "",
    server: "demo",
  });
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    accounts?: any[];
  } | null>(null);
  const [testing, setTesting] = useState(false);

  const info = brokerTestInfo[broker];

  if (!info) return null;

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!testCredentials.accountId || !testCredentials.password) {
      setTestResult({
        success: false,
        message: "Please enter account ID and password",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Find the broker from the service
      const brokers = await brokerService.getAllBrokers();
      const selectedBroker = brokers.find((b) => b.name === broker);

      if (!selectedBroker) {
        throw new Error("Broker not found in database");
      }

      // Determine platform
      const platform = info.platform.includes("cTrader")
        ? "cTrader"
        : info.platform.includes("MT5")
          ? "MT5"
          : "MT4";

      // Test the connection
      const result = await brokerService.validateConnection(
        selectedBroker,
        platform,
        testCredentials.server,
        testCredentials.accountId,
        testCredentials.password,
      );

      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-blue-900">
            {info.name} Setup Guide
          </h4>
          <p className="text-sm text-blue-700 mt-1">{info.description}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <h5 className="font-medium text-blue-900">Steps to get started:</h5>
        <ol className="list-decimal list-inside space-y-1 text-blue-800">
          {info.notes.map((note, idx) => (
            <li key={idx}>{note}</li>
          ))}
        </ol>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={info.setupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Get {info.name} Account
          <ExternalLink className="w-4 h-4" />
        </a>
        <button
          onClick={() => copyToClipboard(info.setupUrl)}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
          title="Copy setup URL"
        >
          <Copy className="w-4 h-4" />
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={() => setShowTestForm(!showTestForm)}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
          title="Test connection with live data"
        >
          <TestTube className="w-4 h-4" />
          Test Connection
        </button>
      </div>

      {showTestForm && (
        <div className="bg-blue-100 rounded p-3 space-y-3">
          <h5 className="font-medium text-blue-900">Test Live Connection</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Account ID"
              value={testCredentials.accountId}
              onChange={(e) =>
                setTestCredentials((prev) => ({
                  ...prev,
                  accountId: e.target.value,
                }))
              }
              className="px-2 py-1 text-sm border rounded"
            />
            <input
              type="password"
              placeholder="Password/API Key"
              value={testCredentials.password}
              onChange={(e) =>
                setTestCredentials((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              className="px-2 py-1 text-sm border rounded"
            />
            <select
              value={testCredentials.server}
              onChange={(e) =>
                setTestCredentials((prev) => ({
                  ...prev,
                  server: e.target.value,
                }))
              }
              className="px-2 py-1 text-sm border rounded"
            >
              <option value="demo">Demo Server</option>
              <option value="live">Live Server</option>
            </select>
          </div>
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>

          {testResult && (
            <div
              className={`flex items-center gap-2 p-2 rounded text-sm ${
                testResult.success
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-100 rounded p-2 text-xs text-blue-800">
        <strong>Tip:</strong> For testing without real credentials, enter dummy
        account ID and password. The system will return demo account data.
      </div>
    </div>
  );
}

export function BrokerTestingGuide() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left font-medium text-amber-900 hover:text-amber-700"
      >
        <Info className="w-5 h-5" />
        <span>Need help connecting to a broker?</span>
        <span className="ml-auto text-sm">{expanded ? "▼" : "▶"}</span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 text-sm text-amber-900">
          <p>
            <strong>Quick Start:</strong> Use OANDA with a free practice account
            for testing.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(brokerTestInfo).map(([key, info]) => (
              <div
                key={key}
                className="bg-white rounded border border-amber-200 p-3"
              >
                <h4 className="font-semibold text-amber-900">{info.name}</h4>
                <p className="text-xs text-amber-800">{info.platform}</p>
                <p className="text-xs text-amber-700 mt-2">
                  {info.description}
                </p>
                <a
                  href={info.setupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 text-xs font-medium mt-2"
                >
                  Setup
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>

          <a
            href="/BROKER_TESTING_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium text-sm mt-2"
          >
            View Full Testing Guide
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}
