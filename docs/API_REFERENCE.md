# API Reference

## Overview

REST API for payment processing, health monitoring, and system management. All endpoints return JSON responses.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## Authentication

No authentication required for local development. Consider API key authentication for production.

## Endpoints

### Health Check

#### `GET /health`

Returns application health status.

**Response:**

```json
{
  "status": "healthy",
  "service": "merchant-app",
  "timestamp": "2024-07-14T14:30:00.000Z",
  "memoryUsage": {
    "total": 350,
    "used": 315,
    "percentage": 90
  },
  "responseTime": 0
}
```

**Status Codes:**

- `200` - Service is healthy
- `503` - Service is unhealthy

### Provider Health

#### `GET /health/providers`

Returns health status of all configured providers.

**Response:**

```json
{
  "blockchain": [{
    "provider": "Alchemy Primary",
    "type": "blockchain",
    "healthy": true,
    "lastCheck": "2024-07-14T14:30:00.000Z",
    "responseTime": 45
  }],
  "price": [{
    "provider": "CoinGecko Primary",
    "type": "price",
    "healthy": true,
    "lastCheck": "2024-07-14T14:30:00.000Z",
    "responseTime": 120
  }],
  "explorer": [{
    "provider": "Etherscan Primary",
    "type": "explorer",
    "healthy": true,
    "lastCheck": "2024-07-14T14:30:00.000Z",
    "responseTime": 30
  }]
}
```

### Configuration

#### `GET /config`

Returns current provider configuration.

**Response:**

```json
{
  "blockchain": [{
    "type": "alchemy",
    "name": "Alchemy Primary",
    "priority": 1,
    "enabled": true
  }],
  "price": [{
    "type": "coingecko",
    "name": "CoinGecko Primary",
    "priority": 1,
    "enabled": true
  }],
  "explorer": [{
    "type": "etherscan",
    "name": "Etherscan Primary",
    "priority": 1,
    "enabled": true
  }],
  "fallbackEnabled": true,
  "healthCheckInterval": 60
}
```

## WebSocket Events

Real-time updates via WebSocket connections.

### Connection

```
ws://localhost:3000/ws
```

### Events

#### Transaction Monitoring

**Event:** `transaction:monitor`

**Payload:**

```json
{
  "type": "transaction:monitor",
  "data": {
    "hash": "0x1234567890abcdef...",
    "chainId": 1,
    "status": "pending",
    "timestamp": "2024-07-14T14:30:00.000Z"
  }
}
```

**Status Values:**

- `pending` - Transaction submitted, waiting for confirmation
- `confirmed` - Transaction confirmed on blockchain
- `failed` - Transaction failed or reverted

#### Provider Health Updates

**Event:** `provider:health`

**Payload:**

```json
{
  "type": "provider:health",
  "data": {
    "provider": "Alchemy Primary",
    "type": "blockchain",
    "healthy": true,
    "lastCheck": "2024-07-14T14:30:00.000Z",
    "responseTime": 45
  }
}
```

## Error Responses

All endpoints may return error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "amount",
      "issue": "Must be a positive number"
    }
  },
  "timestamp": "2024-07-14T14:30:00.000Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Invalid request parameters
- `PROVIDER_ERROR` - Provider service unavailable
- `NETWORK_ERROR` - Network connectivity issues
- `INTERNAL_ERROR` - Internal server error

## Examples

### Health Check

```bash
curl -X GET http://localhost:3000/health
```

### Provider Health

```bash
curl -X GET http://localhost:3000/health/providers
```

### WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = function() {
  console.log('Connected to WebSocket');
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

ws.onclose = function() {
  console.log('Disconnected from WebSocket');
};
```

## Testing

```bash
npm test -- tests/api/
npm test -- tests/api/health.test.ts
```

## Related Documentation

- [Provider System](PROVIDER_SYSTEM.md)
- [Quick Reference](QUICK_REFERENCE.md)
- [Deployment Guide](README-DEPLOYMENT.md)

---
