# MyWebAPI - Payment Gateway Integration Project

A .NET 8 Web API project demonstrating multiple payment gateway integrations including NMI (Network Merchants Inc.), USAePay, eKashu, and various payment processing methods.

## 🚀 Quick Start

### Prerequisites

- .NET 8 SDK
- Node.js (for frontend dependencies)

### Running the Application

```bash
# Navigate to project directory
cd MyWebAPI

# Run the application
dotnet run
```

The application will be available at:

- **HTTPS:** `https://localhost:5125`
- **HTTP:** `http://localhost:5126`

## 📁 Project Structure

```
MyWebAPI/
├── Controllers/           # C# API Controllers (backend)
├── wwwroot/              # Static frontend files (HTML, JS, CSS)
│   ├── CloudApi/         # Cloud POS integration
│   ├── PartnerApi/       # NMI V4 Partner API
│   ├── PaymentComponent/ # NMI Payment Component with 3DS
│   ├── USAePay/          # USAePay integration
│   └── test/             # Test utilities and factories
├── Utilities/            # Helper classes
├── keys/                 # Data protection keys
├── Program.cs            # Application entry point
└── Startup.cs            # Service configuration
```

## 🔌 Payment Integrations

This project contains **multiple independent payment integrations**, each with matching frontend and backend files:

### 1. NMI Collect.js Integration

**Files:** `Main.html`, `main.js`

The primary NMI integration using Collect.js for PCI-compliant card tokenization.

| Feature           | Description                                  |
| ----------------- | -------------------------------------------- |
| Card Tokenization | Uses Collect.js iFrame for secure card entry |
| ACH Payments      | Supports check/ACH payment methods           |
| Google Pay        | Express checkout integration                 |
| Dynamic Fields    | Add custom transaction variables             |

**Backend:** `PaymentController.cs` handles direct post to NMI's `transact.php` endpoint.

---

### 2. NMI Payment Component with 3D Secure

**Files:** `PaymentComponent/paymentComponent.html`, `PaymentComponent/PaymentComponent.js`

Modern payment widget using the `@nmipayments/nmi-pay` npm package with 3D Secure authentication.

| Feature                  | Description                              |
| ------------------------ | ---------------------------------------- |
| 3D Secure 2.0            | Full challenge/frictionless flow support |
| Multiple Payment Methods | Card, ACH, Apple Pay, Google Pay         |
| Token Lookup             | Displays masked card info from tokens    |
| Auto-fill Test Data      | Pre-populates form for testing           |

**Backend:** `PaymentApiController.cs` processes payments with 3DS authentication data.

---

### 3. Cloud POS (Customer Present)

**Files:** `CloudApi/cloudPOS.html`, `CloudApi/cloudPOS.js`, `CloudApi/cloudPOS.css`

NMI Customer-Present Cloud API integration for in-person payment terminals.

| Feature                | Description                               |
| ---------------------- | ----------------------------------------- |
| Device Management      | Discover and manage POI devices           |
| Transaction Processing | Sale, Auth, Capture, Void, Refund         |
| Async/Sync Modes       | Both processing modes supported           |
| POI Device Prompts     | Tip, signature, keyed entry options       |
| Standalone Inputs      | Signature capture, Yes/No, Menu selection |

**Backend:** `CloudController.cs` proxies requests to NMI's device and transaction APIs.

---

### 4. USAePay Integration

**Files:** `USAePay/usaepay.html`, `USAePay/usaepay.js`

Complete USAePay REST API integration with Pay.js for secure card entry.

| Feature                 | Description                      |
| ----------------------- | -------------------------------- |
| Card Entry Tokenization | Secure card tokenization via API |
| Pay.js Widget           | Client-side secure payment entry |
| Transaction Processing  | Sales, token transactions        |
| Transaction Query       | Look up transaction details      |

**Backend:** `UsaEPayController.cs` handles authentication and API calls to USAePay sandbox.

---

### 5. Partner API (NMI V4)

**Files:** `PartnerApi/partnerApi.html`, `PartnerApi/partnerApi.js`, `PartnerApi/partnerApi.css`

NMI V4 Partner API interface for querying transaction data across merchants.

| Feature             | Description                            |
| ------------------- | -------------------------------------- |
| Transaction Reports | Query transactions by various criteria |
| Date Range Filters  | Filter by start/end dates              |
| Amount Filters      | Min/max amount filtering               |
| Debug Mode          | View exact API request structure       |

**Backend:** `PartnerController.cs` handles V4 API authentication and request formatting.

---

### 6. 3DS Browser Integration

**Files:** `3DSBrowser.html`, `3DSWebAdapter.js`, `3DScallback.html`

Direct 3D Secure Server integration for testing authentication flows.

| Feature            | Description                    |
| ------------------ | ------------------------------ |
| Enrollment Testing | Test various 3DS scenarios     |
| Challenge Flow     | Full challenge flow testing    |
| Callback Handling  | Process 3DS callback responses |

**Backend:** Enrollment and init endpoints for 3DS server communication.

---

### 7. eKashu Integration

**Files:** `eKashu.html`

UK-based payment gateway integration with SHA256 HMAC hash generation.

| Feature          | Description                     |
| ---------------- | ------------------------------- |
| Hash Generation  | Server-side SHA256 HMAC signing |
| Payment Redirect | Form-based payment submission   |
| Local Testing    | Simulate eKashu responses       |
| Debug Tools      | View hash generation details    |

**Backend:** `EKashuController.cs` generates and validates hash codes.

---

### 8. Async Status API

**Files:** `ayncStatus.html`, `async.js`

Check status of asynchronous transactions.

**Backend:** `AsyncStatusController.cs` polls transaction status.

---

## 🎨 Shared Components

### Navigation (`utilities.js`)

The `fillNavBar()` function provides a consistent navigation experience across all pages. Each page includes:

```html
<nav id="mainNavBar"></nav>
<script src="utilities.js"></script>
```

### Styling (`main.css`)

Common styles for forms, buttons, spinners, and layout.

---

## 🔧 Backend Controllers

| Controller              | Route                  | Purpose                      |
| ----------------------- | ---------------------- | ---------------------------- |
| `PaymentController`     | `/api/pay`, `/payment` | NMI Direct Post transactions |
| `PaymentApiController`  | `/api/pay`             | Payment Component with 3DS   |
| `CloudController`       | `/cloud/*`             | Customer-Present Cloud API   |
| `UsaEPayController`     | `/api/UsaEPay/*`       | USAePay REST API             |
| `PartnerController`     | `/api/partner/*`       | NMI V4 Partner API           |
| `EKashuController`      | `/api/EKashu/*`        | eKashu hash generation       |
| `AsyncStatusController` | `/async`               | Transaction status polling   |
| `CardTypeController`    | `/api/CardType/*`      | BIN/card type lookup         |
| `QueryController`       | `/api/Query/*`         | Transaction queries          |

---

## 🧪 Testing

### Test Credentials

Each integration uses sandbox/test credentials configured in `appsettings.json` or as constants in code. See individual integration sections for test card numbers.

### Test Data Utilities

Located in `wwwroot/test/`:

- `devFillers.js` - Auto-fill form fields with test data
- `factories/` - Data generation factories for testing

### Common Test Cards

| Card Number        | Description             |
| ------------------ | ----------------------- |
| `4111111111111111` | Standard Visa test card |
| `4000000000002701` | 3DS Frictionless flow   |
| `4100000000005000` | 3DS Challenge flow      |
| `4000000000000002` | USAePay test card       |

---

## 📝 Configuration

### appsettings.json

```json
{
  "MyAppSettings": {
    "ApiKey": "your-nmi-security-key"
  },
  "USAePay": {
    "ApiKey": "your-usaepay-api-key",
    "Pin": "your-pin",
    "BaseUrl": "https://sandbox.usaepay.com/api/v2/"
  }
}
```

### User Secrets (Development)

API keys can be stored securely using .NET User Secrets:

```bash
dotnet user-secrets set "MyAppSettings:ApiKey" "your-key"
```

---

## 📚 Additional Documentation

- **[Controllers README](Controllers/README.md)** - Detailed backend API documentation
- **[Frontend README](wwwroot/README.md)** - Frontend file organization and usage
- **[USAePay README](wwwroot/USAePay/README.md)** - USAePay integration details
- **[Test Utilities README](wwwroot/test/README.md)** - Test data factories

---

## 🔗 External Resources

- [NMI Developer Portal](https://secure.nmi.com/)
- [NMI Payment Component Docs](https://secure.nmi.com/merchants/resources/integration/)
- [USAePay Developer Documentation](https://usaepay.info/developer)
- [eKashu Integration Guide](https://ekashu.com/documentation)

---

## 📄 License

Private - For demonstration and testing purposes only.
