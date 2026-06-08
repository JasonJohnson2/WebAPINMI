# Test Data Setup

This directory contains faker.js configuration and utilities for generating test data in the payment checkout system.

## Frontend (JavaScript)

### Files Structure

```
test/
├── seed.js              # Faker configuration with fixed seed
├── factories/
│   ├── userFactory.js   # User/customer data generation
│   └── orderFactory.js  # Order data generation
├── devFillers.js        # Form auto-fill utilities
├── api.js              # API helper functions
└── README.md           # This file
```

### Usage

#### Auto-fill Checkout Form

```javascript
import { fillCheckoutForm } from "../test/devFillers.js";

// Fill all form fields with fake data
fillCheckoutForm();
```

#### Generate Custom User Data

```javascript
import { makeUser } from "../test/factories/userFactory.js";

const user = makeUser({
  email: "custom@example.com", // Override specific fields
});
```

#### API Integration

```javascript
import { fetchFakeCustomer } from "../test/api.js";

const customer = await fetchFakeCustomer();
```

## Backend (C#/.NET)

### Available Endpoints

- `GET /fake/users?count=N` - Generate N fake users (default: 10, max: 1000)
- `GET /fake/orders?count=N` - Generate N fake orders (default: 10, max: 1000)
- `GET /fake/customer` - Generate a single fake customer
- `GET /fake/env` - Environment and configuration info

### Example Usage

```bash
# Get 5 fake users
curl "https://localhost:5125/fake/users?count=5"

# Get a single customer
curl "https://localhost:5125/fake/customer"

# Check environment
curl "https://localhost:5125/fake/env"
```

## Features

### Checkout Page Features

- **Modern UI**: Bootstrap 5 with Font Awesome icons
- **NMI Field Names**: All inputs use NMI variable names (first_name, last_name, etc.)
- **Auto-fill Button**: One-click test data population
- **Real-time Validation**: Form validation with visual feedback
- **Payment Processing**: Full integration with NMI payment widget
- **Customer Data**: Complete billing and customer information collection

### Deterministic Data

- Fixed seed (42) ensures consistent test data across sessions
- Stable data for UI testing and manual verification
- Reproducible test scenarios

### Data Fields Supported

- **Personal**: First name, last name, email, phone, company
- **Address**: Address lines, city, state, ZIP, country
- **Payment**: Amount, currency
- **Order**: Order ID, status, timestamps

## How to Use in Development

1. **Navigate to the payment page**: `/PaymentComponent/paymentComponent.html`
2. **Click "Fill Test Data"** to populate all form fields
3. **Modify any fields** as needed for testing
4. **Process payment** using the NMI widget
5. **Check network tab** to see all customer data being sent to the API

## Customization

### Adding New Fields

1. Update `userFactory.js` to include new fields
2. Add fields to the HTML form with appropriate NMI field names
3. Update `devFillers.js` to auto-fill new fields
4. Modify `PaymentController.cs` to handle new fields in the API

### Changing Seed Value

Edit `seed.js` and change the SEED constant for different test data patterns.


