// NMI V5 API Integration JavaScript
// Data-driven endpoint definitions with dynamic form rendering

// ============================================================================
// SELECT OPTION CONSTANTS
// ============================================================================

const BOOL_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'true', l: 'Yes' },
  { v: 'false', l: 'No' }
];

const INDUSTRY_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'retail', l: 'Retail' },
  { v: 'restaurant', l: 'Restaurant' },
  { v: 'ecommerce', l: 'E-Commerce' },
  { v: 'moto', l: 'MOTO' },
  { v: 'lodging', l: 'Lodging' }
];

const PARTIAL_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'settle_partial', l: 'Settle Partial' },
  { v: 'payment_in_full', l: 'Payment in Full' }
];

const ACCT_TYPE_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'checking', l: 'Checking' },
  { v: 'savings', l: 'Savings' }
];

const ACCT_HOLDER_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'personal', l: 'Personal' },
  { v: 'business', l: 'Business' }
];

const SEC_CODE_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'PPD', l: 'PPD' },
  { v: 'WEB', l: 'WEB' },
  { v: 'TEL', l: 'TEL' },
  { v: 'CCD', l: 'CCD' },
  { v: 'POP', l: 'POP' },
  { v: 'RCK', l: 'RCK' }
];

const CARRIER_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'ups', l: 'UPS' },
  { v: 'fedex', l: 'FedEx' },
  { v: 'dhl', l: 'DHL' },
  { v: 'usps', l: 'USPS' }
];

const BILLING_METHOD_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'recurring', l: 'Recurring' },
  { v: 'installment', l: 'Installment' }
];

const CAVV_STATUS_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'verified', l: 'Verified' },
  { v: 'attempted', l: 'Attempted' }
];

const CIT_INITIATED_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'customer', l: 'Customer' },
  { v: 'merchant', l: 'Merchant' }
];

const STORED_CRED_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'stored', l: 'Stored' },
  { v: 'used', l: 'Used' }
];

const AFT_IDENTIFIER_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'AA', l: 'Visa AA - Account to Account' },
  { v: 'FT', l: 'Visa FT - Funds Transfer' },
  { v: 'LA', l: 'Visa LA - Liquid Assets' },
  { v: 'TU', l: 'Visa TU - Top-Up' },
  { v: 'WT', l: 'Visa WT - Wallet Transfer' },
  { v: 'F07', l: 'MC F07 - General Person-To-Person Transfer' },
  { v: 'F08', l: 'MC F08 - Person to Person to Card Account (MCC 4829)' },
  { v: 'F52', l: 'MC F52 - General Transfer to Own Account (MCC 4829)' },
  { v: 'F54', l: 'MC F54 - Payment of Own Credit Card Bill (MCC 4829)' },
  { v: 'F55', l: 'MC F55 - Business Disbursement (MCC 4829)' },
  { v: 'F61', l: 'MC F61 - Transfer to Own Staged Digital Wallet Account' },
  { v: 'F64', l: 'MC F64 - Transfer to Own Debit/Prepaid Card (MCC 4829)' },
  { v: 'F65', l: 'MC F65 - General Business-to-Business Transfer (MCC 4829)' }
];

// ============================================================================
// SHARED FIELD GROUP DEFINITIONS
// ============================================================================

const GRP_TRANSACTION_SETTINGS = {
  name: 'Transaction Settings',
  icon: 'fas fa-cog',
  collapsed: false,
  nestedKey: null,
  fields: [
    { name: 'amount', label: 'Amount', type: 'text', placeholder: '10.00', required: true, numeric: true, description: 'Total amount (x.xx)' },
    { name: 'surcharge', label: 'Surcharge', type: 'text', placeholder: '0.00', numeric: true },
    { name: 'convenience_fee', label: 'Convenience Fee', type: 'text', placeholder: '0.00', numeric: true },
    { name: 'misc_fee', label: 'Misc Fee', type: 'text', placeholder: '0.00', numeric: true },
    { name: 'misc_fee_name', label: 'Misc Fee Name', type: 'text' },
    { name: 'tip', label: 'Tip', type: 'text', placeholder: '0.00', numeric: true },
    { name: 'currency', label: 'Currency', type: 'text', placeholder: 'USD', description: 'ISO 4217 3-char code' },
    { name: 'processor_id', label: 'Processor ID', type: 'text' },
    { name: 'dup_seconds', label: 'Duplicate Seconds', type: 'text', description: 'Duplicate detection window (integer)' },
    { name: 'transaction_session_id', label: 'Transaction Session ID', type: 'text' },
    { name: 'customer_receipt', label: 'Customer Receipt', type: 'select', options: BOOL_OPTS },
    { name: 'pinless_debit_override', label: 'Pinless Debit Override', type: 'select', options: BOOL_OPTS },
    { name: 'industry', label: 'Industry', type: 'select', options: INDUSTRY_OPTS },
    { name: 'partial_payments', label: 'Partial Payments', type: 'select', options: PARTIAL_OPTS },
    { name: 'partial_payment_id', label: 'Partial Payment ID', type: 'text' },
    { name: 'network_tokenize', label: 'Network Tokenize', type: 'select', options: BOOL_OPTS }
  ]
};

const GRP_PAYMENT_DETAILS = {
  name: 'Payment Details',
  icon: 'fas fa-credit-card',
  collapsed: true,
  nestedKey: 'payment_details',
  fields: [
    { name: 'card_number', label: 'Card Number', type: 'text', placeholder: '4111111111111111' },
    { name: 'card_exp', label: 'Card Expiration', type: 'text', placeholder: 'MMYY', description: 'Format: MMYY' },
    { name: 'card_cvv', label: 'Card CVV', type: 'text', placeholder: '999' },
    { name: 'payment_token', label: 'Payment Token', type: 'text' },
    { name: 'check_name', label: 'Check Name', type: 'text' },
    { name: 'check_aba', label: 'Check ABA', type: 'text', description: 'Routing number' },
    { name: 'check_account', label: 'Check Account', type: 'text' },
    { name: 'account_type', label: 'Account Type', type: 'select', options: ACCT_TYPE_OPTS },
    { name: 'account_holder_type', label: 'Account Holder Type', type: 'select', options: ACCT_HOLDER_OPTS },
    { name: 'sec_code', label: 'SEC Code', type: 'select', options: SEC_CODE_OPTS },
    { name: 'check_number', label: 'Check Number', type: 'text' },
    { name: 'googlepay_payment_data', label: 'Google Pay Payment Data', type: 'text' }
  ]
};

const GRP_BILLING_ADDRESS = {
  name: 'Billing Address',
  icon: 'fas fa-address-card',
  collapsed: true,
  nestedKey: 'billing_address',
  fields: [
    { name: 'first_name', label: 'First Name', type: 'text' },
    { name: 'last_name', label: 'Last Name', type: 'text' },
    { name: 'company', label: 'Company', type: 'text' },
    { name: 'address1', label: 'Address 1', type: 'text' },
    { name: 'address2', label: 'Address 2', type: 'text' },
    { name: 'city', label: 'City', type: 'text' },
    { name: 'state', label: 'State', type: 'text', placeholder: 'XX' },
    { name: 'zip', label: 'Zip', type: 'text' },
    { name: 'country', label: 'Country', type: 'text', placeholder: 'US' },
    { name: 'phone', label: 'Phone', type: 'text' },
    { name: 'email', label: 'Email', type: 'text' },
    { name: 'fax', label: 'Fax', type: 'text' },
    { name: 'cell_phone', label: 'Cell Phone', type: 'text' },
    { name: 'method', label: 'Method', type: 'select', options: BILLING_METHOD_OPTS },
    { name: 'number', label: 'Number', type: 'text', description: 'Installment/recurring number (integer)' },
    { name: 'total', label: 'Total', type: 'text', numeric: true },
    { name: 'website', label: 'Website', type: 'text' },
    { name: 'drivers_license_number', label: "Driver's License Number", type: 'text' },
    { name: 'drivers_license_dob', label: "Driver's License DOB", type: 'text', placeholder: 'YYYY-MM-DD' },
    { name: 'drivers_license_state', label: "Driver's License State", type: 'text' }
  ]
};

const GRP_SHIPPING_ADDRESS = {
  name: 'Shipping Address',
  icon: 'fas fa-shipping-fast',
  collapsed: true,
  nestedKey: 'shipping_address',
  fields: [
    { name: 'first_name', label: 'First Name', type: 'text' },
    { name: 'last_name', label: 'Last Name', type: 'text' },
    { name: 'company', label: 'Company', type: 'text' },
    { name: 'address1', label: 'Address 1', type: 'text' },
    { name: 'address2', label: 'Address 2', type: 'text' },
    { name: 'city', label: 'City', type: 'text' },
    { name: 'state', label: 'State', type: 'text', placeholder: 'XX' },
    { name: 'zip', label: 'Zip', type: 'text' },
    { name: 'country', label: 'Country', type: 'text', placeholder: 'US' },
    { name: 'email', label: 'Email', type: 'text' },
    { name: 'carrier', label: 'Carrier', type: 'select', options: CARRIER_OPTS }
  ]
};

const GRP_ORDER_DETAILS = {
  name: 'Order Details',
  icon: 'fas fa-receipt',
  collapsed: true,
  nestedKey: 'order_details',
  fields: [
    { name: 'template_id', label: 'Template ID', type: 'text' },
    { name: 'description', label: 'Description', type: 'text' },
    { name: 'id', label: 'Order ID', type: 'text' },
    { name: 'tax', label: 'Tax', type: 'text', numeric: true },
    { name: 'shipping', label: 'Shipping', type: 'text', numeric: true },
    { name: 'po_number', label: 'PO Number', type: 'text' },
    { name: 'shipping_postal_code', label: 'Shipping Postal Code', type: 'text' },
    { name: 'ship_from_postal_code', label: 'Ship From Postal Code', type: 'text' },
    { name: 'summary_commodity_code', label: 'Summary Commodity Code', type: 'text' },
    { name: 'duty_amount', label: 'Duty Amount', type: 'text', numeric: true },
    { name: 'discount_amount', label: 'Discount Amount', type: 'text', numeric: true },
    { name: 'national_tax_amount', label: 'National Tax Amount', type: 'text', numeric: true },
    { name: 'alternate_tax_amount', label: 'Alternate Tax Amount', type: 'text', numeric: true },
    { name: 'alternate_tax_id', label: 'Alternate Tax ID', type: 'text' },
    { name: 'vat_tax_amount', label: 'VAT Tax Amount', type: 'text', numeric: true },
    { name: 'vat_tax_rate', label: 'VAT Tax Rate', type: 'text', numeric: true },
    { name: 'vat_invoice_reference_number', label: 'VAT Invoice Ref Number', type: 'text' },
    { name: 'customer_vat_registration', label: 'Customer VAT Registration', type: 'text' },
    { name: 'merchant_vat_registration', label: 'Merchant VAT Registration', type: 'text' },
    { name: 'order_date', label: 'Order Date', type: 'text', placeholder: 'YYYYMMDD' },
    { name: 'order_description', label: 'Order Description', type: 'text' },
    { name: 'ip_address', label: 'IP Address', type: 'text' }
  ]
};

const GRP_PAYMENT_FACILITATOR = {
  name: 'Payment Facilitator',
  icon: 'fas fa-handshake',
  collapsed: true,
  nestedKey: 'payment_facilitator',
  fields: [
    { name: 'id', label: 'Facilitator ID', type: 'text' },
    { name: 'submerchant_id', label: 'Submerchant ID', type: 'text' },
    { name: 'submerchant_name', label: 'Submerchant Name', type: 'text' },
    { name: 'submerchant_address', label: 'Submerchant Address', type: 'text' },
    { name: 'submerchant_city', label: 'Submerchant City', type: 'text' },
    { name: 'submerchant_state', label: 'Submerchant State', type: 'text' },
    { name: 'submerchant_postal', label: 'Submerchant Postal', type: 'text' },
    { name: 'submerchant_country', label: 'Submerchant Country', type: 'text' },
    { name: 'submerchant_phone', label: 'Submerchant Phone', type: 'text' },
    { name: 'submerchant_email', label: 'Submerchant Email', type: 'text' }
  ]
};

const GRP_PAYMENT_DESCRIPTOR = {
  name: 'Payment Descriptor',
  icon: 'fas fa-file-signature',
  collapsed: true,
  nestedKey: 'payment_descriptor',
  fields: [
    { name: 'descriptor', label: 'Descriptor', type: 'text' },
    { name: 'phone', label: 'Phone', type: 'text' },
    { name: 'address', label: 'Address', type: 'text' },
    { name: 'city', label: 'City', type: 'text' },
    { name: 'state', label: 'State', type: 'text' },
    { name: 'postal_code', label: 'Postal Code', type: 'text' },
    { name: 'country', label: 'Country', type: 'text' },
    { name: 'mcc', label: 'MCC', type: 'text' },
    { name: 'merchant_id', label: 'Merchant ID', type: 'text' },
    { name: 'url', label: 'URL', type: 'text' }
  ]
};

const GRP_CARDHOLDER_AUTH = {
  name: 'Cardholder Auth (3DS)',
  icon: 'fas fa-shield-alt',
  collapsed: true,
  nestedKey: 'cardholder_auth',
  fields: [
    { name: 'status', label: 'Status', type: 'select', options: CAVV_STATUS_OPTS },
    { name: 'cavv', label: 'CAVV', type: 'text' },
    { name: 'xid', label: 'XID', type: 'text' },
    { name: 'three_ds_version', label: '3DS Version', type: 'text' },
    { name: 'directory_server_id', label: 'Directory Server ID', type: 'text' }
  ]
};

const GRP_MERCHANT_DEFINED_FIELDS = {
  name: 'Merchant Defined Fields',
  icon: 'fas fa-tags',
  collapsed: true,
  nestedKey: 'merchant_defined_fields',
  fields: Array.from({ length: 20 }, (_, i) => ({
    name: `field_${i + 1}`,
    label: `Field ${i + 1}`,
    type: 'text'
  }))
};

const GRP_CUSTOMER_VAULT = {
  name: 'Customer Vault',
  icon: 'fas fa-vault',
  collapsed: true,
  nestedKey: 'customer_vault',
  fields: [
    { name: 'add_to_vault', label: 'Add to Vault', type: 'select', options: BOOL_OPTS },
    { name: 'id', label: 'Vault ID', type: 'text' }
  ]
};

const GRP_CIT_MIT = {
  name: 'CIT/MIT',
  icon: 'fas fa-exchange-alt',
  collapsed: true,
  nestedKey: 'cit_mit',
  fields: [
    { name: 'initiated_by', label: 'Initiated By', type: 'select', options: CIT_INITIATED_OPTS },
    { name: 'initial_transaction_id', label: 'Initial Transaction ID', type: 'text' },
    { name: 'stored_credential_indicator', label: 'Stored Credential Indicator', type: 'select', options: STORED_CRED_OPTS }
  ]
};

const GRP_AFT = {
  name: 'Account Funding Transaction (AFT)',
  icon: 'fas fa-money-bill-transfer',
  collapsed: true,
  nestedKey: null,
  fields: [
    { name: 'aft_identifier', label: 'AFT Identifier', type: 'select', options: AFT_IDENTIFIER_OPTS, description: 'Brand-specific AFT type code (Visa/MC)' },
    { name: 'aft_recipient_name', label: 'AFT Recipient Name', type: 'text', description: 'First and last name of recipient in one field' }
  ]
};

// ============================================================================
// COMPOSITE FIELD GROUP ARRAYS (reused by multiple endpoints)
// ============================================================================

const PAYMENT_FIELD_GROUPS = [
  GRP_TRANSACTION_SETTINGS,
  GRP_PAYMENT_DETAILS,
  GRP_BILLING_ADDRESS,
  GRP_SHIPPING_ADDRESS,
  GRP_ORDER_DETAILS,
  GRP_PAYMENT_FACILITATOR,
  GRP_PAYMENT_DESCRIPTOR,
  GRP_CARDHOLDER_AUTH,
  GRP_MERCHANT_DEFINED_FIELDS,
  GRP_CUSTOMER_VAULT,
  GRP_CIT_MIT,
  GRP_AFT
];

const INVOICE_FIELD_GROUPS = [
  {
    name: 'Invoice Settings',
    icon: 'fas fa-file-invoice-dollar',
    collapsed: false,
    nestedKey: null,
    fields: [
      { name: 'amount', label: 'Amount', type: 'text', placeholder: '10.00', required: true, numeric: true, description: 'Total invoice amount (x.xx)' },
      { name: 'subtotal', label: 'Subtotal', type: 'text', numeric: true },
      { name: 'payment_terms', label: 'Payment Terms', type: 'text', placeholder: 'upon_receipt', description: 'Default: upon_receipt' },
      { name: 'payment_methods_allowed', label: 'Payment Methods Allowed', type: 'text', placeholder: 'cc,ck,cs', description: 'Comma-separated: cc, ck, cs' },
      { name: 'processor_id', label: 'Processor ID', type: 'text' },
      { name: 'currency', label: 'Currency', type: 'text', placeholder: 'USD', description: 'ISO 4217 3-char code' }
    ]
  },
  GRP_BILLING_ADDRESS,
  GRP_SHIPPING_ADDRESS,
  GRP_ORDER_DETAILS,
  GRP_MERCHANT_DEFINED_FIELDS
];

const SUBSCRIPTION_FIELD_GROUPS = [
  {
    name: 'Subscription Settings',
    icon: 'fas fa-sync',
    collapsed: false,
    nestedKey: null,
    fields: [
      { name: 'plan_id', label: 'Plan ID', type: 'text' },
      { name: 'plan_amount', label: 'Plan Amount', type: 'text', numeric: true },
      { name: 'plan_payments', label: 'Plan Payments', type: 'text', description: '0-999 (0 = unlimited)' },
      { name: 'day_frequency', label: 'Day Frequency', type: 'text', description: 'Charge every N days' },
      { name: 'month_frequency', label: 'Month Frequency', type: 'text', description: 'Charge every N months' },
      { name: 'day_of_month', label: 'Day of Month', type: 'text', description: '1-31' },
      { name: 'start_date', label: 'Start Date', type: 'text', placeholder: 'YYYYMMDD' },
      { name: 'amount', label: 'Amount', type: 'text', numeric: true, description: 'Override amount for this subscription' },
      { name: 'paused_subscription', label: 'Paused', type: 'select', options: BOOL_OPTS },
      { name: 'customer_vault_id', label: 'Customer Vault ID', type: 'text' }
    ]
  },
  GRP_PAYMENT_DETAILS,
  GRP_BILLING_ADDRESS,
  GRP_SHIPPING_ADDRESS,
  GRP_ORDER_DETAILS,
  GRP_MERCHANT_DEFINED_FIELDS,
  GRP_CUSTOMER_VAULT
];

const PLAN_CREATE_GROUPS = [
  {
    name: 'Plan Details',
    icon: 'fas fa-calendar-plus',
    collapsed: false,
    nestedKey: null,
    fields: [
      { name: 'plan_id', label: 'Plan ID', type: 'text', required: true },
      { name: 'plan_name', label: 'Plan Name', type: 'text', required: true },
      { name: 'plan_amount', label: 'Plan Amount', type: 'text', required: true, numeric: true, placeholder: '10.00' },
      { name: 'plan_payments', label: 'Plan Payments', type: 'text', required: true, description: '0-999 (0 = unlimited)' },
      { name: 'day_frequency', label: 'Day Frequency', type: 'text', description: 'Every N days (use this OR month_frequency)' },
      { name: 'month_frequency', label: 'Month Frequency', type: 'text', description: 'Every N months' },
      { name: 'day_of_month', label: 'Day of Month', type: 'text', description: '1-31 (required with month_frequency)' },
      { name: 'start_date', label: 'Start Date', type: 'text', placeholder: 'YYYYMMDD' }
    ]
  }
];

const PLAN_UPDATE_GROUPS = [
  {
    name: 'Plan Details',
    icon: 'fas fa-calendar-plus',
    collapsed: false,
    nestedKey: null,
    fields: [
      { name: 'plan_name', label: 'Plan Name', type: 'text' },
      { name: 'plan_amount', label: 'Plan Amount', type: 'text', numeric: true, placeholder: '10.00' },
      { name: 'plan_payments', label: 'Plan Payments', type: 'text', description: '0-999 (0 = unlimited)' },
      { name: 'day_frequency', label: 'Day Frequency', type: 'text' },
      { name: 'month_frequency', label: 'Month Frequency', type: 'text' },
      { name: 'day_of_month', label: 'Day of Month', type: 'text', description: '1-31' }
    ]
  }
];

const CUSTOMER_FIELD_GROUPS = [
  {
    name: 'Customer Settings',
    icon: 'fas fa-user-cog',
    collapsed: false,
    nestedKey: null,
    fields: [
      { name: 'customer_id', label: 'Customer ID', type: 'text', description: 'Optional custom identifier' }
    ]
  },
  {
    name: 'Billing Info',
    icon: 'fas fa-address-card',
    collapsed: true,
    nestedKey: 'billing',
    fields: [
      { name: 'billing_id', label: 'Billing ID', type: 'text' },
      { name: 'first_name', label: 'First Name', type: 'text' },
      { name: 'last_name', label: 'Last Name', type: 'text' },
      { name: 'company', label: 'Company', type: 'text' },
      { name: 'address1', label: 'Address 1', type: 'text' },
      { name: 'address2', label: 'Address 2', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'state', label: 'State', type: 'text' },
      { name: 'zip', label: 'Zip', type: 'text' },
      { name: 'country', label: 'Country', type: 'text', placeholder: 'US' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'fax', label: 'Fax', type: 'text' },
      { name: 'currency', label: 'Currency', type: 'text', placeholder: 'USD' },
      { name: 'priority', label: 'Priority', type: 'text' }
    ]
  },
  {
    name: 'Payment Info',
    icon: 'fas fa-credit-card',
    collapsed: true,
    nestedKey: 'billing.payment_info',
    fields: [
      { name: 'card_number', label: 'Card Number', type: 'text', placeholder: '4111111111111111' },
      { name: 'card_exp', label: 'Card Expiration', type: 'text', placeholder: 'MMYY', description: 'Format: MMYY' },
      { name: 'check_account', label: 'Check Account', type: 'text' },
      { name: 'check_aba', label: 'Check ABA', type: 'text', description: 'Routing number' },
      { name: 'account_type', label: 'Account Type', type: 'select', options: ACCT_TYPE_OPTS },
      { name: 'account_holder_type', label: 'Account Holder Type', type: 'select', options: ACCT_HOLDER_OPTS },
      { name: 'check_name', label: 'Check Name', type: 'text' },
      { name: 'sec_code', label: 'SEC Code', type: 'select', options: SEC_CODE_OPTS }
    ]
  },
  {
    name: 'Shipping Info',
    icon: 'fas fa-shipping-fast',
    collapsed: true,
    nestedKey: 'shipping',
    fields: [
      { name: 'shipping_id', label: 'Shipping ID', type: 'text' },
      { name: 'first_name', label: 'First Name', type: 'text' },
      { name: 'last_name', label: 'Last Name', type: 'text' },
      { name: 'company', label: 'Company', type: 'text' },
      { name: 'address1', label: 'Address 1', type: 'text' },
      { name: 'address2', label: 'Address 2', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'state', label: 'State', type: 'text' },
      { name: 'zip', label: 'Zip', type: 'text' },
      { name: 'country', label: 'Country', type: 'text', placeholder: 'US' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'priority', label: 'Priority', type: 'text' }
    ]
  },
  GRP_MERCHANT_DEFINED_FIELDS
];

const BILLING_RECORD_GROUPS = [
  {
    name: 'Billing Info',
    icon: 'fas fa-address-card',
    collapsed: false,
    nestedKey: null,
    fields: [
      { name: 'billing_id', label: 'Billing ID', type: 'text' },
      { name: 'first_name', label: 'First Name', type: 'text' },
      { name: 'last_name', label: 'Last Name', type: 'text' },
      { name: 'company', label: 'Company', type: 'text' },
      { name: 'address1', label: 'Address 1', type: 'text' },
      { name: 'address2', label: 'Address 2', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'state', label: 'State', type: 'text' },
      { name: 'zip', label: 'Zip', type: 'text' },
      { name: 'country', label: 'Country', type: 'text', placeholder: 'US' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'fax', label: 'Fax', type: 'text' },
      { name: 'priority', label: 'Priority', type: 'text' }
    ]
  },
  {
    name: 'Payment Info',
    icon: 'fas fa-credit-card',
    collapsed: true,
    nestedKey: 'payment_info',
    fields: [
      { name: 'card_number', label: 'Card Number', type: 'text', placeholder: '4111111111111111' },
      { name: 'card_exp', label: 'Card Expiration', type: 'text', placeholder: 'MMYY', description: 'Format: MMYY' },
      { name: 'check_account', label: 'Check Account', type: 'text' },
      { name: 'check_aba', label: 'Check ABA', type: 'text', description: 'Routing number' },
      { name: 'account_type', label: 'Account Type', type: 'select', options: ACCT_TYPE_OPTS },
      { name: 'account_holder_type', label: 'Account Holder Type', type: 'select', options: ACCT_HOLDER_OPTS },
      { name: 'check_name', label: 'Check Name', type: 'text' },
      { name: 'sec_code', label: 'SEC Code', type: 'select', options: SEC_CODE_OPTS }
    ]
  }
];

const SHIPPING_RECORD_GROUPS = [
  {
    name: 'Shipping Info',
    icon: 'fas fa-shipping-fast',
    collapsed: false,
    nestedKey: null,
    fields: [
      { name: 'shipping_id', label: 'Shipping ID', type: 'text' },
      { name: 'first_name', label: 'First Name', type: 'text' },
      { name: 'last_name', label: 'Last Name', type: 'text' },
      { name: 'company', label: 'Company', type: 'text' },
      { name: 'address1', label: 'Address 1', type: 'text' },
      { name: 'address2', label: 'Address 2', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'state', label: 'State', type: 'text' },
      { name: 'zip', label: 'Zip', type: 'text' },
      { name: 'country', label: 'Country', type: 'text', placeholder: 'US' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'priority', label: 'Priority', type: 'text' }
    ]
  }
];

const PRODUCT_FIELD_GROUPS = [
  {
    name: 'Product Details',
    icon: 'fas fa-box',
    collapsed: false,
    nestedKey: null,
    fields: [
      { name: 'product_sku', label: 'Product SKU', type: 'text', required: true },
      { name: 'product_description', label: 'Description', type: 'text', required: true },
      { name: 'product_cost', label: 'Cost', type: 'text', required: true, numeric: true, placeholder: '0.00' },
      { name: 'product_currency', label: 'Currency', type: 'text', required: true, placeholder: 'USD', description: 'ISO 4217 3-char code' },
      { name: 'product_commodity_code', label: 'Commodity Code', type: 'text' },
      { name: 'product_unit_of_measure', label: 'Unit of Measure', type: 'text' },
      { name: 'product_tax_amount', label: 'Tax Amount', type: 'text', numeric: true },
      { name: 'product_discount_amount', label: 'Discount Amount', type: 'text', numeric: true },
      { name: 'product_image_name', label: 'Image Name', type: 'text' },
      { name: 'product_category', label: 'Category', type: 'text' }
    ]
  }
];

// ============================================================================
// ENDPOINT DEFINITIONS (42 total)
// ============================================================================

const ENDPOINTS = [
  // ──────────────────────────────────────────────────────────────────────────
  // PAYMENTS (8)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'create-sale',
    title: 'Create Sale Transaction',
    description: 'Process a sale transaction that authorizes and captures payment in one step.',
    method: 'POST',
    path: '/v5/payments/sale',
    pathParams: [],
    fieldGroups: PAYMENT_FIELD_GROUPS
  },
  {
    id: 'create-auth',
    title: 'Create Auth Transaction',
    description: 'Authorize a payment without capturing. Use the capture endpoint to finalize.',
    method: 'POST',
    path: '/v5/payments/auth',
    pathParams: [],
    fieldGroups: PAYMENT_FIELD_GROUPS
  },
  {
    id: 'create-credit',
    title: 'Create Credit Transaction',
    description: 'Process an unreferenced credit/refund to a payment method.',
    method: 'POST',
    path: '/v5/payments/credit',
    pathParams: [],
    fieldGroups: PAYMENT_FIELD_GROUPS
  },
  {
    id: 'validate-payment',
    title: 'Validate Payment',
    description: 'Validate payment information without processing a transaction.',
    method: 'POST',
    path: '/v5/payments/validate',
    pathParams: [],
    fieldGroups: PAYMENT_FIELD_GROUPS
  },
  {
    id: 'get-transaction',
    title: 'Get Transaction',
    description: 'Retrieve details of a specific transaction by ID.',
    method: 'GET',
    path: '/v5/payments/{transactionId}',
    pathParams: [{ name: 'transactionId', label: 'Transaction ID', required: true }],
    fieldGroups: []
  },
  {
    id: 'capture-transaction',
    title: 'Capture Transaction',
    description: 'Capture a previously authorized transaction.',
    method: 'POST',
    path: '/v5/payments/{transactionId}/capture',
    pathParams: [{ name: 'transactionId', label: 'Transaction ID', required: true }],
    fieldGroups: [
      {
        name: 'Capture Details',
        icon: 'fas fa-hand-holding-usd',
        collapsed: false,
        nestedKey: null,
        fields: [
          { name: 'amount', label: 'Amount', type: 'text', placeholder: '10.00', numeric: true, description: 'Capture amount (blank = full amount)' },
          { name: 'order_id', label: 'Order ID', type: 'text' },
          { name: 'tracking_number', label: 'Tracking Number', type: 'text' },
          { name: 'shipping_carrier', label: 'Shipping Carrier', type: 'select', options: CARRIER_OPTS },
          { name: 'shipping_date', label: 'Shipping Date', type: 'text', placeholder: 'YYYYMMDD' },
          { name: 'signatureimage', label: 'Signature Image', type: 'text' }
        ]
      }
    ]
  },
  {
    id: 'void-transaction',
    title: 'Void Transaction',
    description: 'Void a pending or authorized transaction before settlement.',
    method: 'POST',
    path: '/v5/payments/{transactionId}/void',
    pathParams: [{ name: 'transactionId', label: 'Transaction ID', required: true }],
    fieldGroups: [
      {
        name: 'Void Details',
        icon: 'fas fa-ban',
        collapsed: false,
        nestedKey: null,
        fields: [
          { name: 'void_reason', label: 'Void Reason', type: 'text' }
        ]
      }
    ]
  },
  {
    id: 'refund-transaction',
    title: 'Refund Transaction',
    description: 'Refund a previously settled transaction.',
    method: 'POST',
    path: '/v5/payments/{transactionId}/refund',
    pathParams: [{ name: 'transactionId', label: 'Transaction ID', required: true }],
    fieldGroups: [
      {
        name: 'Refund Details',
        icon: 'fas fa-exchange-alt',
        collapsed: false,
        nestedKey: null,
        fields: [
          { name: 'amount', label: 'Amount', type: 'text', placeholder: '10.00', numeric: true, description: 'Refund amount (blank = full refund)' }
        ]
      }
    ]
  },

  // ──────────────────────────────────────────────────────────────────────────
  // INVOICING (6)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'create-invoice',
    title: 'Create Invoice',
    description: 'Create a new invoice to send to a customer for payment.',
    method: 'POST',
    path: '/v5/invoices',
    pathParams: [],
    fieldGroups: INVOICE_FIELD_GROUPS
  },
  {
    id: 'list-invoices',
    title: 'List Invoices',
    description: 'Retrieve a list of all invoices.',
    method: 'GET',
    path: '/v5/invoices',
    pathParams: [],
    fieldGroups: []
  },
  {
    id: 'get-invoice',
    title: 'Get Invoice',
    description: 'Retrieve details of a specific invoice by ID.',
    method: 'GET',
    path: '/v5/invoices/{invoiceId}',
    pathParams: [{ name: 'invoiceId', label: 'Invoice ID', required: true }],
    fieldGroups: []
  },
  {
    id: 'update-invoice',
    title: 'Update Invoice',
    description: 'Update an existing invoice.',
    method: 'PUT',
    path: '/v5/invoices/{invoiceId}',
    pathParams: [{ name: 'invoiceId', label: 'Invoice ID', required: true }],
    fieldGroups: INVOICE_FIELD_GROUPS
  },
  {
    id: 'close-invoice',
    title: 'Close Invoice',
    description: 'Close an existing invoice so it can no longer be paid.',
    method: 'POST',
    path: '/v5/invoices/{invoiceId}/close',
    pathParams: [{ name: 'invoiceId', label: 'Invoice ID', required: true }],
    fieldGroups: []
  },
  {
    id: 'send-invoice',
    title: 'Send Invoice',
    description: 'Send an invoice to the customer via email.',
    method: 'POST',
    path: '/v5/invoices/{invoiceId}/send',
    pathParams: [{ name: 'invoiceId', label: 'Invoice ID', required: true }],
    fieldGroups: []
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTIONS (5)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'create-subscription',
    title: 'Create Subscription',
    description: 'Create a new recurring subscription for a customer.',
    method: 'POST',
    path: '/v5/subscriptions',
    pathParams: [],
    fieldGroups: SUBSCRIPTION_FIELD_GROUPS
  },
  {
    id: 'list-subscriptions',
    title: 'List Subscriptions',
    description: 'Retrieve a list of all subscriptions.',
    method: 'GET',
    path: '/v5/subscriptions',
    pathParams: [],
    fieldGroups: []
  },
  {
    id: 'get-subscription',
    title: 'Get Subscription',
    description: 'Retrieve details of a specific subscription by ID.',
    method: 'GET',
    path: '/v5/subscriptions/{subscriptionId}',
    pathParams: [{ name: 'subscriptionId', label: 'Subscription ID', required: true }],
    fieldGroups: []
  },
  {
    id: 'update-subscription',
    title: 'Update Subscription',
    description: 'Update an existing subscription.',
    method: 'PUT',
    path: '/v5/subscriptions/{subscriptionId}',
    pathParams: [{ name: 'subscriptionId', label: 'Subscription ID', required: true }],
    fieldGroups: SUBSCRIPTION_FIELD_GROUPS
  },
  {
    id: 'delete-subscription',
    title: 'Delete Subscription',
    description: 'Cancel and delete an existing subscription.',
    method: 'DELETE',
    path: '/v5/subscriptions/{subscriptionId}',
    pathParams: [{ name: 'subscriptionId', label: 'Subscription ID', required: true }],
    fieldGroups: []
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PLANS (5)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'create-plan',
    title: 'Create Plan',
    description: 'Create a new recurring billing plan.',
    method: 'POST',
    path: '/v5/plans',
    pathParams: [],
    fieldGroups: PLAN_CREATE_GROUPS
  },
  {
    id: 'list-plans',
    title: 'List Plans',
    description: 'Retrieve a list of all billing plans.',
    method: 'GET',
    path: '/v5/plans',
    pathParams: [],
    fieldGroups: []
  },
  {
    id: 'get-plan',
    title: 'Get Plan',
    description: 'Retrieve details of a specific billing plan by ID.',
    method: 'GET',
    path: '/v5/plans/{planId}',
    pathParams: [{ name: 'planId', label: 'Plan ID', required: true }],
    fieldGroups: []
  },
  {
    id: 'update-plan',
    title: 'Update Plan',
    description: 'Update an existing billing plan.',
    method: 'PUT',
    path: '/v5/plans/{planId}',
    pathParams: [{ name: 'planId', label: 'Plan ID', required: true }],
    fieldGroups: PLAN_UPDATE_GROUPS
  },
  {
    id: 'delete-plan',
    title: 'Delete Plan',
    description: 'Delete a billing plan.',
    method: 'DELETE',
    path: '/v5/plans/{planId}',
    pathParams: [{ name: 'planId', label: 'Plan ID', required: true }],
    fieldGroups: []
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CUSTOMERS (13)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'create-customer',
    title: 'Create Customer',
    description: 'Add a new customer to the customer vault.',
    method: 'POST',
    path: '/v5/customers',
    pathParams: [],
    fieldGroups: CUSTOMER_FIELD_GROUPS
  },
  {
    id: 'list-customers',
    title: 'List Customers',
    description: 'Retrieve a list of all customers in the vault.',
    method: 'GET',
    path: '/v5/customers',
    pathParams: [],
    fieldGroups: []
  },
  {
    id: 'get-customer',
    title: 'Get Customer',
    description: 'Retrieve details of a specific customer by ID.',
    method: 'GET',
    path: '/v5/customers/{customerId}',
    pathParams: [{ name: 'customerId', label: 'Customer ID', required: true }],
    fieldGroups: []
  },
  {
    id: 'update-customer',
    title: 'Update Customer',
    description: 'Update an existing customer vault record.',
    method: 'PATCH',
    path: '/v5/customers/{customerId}',
    pathParams: [{ name: 'customerId', label: 'Customer ID', required: true }],
    fieldGroups: CUSTOMER_FIELD_GROUPS
  },
  {
    id: 'delete-customer',
    title: 'Delete Customer',
    description: 'Delete a customer from the vault.',
    method: 'DELETE',
    path: '/v5/customers/{customerId}',
    pathParams: [{ name: 'customerId', label: 'Customer ID', required: true }],
    fieldGroups: []
  },
  {
    id: 'add-billing',
    title: 'Add Billing Record',
    description: 'Add a billing record to an existing customer.',
    method: 'POST',
    path: '/v5/customers/{customerId}/billing',
    pathParams: [{ name: 'customerId', label: 'Customer ID', required: true }],
    fieldGroups: BILLING_RECORD_GROUPS
  },
  {
    id: 'get-billing',
    title: 'Get Billing Record',
    description: 'Retrieve a specific billing record for a customer.',
    method: 'GET',
    path: '/v5/customers/{customerId}/billing/{billingId}',
    pathParams: [
      { name: 'customerId', label: 'Customer ID', required: true },
      { name: 'billingId', label: 'Billing ID', required: true }
    ],
    fieldGroups: []
  },
  {
    id: 'update-billing',
    title: 'Update Billing Record',
    description: 'Update a billing record for a customer.',
    method: 'PUT',
    path: '/v5/customers/{customerId}/billing/{billingId}',
    pathParams: [
      { name: 'customerId', label: 'Customer ID', required: true },
      { name: 'billingId', label: 'Billing ID', required: true }
    ],
    fieldGroups: BILLING_RECORD_GROUPS
  },
  {
    id: 'delete-billing',
    title: 'Delete Billing Record',
    description: 'Delete a billing record from a customer.',
    method: 'DELETE',
    path: '/v5/customers/{customerId}/billing/{billingId}',
    pathParams: [
      { name: 'customerId', label: 'Customer ID', required: true },
      { name: 'billingId', label: 'Billing ID', required: true }
    ],
    fieldGroups: []
  },
  {
    id: 'add-shipping',
    title: 'Add Shipping Record',
    description: 'Add a shipping record to an existing customer.',
    method: 'POST',
    path: '/v5/customers/{customerId}/shipping',
    pathParams: [{ name: 'customerId', label: 'Customer ID', required: true }],
    fieldGroups: SHIPPING_RECORD_GROUPS
  },
  {
    id: 'get-shipping',
    title: 'Get Shipping Record',
    description: 'Retrieve a specific shipping record for a customer.',
    method: 'GET',
    path: '/v5/customers/{customerId}/shipping/{shippingId}',
    pathParams: [
      { name: 'customerId', label: 'Customer ID', required: true },
      { name: 'shippingId', label: 'Shipping ID', required: true }
    ],
    fieldGroups: []
  },
  {
    id: 'update-shipping',
    title: 'Update Shipping Record',
    description: 'Update a shipping record for a customer.',
    method: 'PUT',
    path: '/v5/customers/{customerId}/shipping/{shippingId}',
    pathParams: [
      { name: 'customerId', label: 'Customer ID', required: true },
      { name: 'shippingId', label: 'Shipping ID', required: true }
    ],
    fieldGroups: SHIPPING_RECORD_GROUPS
  },
  {
    id: 'delete-shipping',
    title: 'Delete Shipping Record',
    description: 'Delete a shipping record from a customer.',
    method: 'DELETE',
    path: '/v5/customers/{customerId}/shipping/{shippingId}',
    pathParams: [
      { name: 'customerId', label: 'Customer ID', required: true },
      { name: 'shippingId', label: 'Shipping ID', required: true }
    ],
    fieldGroups: []
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PRODUCTS (5)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'create-product',
    title: 'Create Product',
    description: 'Add a new product to the product catalog.',
    method: 'POST',
    path: '/v5/products',
    pathParams: [],
    fieldGroups: PRODUCT_FIELD_GROUPS
  },
  {
    id: 'list-products',
    title: 'List Products',
    description: 'Retrieve a list of all products in the catalog.',
    method: 'GET',
    path: '/v5/products',
    pathParams: [],
    fieldGroups: []
  },
  {
    id: 'get-product',
    title: 'Get Product',
    description: 'Retrieve details of a specific product by ID.',
    method: 'GET',
    path: '/v5/products/{productId}',
    pathParams: [{ name: 'productId', label: 'Product ID', required: true }],
    fieldGroups: []
  },
  {
    id: 'update-product',
    title: 'Update Product',
    description: 'Update an existing product in the catalog.',
    method: 'PUT',
    path: '/v5/products/{productId}',
    pathParams: [{ name: 'productId', label: 'Product ID', required: true }],
    fieldGroups: PRODUCT_FIELD_GROUPS
  },
  {
    id: 'delete-product',
    title: 'Delete Product',
    description: 'Delete a product from the catalog.',
    method: 'DELETE',
    path: '/v5/products/{productId}',
    pathParams: [{ name: 'productId', label: 'Product ID', required: true }],
    fieldGroups: []
  }
];

// ============================================================================
// UTILITY HELPERS
// ============================================================================

function getEnvName() {
  return $('#envToggle').is(':checked') ? 'secure' : 'sandbox';
}

function getBaseUrl() {
  return getEnvName() === 'secure'
    ? 'https://secure.nmi.com'
    : 'https://sandbox.nmi.com';
}

// One-time cleanup of legacy localStorage keys from older builds that stored
// the NMI private API key in the browser. Safe to keep indefinitely.
(function clearLegacyApiKeyStorage() {
  try {
    localStorage.removeItem('nmi_v5_api_key_sandbox');
    localStorage.removeItem('nmi_v5_api_key_secure');
  } catch (_e) {
    /* no-op */
  }
})();

function getMethodClass(method) {
  const map = { GET: 'get-method', POST: 'post-method', PUT: 'put-method', DELETE: 'delete-method', PATCH: 'patch-method' };
  return map[method] || 'get-method';
}

function syntaxHighlightJson(json) {
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string';
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    }
  );
}

function showV5Alert(message, type) {
  const icon = type === 'warning' ? 'exclamation-triangle'
    : type === 'success' ? 'check-circle'
    : type === 'danger' ? 'exclamation-circle'
    : 'info-circle';

  const alertHtml = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      <i class="fas fa-${icon} me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;

  $('#endpointContainer').prepend(alertHtml);
  setTimeout(() => { $('#endpointContainer > .alert').first().fadeOut(300, function () { $(this).remove(); }); }, 5000);
}

// ============================================================================
// FORM RENDERING
// ============================================================================

function renderEndpoint(endpointId) {
  const endpoint = ENDPOINTS.find(e => e.id === endpointId);
  if (!endpoint) return;

  const baseUrl = getBaseUrl();
  const fullUrl = baseUrl + endpoint.path;
  let html = '';

  // Endpoint header
  html += '<div class="endpoint-header">';
  html += '  <div class="d-flex align-items-center flex-wrap gap-2 mb-2">';
  html += '    <span class="http-method ' + getMethodClass(endpoint.method) + '">' + endpoint.method + '</span>';
  html += '    <span class="endpoint-url" id="' + endpointId + '-url">' + fullUrl + '</span>';
  html += '  </div>';
  html += '  <h2>' + endpoint.title + '</h2>';
  html += '  <p class="text-muted">' + endpoint.description + '</p>';
  html += '</div>';

  // Path parameters
  if (endpoint.pathParams.length > 0) {
    html += '<div class="card mb-3">';
    html += '  <div class="card-header"><h5><i class="fas fa-route"></i> Path Parameters</h5></div>';
    html += '  <div class="card-body"><div class="row">';
    endpoint.pathParams.forEach(function (param) {
      html += '<div class="col-md-6 mb-3">';
      html += '  <label class="form-label" for="' + endpointId + '-' + param.name + '">' + param.label;
      if (param.required) html += ' <span class="text-danger">*</span>';
      html += '</label>';
      html += '  <input type="text" class="form-control path-param-field" id="' + endpointId + '-' + param.name + '"';
      html += '    data-param-name="' + param.name + '" placeholder="Enter ' + param.label.toLowerCase() + '"';
      if (param.required) html += ' required';
      html += '>';
      html += '</div>';
    });
    html += '</div></div></div>';
  }

  // Field groups
  if (endpoint.fieldGroups.length > 0) {
    html += '<div class="card mb-3"><div class="card-body p-2">';

    endpoint.fieldGroups.forEach(function (group, groupIndex) {
      const collapsed = groupIndex === 0 ? '' : 'collapsed';
      const groupId = endpointId + '-group-' + groupIndex;

      const hasNested = group.nestedKey && group.nestedKey.length > 0;
      html += '<div class="field-group-header ' + collapsed + (hasNested ? ' has-nested-key' : '') + '" data-group="' + groupId + '">';
      html += '  <h6><i class="' + group.icon + '"></i> ' + group.name;
      if (hasNested) {
        html += ' <span class="nested-key-badge" title="Fields nest under this JSON key"><i class="fas fa-code"></i> ' + group.nestedKey + '</span>';
      }
      html += '</h6>';
      html += '  <i class="fas fa-chevron-down toggle-icon"></i>';
      html += '</div>';
      html += '<div class="field-group-body ' + collapsed + (hasNested ? ' nested-object-body' : '') + '" id="' + groupId + '">';
      html += '  <div class="row px-3">';

      group.fields.forEach(function (field) {
        const fieldId = endpointId + '-g' + groupIndex + '-' + field.name;
        const nestedKey = group.nestedKey || '';
        const jsonPath = nestedKey ? nestedKey + '.' + field.name : field.name;

        html += '<div class="col-md-6 mb-3">';
        html += '  <label class="form-label" for="' + fieldId + '">' + field.label;
        if (field.required) html += ' <span class="text-danger">*</span>';
        if (nestedKey) {
          html += ' <span class="field-json-path" title="JSON path in request body">' + jsonPath + '</span>';
        }
        html += '</label>';

        if (field.type === 'select') {
          html += '<select class="form-control v5-field" id="' + fieldId + '"';
          html += ' data-field-name="' + field.name + '" data-nested-key="' + nestedKey + '"';
          if (field.numeric) html += ' data-numeric="true"';
          html += '>';
          (field.options || []).forEach(function (opt) {
            html += '<option value="' + opt.v + '">' + opt.l + '</option>';
          });
          html += '</select>';
        } else {
          html += '<input type="text" class="form-control v5-field" id="' + fieldId + '"';
          html += ' data-field-name="' + field.name + '" data-nested-key="' + nestedKey + '"';
          if (field.numeric) html += ' data-numeric="true"';
          html += ' placeholder="' + (field.placeholder || '') + '"';
          if (field.required) html += ' required';
          html += '>';
        }

        if (field.description) {
          html += '<div class="form-text">' + field.description + '</div>';
        }

        html += '</div>';
      });

      html += '  </div>';
      html += '</div>';
    });

    html += '</div></div>';
  }

  // Action buttons
  html += '<div class="d-flex gap-2 mb-3">';
  html += '  <button class="btn btn-primary send-request-btn" data-endpoint="' + endpointId + '">';
  html += '    <i class="fas fa-paper-plane"></i> Send Request';
  html += '  </button>';
  html += '  <button class="btn btn-secondary clear-form-btn" data-endpoint="' + endpointId + '">';
  html += '    <i class="fas fa-eraser"></i> Clear Form';
  html += '  </button>';
  html += '</div>';

  // Response area
  html += '<div class="card mb-4">';
  html += '  <div class="card-header d-flex justify-content-between align-items-center">';
  html += '    <h5><i class="fas fa-code"></i> Response</h5>';
  html += '    <div class="d-flex align-items-center gap-2">';
  html += '      <span class="response-status" id="' + endpointId + '-status"></span>';
  html += '      <button class="btn btn-sm btn-outline-secondary copy-response-btn" data-endpoint="' + endpointId + '">';
  html += '        <i class="fas fa-copy"></i> Copy';
  html += '      </button>';
  html += '    </div>';
  html += '  </div>';
  html += '  <div class="card-body p-0">';
  html += '    <div id="' + endpointId + '-response" class="api-response-content response-empty">';
  html += '      <div class="text-center text-muted py-5">';
  html += '        <i class="fas fa-play-circle fa-3x mb-3"></i>';
  html += '        <p>Send a request to see the response</p>';
  html += '      </div>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  $('#endpointContainer').html(html);
}

// ============================================================================
// DATA COLLECTION
// ============================================================================

function collectFormData(endpointId) {
  const endpoint = ENDPOINTS.find(e => e.id === endpointId);
  if (!endpoint) return {};

  const body = {};

  endpoint.fieldGroups.forEach(function (group, groupIndex) {
    group.fields.forEach(function (field) {
      const fieldId = endpointId + '-g' + groupIndex + '-' + field.name;
      let val = $('#' + $.escapeSelector(fieldId)).val();

      if (val === '' || val === undefined || val === null) return;
      if (Array.isArray(val) && val.length === 0) return;
      val = val.trim ? val.trim() : val;
      if (val === '') return;

      if (field.numeric) {
        const num = parseFloat(val);
        if (!isNaN(num)) val = num;
      } else if (val === 'true' || val === 'false') {
        val = val === 'true';
      }

      if (group.nestedKey) {
        const keys = group.nestedKey.split('.');
        let target = body;
        keys.forEach(function (key) {
          if (!target[key]) target[key] = {};
          target = target[key];
        });
        target[field.name] = val;
      } else {
        body[field.name] = val;
      }
    });
  });

  return body;
}

// ============================================================================
// API REQUEST HANDLING
// ============================================================================

function sendRequest(endpointId) {
  const endpoint = ENDPOINTS.find(e => e.id === endpointId);
  if (!endpoint) return;

  // Validate required path params
  let valid = true;
  endpoint.pathParams.forEach(function (param) {
    const paramVal = $('#' + $.escapeSelector(endpointId + '-' + param.name)).val();
    if (param.required && (!paramVal || !paramVal.trim())) {
      showV5Alert('Please enter ' + param.label + '.', 'warning');
      $('#' + $.escapeSelector(endpointId + '-' + param.name)).focus();
      valid = false;
    }
  });
  if (!valid) return;

  // Build URL with path param substitution
  let url = endpoint.path;
  endpoint.pathParams.forEach(function (param) {
    const paramVal = $('#' + $.escapeSelector(endpointId + '-' + param.name)).val().trim();
    url = url.replace('{' + param.name + '}', encodeURIComponent(paramVal));
  });

  const hasBody = endpoint.method !== 'GET' && endpoint.method !== 'DELETE';

  // Show loading state
  updateStatus(endpointId, 'loading', 'Sending request...');
  $('#' + $.escapeSelector(endpointId + '-response'))
    .removeClass('response-empty')
    .html(
      '<div class="text-center py-5">' +
      '  <i class="fas fa-spinner fa-spin fa-3x mb-3" style="color: #60a5fa;"></i>' +
      '  <p>Processing request...</p>' +
      '</div>'
    );

  // Disable send button
  $('.send-request-btn[data-endpoint="' + endpointId + '"]').prop('disabled', true)
    .html('<i class="fas fa-spinner fa-spin"></i> Sending...');

  const payload = {
    environment: getEnvName(),
    method: endpoint.method,
    url: url
  };

  if (hasBody && endpoint.fieldGroups.length > 0) {
    const bodyData = collectFormData(endpointId);
    if (Object.keys(bodyData).length > 0) {
      payload.body = bodyData;
    }
  }

  $.ajax({
    url: '/api/v5/proxy',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(payload),
    success: function (data) {
      displayResponse(endpointId, data);
    },
    error: function (xhr) {
      displayError(endpointId, xhr);
    },
    complete: function () {
      $('.send-request-btn[data-endpoint="' + endpointId + '"]').prop('disabled', false)
        .html('<i class="fas fa-paper-plane"></i> Send Request');
    }
  });
}

// ============================================================================
// RESPONSE DISPLAY
// ============================================================================

function displayResponse(endpointId, data) {
  const $resp = $('#' + $.escapeSelector(endpointId + '-response'));
  $resp.removeClass('response-empty');

  const statusCode = data.statusCode || data.status_code || 200;
  const responseData = data.data !== undefined ? data.data : data;

  updateStatus(endpointId, 'success', statusCode + ' OK');
  $resp.html('<pre>' + syntaxHighlightJson(JSON.stringify(responseData, null, 2)) + '</pre>');
}

function displayError(endpointId, xhr) {
  const $resp = $('#' + $.escapeSelector(endpointId + '-response'));
  $resp.removeClass('response-empty');

  let errorData;
  try {
    errorData = JSON.parse(xhr.responseText);
  } catch (e) {
    errorData = {
      error: 'Request Failed',
      message: xhr.responseText || xhr.statusText || 'Unknown error',
      statusCode: xhr.status
    };
  }

  const statusCode = xhr.status || 0;
  updateStatus(endpointId, 'error', statusCode + ' Error');
  $resp.html('<pre>' + syntaxHighlightJson(JSON.stringify(errorData, null, 2)) + '</pre>');
}

function updateStatus(endpointId, type, message) {
  const $status = $('#' + $.escapeSelector(endpointId + '-status'));
  $status.removeClass('success error loading').addClass(type).text(message);
}

// ============================================================================
// FORM UTILITIES
// ============================================================================

function copyResponse(endpointId) {
  const $resp = $('#' + $.escapeSelector(endpointId + '-response'));
  const text = $resp.find('pre').text();
  if (!text) {
    showV5Alert('No response to copy.', 'info');
    return;
  }

  navigator.clipboard.writeText(text).then(function () {
    const $btn = $('.copy-response-btn[data-endpoint="' + endpointId + '"]');
    const originalHtml = $btn.html();
    $btn.html('<i class="fas fa-check"></i> Copied!');
    setTimeout(function () { $btn.html(originalHtml); }, 2000);
  }).catch(function () {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    const $btn = $('.copy-response-btn[data-endpoint="' + endpointId + '"]');
    const originalHtml = $btn.html();
    $btn.html('<i class="fas fa-check"></i> Copied!');
    setTimeout(function () { $btn.html(originalHtml); }, 2000);
  });
}

function clearEndpointForm(endpointId) {
  $('#endpointContainer .v5-field').val('');
  $('#endpointContainer .path-param-field').val('');

  const $resp = $('#' + $.escapeSelector(endpointId + '-response'));
  $resp.addClass('response-empty').html(
    '<div class="text-center text-muted py-5">' +
    '  <i class="fas fa-play-circle fa-3x mb-3"></i>' +
    '  <p>Send a request to see the response</p>' +
    '</div>'
  );
  updateStatus(endpointId, '', '');
}

// ============================================================================
// ENVIRONMENT TOGGLE
// ============================================================================

function handleEnvToggle() {
  const env = getEnvName();
  const $label = $('#envLabel');

  $label
    .text(env)
    .removeClass('env-sandbox env-secure')
    .addClass('env-' + env);

  const currentEndpointId = $('.menu-item.active').data('endpoint');
  if (currentEndpointId) {
    const endpoint = ENDPOINTS.find(e => e.id === currentEndpointId);
    if (endpoint) {
      $('#' + $.escapeSelector(currentEndpointId + '-url')).text(getBaseUrl() + endpoint.path);
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

$(document).ready(function () {
  // Render the default endpoint
  renderEndpoint('create-sale');

  // Sidebar navigation
  $('.menu-item').on('click', function () {
    const endpointId = $(this).data('endpoint');

    $('.menu-item').removeClass('active');
    $(this).addClass('active');

    renderEndpoint(endpointId);
  });

  // Environment toggle
  $('#envToggle').on('change', handleEnvToggle);

  // Field group collapsible toggle (delegated)
  $(document).on('click', '.field-group-header', function () {
    const targetId = $(this).data('group');
    $(this).toggleClass('collapsed');
    $('#' + targetId).toggleClass('collapsed');
  });

  // Send request (delegated)
  $(document).on('click', '.send-request-btn', function () {
    sendRequest($(this).data('endpoint'));
  });

  // Clear form (delegated)
  $(document).on('click', '.clear-form-btn', function () {
    clearEndpointForm($(this).data('endpoint'));
  });

  // Copy response (delegated)
  $(document).on('click', '.copy-response-btn', function () {
    copyResponse($(this).data('endpoint'));
  });
});
