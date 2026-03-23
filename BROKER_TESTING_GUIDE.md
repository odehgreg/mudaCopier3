# Broker API Integration Testing Guide

## Overview

This guide explains how to test the mudaCopier3 broker API integration with real brokers.

## Available Brokers for Testing

### 1. OANDA (Recommended for Testing)

**Platform:** MT5  
**API Type:** Native REST API (Official)  
**Status:** ✅ Fully Supported

**Benefits:**

- Real public API with excellent documentation
- Free practice (sandbox) accounts
- No trading volume requirements
- Great for development and testing

**Setup Instructions:**

1. Create a free OANDA demo account at https://practice.oanda.com
2. Go to Account Settings → Manage API Tokens
3. Create a new API token (note: keep it secret)
4. Copy your Account ID (format: `001-001-XXXXXX-XXX`)

**In mudaCopier3:**

- Broker: `OANDA`
- Platform: `MT5`
- Account ID: Your OANDA account ID
- Password: Your API token (NOT your trading password)
- Server: `OANDA Practice` (sandbox)

**Test Endpoint:**

```bash
curl -X POST http://localhost:54321/functions/v1/fetch-broker-accounts \
  -H "Content-Type: application/json" \
  -d '{
    "broker_name": "OANDA",
    "platform": "MT5",
    "account_id": "001-001-XXXXXX-XXX",
    "password": "your-api-token",
    "server": "OANDA Practice"
  }'
```

---

### 2. FTMO (Prop Trading Firm)

**Platform:** MT4/MT5  
**API Type:** MT4/MT5 REST Bridge  
**Status:** ✅ Supported with Bridge

**Setup Instructions:**

1. Register for FTMO at https://ftmo.com
2. Complete the challenge
3. Get your trading account credentials
4. Use your account number and password

**Important:** FTMO provides MT4/MT5 accounts. The API bridge requires:

- Valid trading account (not demo)
- Connection to the MT4/MT5 REST bridge

**In mudaCopier3:**

- Broker: `FTMO`
- Platform: `MT4` or `MT5`
- Account ID: Your FTMO account number
- Password: Your MT4/MT5 password
- Server: `FTMO Live`

---

### 3. Exness (Retail Broker)

**Platform:** MT4/MT5  
**API Type:** MT4/MT5 REST Bridge  
**Status:** ✅ Supported with Bridge

**Setup Instructions:**

1. Create Exness account at https://exness.com
2. Create a trading account (demo or live)
3. Note your account number and password

**In mudaCopier3:**

- Broker: `Exness`
- Platform: `MT5`
- Account ID: Your Exness account number
- Password: Your account password
- Server: `Exness-MT5 Real`

---

### 4. IC Markets

**Platform:** MT5, cTrader  
**API Type:** MT4/MT5 REST Bridge + cTrader OpenAPI  
**Status:** ✅ Supported

**Setup Instructions:**

1. Open IC Markets account at https://icmarkets.com
2. Create trading account
3. Get credentials from account settings

**In mudaCopier3:**

- Broker: `IC Markets`
- Platform: `MT5` or `cTrader`
- Account ID: Your IC Markets account number
- Password: Your password
- Server: `IC Markets Live`

---

### 5. Spotware / cTrader OpenAPI

**Platform:** cTrader  
**API Type:** Official cTrader OpenAPI  
**Status:** ✅ Fully Supported

**Setup Instructions:**

1. Register at https://ctrader.com
2. Create application credentials
3. Get Client ID and Client Secret

**In mudaCopier3:**

- Broker: `Spotware`
- Platform: `cTrader`
- Account ID: Your cTrader Client ID
- Password: Your cTrader Client Secret
- Server: `cTrader Live`

---

## Testing Workflow

### Step 1: Test Available Brokers

Check which brokers are available for testing:

```bash
curl "http://localhost:54321/functions/v1/fetch-broker-accounts?test=true"
```

This returns:

```json
{
  "testBrokers": [
    {
      "name": "OANDA",
      "platform": "MT5",
      "description": "Real API available. Need valid OANDA API token",
      "apiUrl": "https://api-fxpractice.oanda.com"
    },
    ...
  ]
}
```

### Step 2: Test with OANDA (Easiest)

1. Create demo account at https://practice.oanda.com
2. Get API token
3. Test connection:

```bash
curl -X POST http://localhost:54321/functions/v1/fetch-broker-accounts \
  -H "Content-Type: application/json" \
  -d '{
    "broker_name": "OANDA",
    "platform": "MT5",
    "account_id": "001-001-123456-789",
    "password": "your-api-token-here",
    "server": "OANDA Practice"
  }'
```

### Step 3: Test in UI

1. Start the development server: `npm run dev`
2. Navigate to Trading Accounts page
3. Click "Add Account"
4. Select broker: `OANDA`
5. Select platform: `MT5`
6. Enter account ID and API token
7. Click "Fetch Accounts from Broker"

---

## Response Format

### Success Response

```json
{
  "accounts": [
    {
      "account_number": "001-001-123456-789",
      "account_name": "OANDA Account",
      "balance": 50000,
      "equity": 50000,
      "currency": "USD",
      "platform": "MT5",
      "server": "OANDA Practice"
    }
  ]
}
```

### Error Response

```json
{
  "error": "Invalid OANDA API token or account ID",
  "hint": "Check broker credentials and API endpoint availability. Add ?test=true to see available brokers."
}
```

---

## Troubleshooting

### "Invalid API Token"

- Ensure you're using the API token, not your password
- Check token hasn't expired
- Verify token has appropriate permissions

### "Connection Timeout"

- Check internet connection
- Verify broker API endpoint is accessible
- Some brokers may block requests from certain regions

### "No Accounts Found"

- Verify account exists
- Check credentials are correct
- Some brokers require account activation

### "Unsupported Platform"

- Ensure broker supports selected platform
- Check broker supports MT4, MT5, or cTrader

---

## Real Broker API Documentation

### OANDA

- **Docs:** https://developer.oanda.com
- **Practice API:** https://api-fxpractice.oanda.com
- **Live API:** https://api-fxlive.oanda.com
- **Authentication:** Bearer token (API key)

### cTrader

- **Docs:** https://ctrader.com/api
- **API URL:** https://openapi.ctrader.com
- **Authentication:** OAuth 2.0

### MetaTrader

- **MT4/MT5 API:** Official terminal API (requires bridge server)
- **Common Bridges:** MT4 Manager, MetaApi, or custom solutions

---

## Adding More Brokers

To add support for additional brokers:

1. **Update broker list** in `supabase/migrations/20260227_populate_comprehensive_brokers.sql`
2. **Add API endpoint** to `brokerApiEndpoints` in `index.ts`
3. **Implement fetch function** (e.g., `fetchMyBrokerAccounts()`)
4. **Add to switch statement** in `connectToBrokerAndFetchAccounts()`
5. **Test thoroughly** before deploying

---

## Security Notes

⚠️ **Important:**

- Never commit real API keys or passwords
- Use environment variables for sensitive data
- API keys are stored encrypted in database
- Never share your trading passwords
- Use demo/sandbox accounts for testing when possible
- Rotate API keys regularly

---

## Performance Tips

- Cache account data for 5-10 minutes
- Implement connection pooling
- Add rate limiting (some brokers limit API calls)
- Use async/await for concurrent requests
- Monitor for API quota limits

---

## Next Steps

1. ✅ Test with OANDA demo account
2. ⚙️ Set up automatic balance synchronization
3. 📊 Implement trade history fetching
4. 🔄 Add periodic account sync jobs
5. 📱 Build mobile app integration

---

## Support

For issues or questions:

1. Check the test endpoint: `?test=true`
2. Review edge function logs in Supabase dashboard
3. Test API manually with curl before UI testing
4. Check broker documentation for API requirements
