# USAePay Integration Suite

A comprehensive USAePay payment integration with both REST and SOAP API support, perfect for learning and testing.

## What's Included

### REST API (`usaepay.html`)
- **REST API Testing** - Tokenization and direct card transactions
- **PayJS Integration** - Embedded card entry with PCI compliance
- **Transaction Query** - Look up transaction details
- **Clean UI** - Professional tabbed interface

### SOAP API (`usaepay-soap.html`)
- **SOAP Transactions** - Full SOAP API implementation
- **Transaction Details** - Retrieve detailed transaction information
- **Card Tokenization** - Save cards for future use
- **Separate Interface** - Dedicated page for SOAP API testing

## Setup

### 1. Add Your Credentials

Update `appsettings.json` with your USAePay sandbox credentials:

```json
{
  "USAePay": {
    "ApiKey": "your-source-key-here",
    "Pin": "your-pin-here",
    "BaseUrl": "https://sandbox.usaepay.com/gate"
  }
}
```

### 2. Test Cards

Use these test card numbers in sandbox:

- **Visa (Approved):** `4000000000000002`
- **Visa (Declined):** `4000000000000010`
- **Mastercard:** `5555555555554444`
- **Expiry:** Any future date like `12/25`
- **CVV:** Any 3-4 digits like `123`

## How It Works

### Backend (`UsaEPayController.cs`)

1. **Gets form data** from the frontend
2. **Generates UMhash** for authentication using MD5 hash
3. **Sends form-encoded request** to USAePay gateway
4. **Parses URL-encoded response** back to JSON
5. **Returns both parsed data and raw response** for learning

### Frontend (`usaepay.html` + `usaepay.js`)

1. **Simple form** with all required USAePay fields
2. **Basic formatting** for card number and expiry date
3. **Sends JSON to backend** via fetch API
4. **Displays results** with debug information

## Key Learning Points

### USAePay Authentication

```csharp
// UMhash format: algorithm/seed/hash/responseRequest
// Example: "m/ABC12345/5f4dcc3b5aa765d61d8327deb882cf99/n"

var preHashData = "sale:9874:10.00:INV-20231208:ABC12345";
var hash = MD5(preHashData);
var umhash = $"m/ABC12345/{hash}/n";
```

### Request Format

USAePay uses **form-encoded parameters**, not JSON:

```
UMkey=your-source-key
UMhash=m/ABC12345/hash-value/n
UMcommand=sale
UMamount=10.00
UMcard=4000000000000002
...
```

### Response Format

USAePay returns **URL-encoded parameters**:

```
UMstatus=Approved&UMauthCode=123456&UMrefNum=12345&UMavsResult=Address%3A+Match
```

## Files

### REST API
- **Controller:** `Controllers/UsaEPayController.cs` - REST API backend
- **Frontend:** `wwwroot/USAePay/usaepay.html` - Main interface
- **JavaScript:** `wwwroot/USAePay/usaepay.js` - REST API handling

### SOAP API
- **Controller:** `Controllers/UsaEPaySOAPController.cs` - SOAP API backend
- **Frontend:** `wwwroot/USAePay/usaepay-soap.html` - SOAP interface
- **JavaScript:** `wwwroot/USAePay/usaepay-soap.js` - SOAP API handling

### Configuration
- **Config:** `appsettings.json` - API credentials

## Testing

### REST API
1. Navigate to `/USAePay/usaepay.html`
2. Choose from multiple tabs:
   - **REST API** - Direct API calls with tokenization
   - **PayJS Transaction** - Embedded card entry
   - **Query** - Transaction lookup
3. Use test card `4000000000000002`
4. View results in the side panel

### SOAP API
1. Navigate to `/USAePay/usaepay-soap.html`
2. Test SOAP transactions in the **Transaction** tab
3. Use **Transaction Details** tab to retrieve transaction information
4. Enter a transaction key from a previous transaction to see full details
5. Test card tokenization by enabling the "Save Card" option

### Navigation
- Click "SOAP API →" button on REST page to switch to SOAP
- Click "← Back to REST API" link to return to REST interface

## SOAP API Features

### Available Endpoints

#### Transaction Processing
- **POST `/api/UsaEPaySOAP/run-sale`** - Process a sale transaction
  - Supports card tokenization
  - Returns full transaction details
  - Includes auth code, AVS, CVV results

#### Transaction Details
- **GET `/api/UsaEPaySOAP/transaction-details/{transactionKey}`** - Get transaction details
  - Retrieve complete transaction information
  - View billing address details
  - Check transaction status and history
  - See verification results (AVS, CVV2)

### Transaction Details Response

The transaction details endpoint returns comprehensive information:

```json
{
  "key": "transaction-key",
  "refNum": "reference-number",
  "status": "Pending",
  "amount": 10.00,
  "authCode": "123456",
  "avsResult": "Address: Match ZIP: Match",
  "cvv2Result": "Match",
  "cardType": "Visa",
  "cardNumber": "4***********0002",
  "description": "Sale",
  "dateTime": "2024-01-01T12:00:00",
  "billingFirstName": "John",
  "billingLastName": "Doe",
  "billingAddress": "123 Main St",
  "billingCity": "Anytown",
  "billingState": "CA",
  "billingZip": "90210"
}
```

## Next Steps

Once you understand this integration, you can:

- **Add more SOAP methods** - Implement void, capture, refund operations
- **Implement customer management** - Add/update/delete customer profiles
- **Add recurring billing** - Set up subscription payments
- **Enhanced error handling** - Improve error messages and retry logic
- **Security features** - Add authentication and authorization

This integration demonstrates both REST and SOAP approaches to help you understand USAePay's complete API ecosystem!
