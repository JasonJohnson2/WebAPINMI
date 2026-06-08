# Controllers Documentation

This directory contains the C# API controllers that serve as the backend for all payment integrations.

## Overview

All controllers follow the ASP.NET Core MVC pattern and use dependency injection for `IHttpClientFactory`, `IConfiguration`, and `ILogger`.

---

## Controller Reference

### PaymentController.cs
**Route:** `/api/pay`, `/payment`

Handles NMI Direct Post API transactions using Collect.js payment tokens.

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payment` | Process payment via form data |
| POST | `/api/pay` | Process payment via JSON |

#### Key Features
- Accepts payment tokens from Collect.js
- Supports 3DS authentication data (cavv, xid, eci, etc.)
- Parses NMI query string responses
- Handles customer/billing information

#### Request Example (JSON)
```json
{
  "paymentToken": "token_from_collectjs",
  "amount": 10.00,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "address1": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zip": "10001",
  "country": "US"
}
```

#### 3DS Fields (Optional)
```json
{
  "cardHolderAuth": "verified",
  "cavv": "base64_encoded_cavv",
  "eci": "05",
  "directoryServerId": "server_id",
  "threeDsVersion": "2.1.0",
  "xid": "transaction_id"
}
```

---

### CloudController.cs
**Route:** `/cloud/*`

Handles NMI Customer-Present Cloud API for in-person payment terminals.

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/cloud` | Process transaction on POI device |
| GET | `/cloud/devices` | List registered devices |
| GET | `/cloud/asyncstatus/{guid}` | Get async transaction status |
| GET | `/cloud/devices/sign/{deviceId}` | Start signature capture |
| GET | `/cloud/devices/yesno/{deviceId}` | Start yes/no prompt |
| POST | `/cloud/devices/menuselection/{deviceId}` | Start menu selection |
| GET | `/cloud/asyncdevicestatus/{guid}` | Get async device input status |

#### Authentication
All device endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <security_key>
```

#### Transaction Request (Form Data)
```
type=sale
amount=10.00
poi_device_id=device_123
response_method=synchronous|asynchronous
```

#### POI Device Prompts (Optional)
```
poi_prompt_tip=true
poi_prompt_quicktip_percentages=15.00,18.00,20.00
poi_prompt_signature=true
poi_enable_keyed=true
poi_keyed_type=cnp
```

---

### UsaEPayController.cs
**Route:** `/api/UsaEPay/*`

Handles USAePay REST API v2 integration.

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/UsaEPay/sale` | Process a sale transaction |
| POST | `/api/UsaEPay/tokenize` | Save card and get token |
| POST | `/api/UsaEPay/tokenTransaction` | Process transaction with token |
| GET | `/api/UsaEPay/query/{transactionKey}` | Query transaction details |

#### Authentication
Uses SHA256 hash-based authentication:
1. Generate random seed
2. Create prehash: `apiKey + seed + pin`
3. SHA256 hash the prehash
4. Format: `s2/{seed}/{hash}`
5. Base64 encode: `apiKey:s2/{seed}/{hash}`

#### Sale Request Example
```json
{
  "command": "sale",
  "amount": 10.00,
  "paymentKey": "payment_key_from_payjs",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "address": "123 Main St",
  "city": "Anytown",
  "state": "CA",
  "zipCode": "90210"
}
```

#### Tokenization Request
```json
{
  "command": "cc:save",
  "cardNumber": "4000000000000002",
  "expirationDate": "1225",
  "cvc": "123",
  "cardholder": "John Doe"
}
```

---

### PartnerController.cs
**Route:** `/api/partner/*`

Handles NMI V4 Partner API for reporting and merchant management.

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/partner/transaction-data` | Query transaction reports |
| GET | `/api/partner/health` | Health check |
| POST | `/api/partner/debug-request` | Debug request structure |

#### Transaction Data Request
```json
{
  "api_key": "your_partner_api_key",
  "merchant_id": "merchant_123",
  "transaction_id": "txn_456",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z",
  "transaction_status": "complete",
  "min_amount": 10.00,
  "max_amount": 1000.00
}
```

#### V4 API Request Format
The controller transforms the request to V4 format:
```json
{
  "maxResults": "100",
  "merchantId": "merchant_123",
  "transactionIds": ["txn_456"],
  "date": {
    "start": "2024-01-01T00:00:00+00:00",
    "end": "2024-12-31T23:59:59+00:00"
  },
  "statuses": ["complete"],
  "amount": {
    "min": 10.00,
    "max": 1000.00
  }
}
```

---

### EKashuController.cs
**Route:** `/api/EKashu/*`

Handles eKashu payment gateway hash generation and validation.

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/EKashu/generate-hash` | Generate SHA256 HMAC hash |
| POST | `/api/EKashu/debug-hash` | Debug hash generation |
| POST | `/api/EKashu/debug-hash-detailed` | Detailed hash debugging |
| POST | `/api/EKashu/simulate-ekashu-receive` | Test hash validation |

#### Hash Generation
eKashu 2.0.0 requires SHA256 HMAC signing of form parameters:
1. Sort ekashu_* parameters alphabetically
2. Concatenate: `key1=value1&key2=value2...`
3. HMAC-SHA256 sign with seller key
4. Base64 encode result

---

### AsyncStatusController.cs
**Route:** `/async`

Polls for asynchronous transaction status.

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/async` | Check transaction status |

---

### CardTypeController.cs
**Route:** `/api/CardType/*`

Performs BIN (Bank Identification Number) lookups.

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/CardType/check` | Look up card type by BIN |

#### Request
```json
{
  "ccnumber": "411111"
}
```

---

### QueryController.cs
**Route:** `/api/Query/*`

Handles NMI Query API for transaction lookups.

---

### AiController.cs
**Route:** `/api/Ai/*`

AI-related endpoints (experimental).

---

### FakeDataController.cs
**Route:** `/api/FakeData/*`

Generates fake test data using Bogus library.

---

## Shared Utilities

### CacheKeyGenerator.cs
Generates consistent cache keys for request deduplication:
```csharp
var cacheKey = CacheKeyGenerator.GenerateCacheKey(requestDictionary);
```

### PrettyPrint.cs
Formats NMI query string responses for readability:
```csharp
var formatted = PrettyPrint.PrettyPrintResponse(responseString);
// Output: "key1: value1\nkey2: value2"
```

---

## Configuration

### appsettings.json Keys
```json
{
  "MyAppSettings": {
    "ApiKey": "nmi_security_key"
  },
  "USAePay": {
    "ApiKey": "usaepay_api_key",
    "Pin": "pin_code",
    "BaseUrl": "https://sandbox.usaepay.com/api/v2/"
  }
}
```

### Dependency Injection
All controllers use:
- `IHttpClientFactory` - HTTP client management
- `IConfiguration` - Settings access
- `ILogger<T>` - Structured logging
- `IMemoryCache` - Response caching (Cloud controller)

