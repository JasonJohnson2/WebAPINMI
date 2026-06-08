# Frontend Documentation

This directory contains all static frontend files for the payment integration demos.

## Directory Structure

```
wwwroot/
├── CloudApi/              # Cloud POS integration
│   ├── cloudPOS.html      # Main Cloud POS interface
│   ├── cloudPOS.js        # CloudPOSSystem class
│   └── cloudPOS.css       # Cloud POS styling
│
├── PartnerApi/            # NMI V4 Partner API
│   ├── partnerApi.html    # Transaction query interface
│   ├── partnerApi.js      # API client functions
│   └── partnerApi.css     # Partner API styling
│
├── PaymentComponent/      # NMI Payment Component + 3DS
│   ├── paymentComponent.html  # Checkout form
│   └── PaymentComponent.js    # ES Module with 3DS handling
│
├── USAePay/               # USAePay integration
│   ├── usaepay.html       # Tabbed interface (tokenize/process/query)
│   ├── usaepay.js         # USAePay client logic
│   └── README.md          # USAePay-specific docs
│
├── test/                  # Test utilities
│   ├── devFillers.js      # Form auto-fill functions
│   ├── factories/         # Test data factories
│   │   ├── userFactory.js # Generate fake user data
│   │   └── orderFactory.js # Generate fake order data
│   └── README.md          # Test utilities docs
│
├── Collect Checkout/      # NMI Collect checkout pages
│   ├── checkout.html      # Payment page
│   ├── success.html       # Success redirect
│   └── cancel.html        # Cancel redirect
│
├── FFC Projects/          # Miscellaneous projects
│   └── Roman Numeral Convertor/
│
├── Main.html              # NMI Collect.js integration
├── main.js                # Collect.js configuration
├── main.css               # Global styles
├── utilities.js           # Shared utilities (navbar)
│
├── 3DSBrowser.html        # 3DS Server testing
├── 3DSWebAdapter.js       # 3DS callbacks and flow
├── 3DScallback.html       # 3DS callback handler
│
├── eKashu.html            # eKashu payment form
├── ayncStatus.html        # Async status checker
├── async.js               # Async polling logic
└── success.html           # Generic success page
```

---

## File Relationships

### Naming Convention

Files are grouped by feature using consistent naming:

- `x.html` + `x.js` = Frontend pair
- `x.css` = Optional styling

| HTML File               | JavaScript File       | CSS File         | Backend Controller      |
| ----------------------- | --------------------- | ---------------- | ----------------------- |
| `Main.html`             | `main.js`             | `main.css`       | `PaymentController`     |
| `cloudPOS.html`         | `cloudPOS.js`         | `cloudPOS.css`   | `CloudController`       |
| `partnerApi.html`       | `partnerApi.js`       | `partnerApi.css` | `PartnerController`     |
| `paymentComponent.html` | `PaymentComponent.js` | -                | `PaymentController`     |
| `usaepay.html`          | `usaepay.js`          | -                | `UsaEPayController`     |
| `3DSBrowser.html`       | `3DSWebAdapter.js`    | -                | Enrollment endpoints    |
| `eKashu.html`           | (inline)              | -                | `EKashuController`      |
| `ayncStatus.html`       | `async.js`            | -                | `AsyncStatusController` |

---

## Shared Components

### utilities.js

Provides the shared navigation bar and utility functions.

#### Navigation Bar

Every page includes:

```html
<nav id="mainNavBar"></nav>
<script src="utilities.js"></script>
```

On DOM ready, `fillNavBar()` injects a consistent navigation menu with links to:

- Payment API (Main.html)
- Cloud Transactions (cloudPOS.html)
- Async Status API (ayncStatus.html)
- 3DS Browser (3DSBrowser.html)
- eKashu (eKashu.html)
- Payment Component (paymentComponent.html)
- Partner API (partnerApi.html)
- USAePay (usaepay.html)

#### Active State

The navbar automatically highlights the current page based on `window.location.pathname`.

### main.css

Global styles including:

- Form controls styling
- Button hover effects
- Spinner/loading indicators
- Card/panel layouts

---

## Integration Details

### 1. Main.html (NMI Collect.js)

**Purpose:** Primary NMI payment form using Collect.js iframes.

**Key Features:**

- Inline card fields (ccnumber, ccexp, cvv)
- ACH/check payment toggle
- Google Pay button
- Dynamic field addition
- 3DS field support (cavv, xid, etc.)

**Collect.js Configuration (in HTML):**

```html
<script
  src="https://secure.nmi.com/token/Collect.js"
  data-tokenization-key="YOUR_KEY"
  data-variant="inline"
  data-field-ccnumber-enable-card-brand-previews="true"
  ...
></script>
```

**main.js Functions:**

- `configureCollectJS()` - Sets up token callback
- `showCardFields()` / `showCheckFields()` - Toggle payment method
- `prettyPrintResponse()` - Format API responses

---

### 2. cloudPOS.html (Cloud POS)

**Purpose:** In-person payment processing with POI devices.

**Key Features:**

- Security key configuration
- Device discovery and selection
- Transaction processing (sale, auth, capture, void, refund)
- Sync/async mode toggle
- POI device prompts (tip, signature, keyed entry)
- Standalone device inputs (signature, yes/no, menu)
- Transaction history

**cloudPOS.js Architecture:**

```javascript
class CloudPOSSystem {
  constructor() {
    /* init */
  }

  // Device Management
  async refreshDevices() {}
  async discoverDevices() {}

  // Transactions
  async handleTransaction() {}
  async processTransaction() {}

  // Async Status
  async checkAsyncStatus() {}

  // Standalone Inputs
  async startSignatureCapture() {}
  async startYesNoPrompt() {}
  async startMenuSelection() {}
}
```

---

### 3. paymentComponent.html (Payment Component)

**Purpose:** Modern payment widget with 3D Secure.

**Key Features:**

- Uses `@nmipayments/nmi-pay` npm package
- Full customer/billing form
- Multiple payment methods (card, ACH, Apple Pay, Google Pay)
- 3DS challenge/frictionless flow
- Token lookup data display

**ES Module Import:**

```html
<script type="importmap">
  {
    "imports": {
      "@nmipayments/nmi-pay": "https://cdn.skypack.dev/@nmipayments/nmi-pay"
    }
  }
</script>
<script type="module" src="PaymentComponent.js"></script>
```

**PaymentComponent.js Key Functions:**

- `handlePaymentWith3DS()` - Start 3DS authentication
- `handleGooglePayPayment()` - Bypass 3DS for digital wallets
- `handlePayment()` - Submit to backend

**3DS Event Handlers:**

```javascript
threeDSInstance = mountNmiThreeDSecure("#container", {
  onComplete: (result) => {
    /* handle success */
  },
  onFailure: (error) => {
    /* handle failure */
  },
  onChallenge: () => {
    /* show challenge UI */
  },
});
```

---

### 4. usaepay.html (USAePay)

**Purpose:** USAePay REST API integration with Pay.js.

**Key Features:**

- Tabbed interface:
  - Card Entry / Tokenization
  - Transaction Processing
  - Query Transaction
- Pay.js hosted card entry
- Token-based transactions
- Transaction lookup

**usaepay.js Sections:**

1. Pay.js Setup - Creates payment card entry widget
2. Tab Navigation - Manages tab switching
3. Card Entry Form - Tokenization flow
4. Token Transaction - Process with saved token
5. Query Transaction - Look up by key

**Pay.js Integration:**

```javascript
const client = new usaepay.Client(publicKey);
let paymentCard = client.createPaymentCardEntry();
paymentCard.generateHTML();
paymentCard.addHTML("paymentCardContainer");
```

---

### 5. partnerApi.html (Partner API)

**Purpose:** NMI V4 API for transaction reporting.

**Key Features:**

- API key configuration
- Date range filters
- Transaction status filter
- Amount range filter
- Debug mode (preview request)
- JSON syntax highlighting

**partnerApi.js Functions:**

- `handleTransactionQuery()` - Submit query
- `collectFormData()` - Build request payload
- `makeApiRequest()` - Call backend
- `debugRequest()` - Preview API call

---

### 6. 3DSBrowser.html (3DS Testing)

**Purpose:** Test 3DS authentication flows directly.

**Test Scenarios:**
| Card Number | Flow |
|-------------|------|
| 4000000000002701 | Frictionless Success |
| 4100000000005000 | Challenge Success |
| 4100000000100009 | Attempted |
| 4100000000300005 | Failed |
| 4100000000400003 | Unavailable |
| 4100000000500000 | Rejected |
| 4111111111111111 | Not Enrolled |

**3DSWebAdapter.js Callbacks:**

- `threeds_callback_method_finished()` - Method complete
- `threeds_callback_method_skipped()` - Method skipped
- `threeds_callback_auth_result_ready()` - Auth ready

---

### 7. eKashu.html (eKashu)

**Purpose:** UK payment gateway with hash-based security.

**Key Features:**

- SHA256 HMAC hash generation
- Form-based payment redirect
- Local testing mode
- Debug hash output

**Hash Generation Flow:**

1. Page loads → Call `/api/EKashu/generate-hash`
2. Backend sorts ekashu\_\* params
3. Creates HMAC-SHA256 signature
4. Returns base64 encoded hash
5. Hash inserted into hidden form field
6. Form submitted to eKashu

---

## Test Utilities

### test/devFillers.js

Auto-fills checkout forms with test data:

```javascript
import { fillCheckoutForm } from "./test/devFillers.js";

// Fills: first_name, last_name, email, phone,
//        address1, city, state, zip, country
fillCheckoutForm();
```

### test/factories/

Generate realistic test data:

```javascript
import { UserFactory } from "./factories/userFactory.js";
import { OrderFactory } from "./factories/orderFactory.js";

const user = UserFactory.create();
const order = OrderFactory.create();
```

---

## Common Patterns

### Form Submission

```javascript
document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const response = await fetch("/api/endpoint", {
    method: "POST",
    body: formData, // or JSON.stringify(data)
  });

  const result = await response.json();
  displayResult(result);
});
```

### Token Storage

Collect.js and Payment Component store tokens:

```javascript
// Collect.js callback
CollectJS.configure({
  callback: (response) => {
    localStorage.setItem("token", response.token);
  },
});
```

### Error Handling

```javascript
try {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
} catch (error) {
  showError(error.message);
}
```
