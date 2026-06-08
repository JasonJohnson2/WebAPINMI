// NMI Query API - Data & Transaction Reporting
// Standalone page for querying transactions, vault, subscriptions, invoices, etc.

// ============================================================================
// SELECT OPTION CONSTANTS
// ============================================================================

const BOOL_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'true', l: 'Yes' },
  { v: 'false', l: 'No' }
];

const CONDITION_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'pending', l: 'Pending (Auth Only awaiting capture)' },
  { v: 'pendingsettlement', l: 'Pending Settlement' },
  { v: 'in_progress', l: 'In Progress (Three-Step)' },
  { v: 'abandoned', l: 'Abandoned' },
  { v: 'failed', l: 'Failed' },
  { v: 'canceled', l: 'Canceled (Voided)' },
  { v: 'complete', l: 'Complete (Settled)' },
  { v: 'unknown', l: 'Unknown' }
];

const TRANSACTION_TYPE_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'cc', l: 'Credit Card (cc)' },
  { v: 'ck', l: 'Check (ck)' },
  { v: 'cs', l: 'Cash (cs)' }
];

const ACTION_TYPE_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'sale', l: 'Sale' },
  { v: 'refund', l: 'Refund' },
  { v: 'credit', l: 'Credit' },
  { v: 'auth', l: 'Auth' },
  { v: 'capture', l: 'Capture' },
  { v: 'void', l: 'Void' },
  { v: 'return', l: 'Return' },
  { v: 'validate', l: 'Validate' }
];

const SOURCE_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'api', l: 'API' },
  { v: 'batch_upload', l: 'Batch Upload' },
  { v: 'mobile', l: 'Mobile (iProcess)' },
  { v: 'quickclick', l: 'QuickClick' },
  { v: 'quickbooks', l: 'QuickBooks SyncPay' },
  { v: 'recurring', l: 'Recurring' },
  { v: 'swipe', l: 'Swipe' },
  { v: 'virtual_terminal', l: 'Virtual Terminal' },
  { v: 'internal', l: 'Internal (Settlement)' }
];

const REPORT_TYPE_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'receipt', l: 'Receipt (HTML)' },
  { v: 'customer_vault', l: 'Customer Vault' },
  { v: 'recurring', l: 'Recurring/Subscriptions' },
  { v: 'recurring_plans', l: 'Recurring Plans' },
  { v: 'invoicing', l: 'Invoicing' },
  { v: 'gateway_processors', l: 'Gateway Processors' },
  { v: 'account_updater', l: 'Account Updater' },
  { v: 'test_mode_status', l: 'Test Mode Status' },
  { v: 'profile', l: 'Merchant Profile' }
];

const RESULT_ORDER_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'standard', l: 'Standard (oldest to newest)' },
  { v: 'reverse', l: 'Reverse (newest to oldest)' }
];

const DATE_SEARCH_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'created', l: 'Created' },
  { v: 'updated', l: 'Updated' }
];

const INVOICE_STATUS_OPTS = [
  { v: '', l: '-- Select --' },
  { v: 'open', l: 'Open' },
  { v: 'paid', l: 'Paid' },
  { v: 'closed', l: 'Closed' },
  { v: 'past_due', l: 'Past Due' }
];

// ============================================================================
// FIELD GROUP DEFINITIONS
// ============================================================================

const GRP_QUERY_FILTERS = {
  name: 'Query Filters',
  icon: 'fas fa-filter',
  collapsed: false,
  fields: [
    { name: 'transaction_id', label: 'Transaction ID', type: 'text', description: 'Single ID or comma-separated list. Also accepts Subscription ID.' },
    { name: 'condition', label: 'Condition', type: 'select', options: CONDITION_OPTS, description: 'Comma-separate multiple values' },
    { name: 'transaction_type', label: 'Transaction Type', type: 'select', options: TRANSACTION_TYPE_OPTS },
    { name: 'action_type', label: 'Action Type', type: 'select', options: ACTION_TYPE_OPTS, description: 'Comma-separate multiple values' },
    { name: 'source', label: 'Source', type: 'select', options: SOURCE_OPTS, description: 'Comma-separate multiple values' },
    { name: 'start_date', label: 'Start Date', type: 'text', placeholder: 'YYYYMMDDhhmmss', description: 'Modified on or after this date' },
    { name: 'end_date', label: 'End Date', type: 'text', placeholder: 'YYYYMMDDhhmmss', description: 'Modified on or before this date' }
  ]
};

const GRP_CUSTOMER_SEARCH = {
  name: 'Customer Search',
  icon: 'fas fa-search',
  collapsed: true,
  fields: [
    { name: 'first_name', label: 'First Name', type: 'text' },
    { name: 'last_name', label: 'Last Name', type: 'text' },
    { name: 'email', label: 'Email', type: 'text' },
    { name: 'cc_number', label: 'Card Number', type: 'text', description: 'Full number or last 4 digits' },
    { name: 'address1', label: 'Address', type: 'text' },
    { name: 'city', label: 'City', type: 'text' },
    { name: 'state', label: 'State', type: 'text', placeholder: 'XX' },
    { name: 'zip', label: 'Zip', type: 'text' },
    { name: 'phone', label: 'Phone', type: 'text' },
    { name: 'fax', label: 'Fax', type: 'text' },
    { name: 'order_description', label: 'Order Description', type: 'text' },
    { name: 'drivers_license_number', label: "Driver's License Number", type: 'text' },
    { name: 'drivers_license_dob', label: "Driver's License DOB", type: 'text' },
    { name: 'drivers_license_state', label: "Driver's License State", type: 'text' }
  ]
};

const GRP_ID_FILTERS = {
  name: 'ID Filters',
  icon: 'fas fa-hashtag',
  collapsed: true,
  fields: [
    { name: 'subscription_id', label: 'Subscription ID', type: 'text' },
    { name: 'invoice_id', label: 'Invoice ID', type: 'text', description: 'Use with report_type=invoicing' },
    { name: 'partial_payment_id', label: 'Partial Payment ID', type: 'text' },
    { name: 'order_id', label: 'Order ID', type: 'text' },
    { name: 'customer_vault_id', label: 'Customer Vault ID', type: 'text', description: 'Use with report_type=customer_vault' }
  ]
};

const GRP_PAGINATION = {
  name: 'Pagination & Ordering',
  icon: 'fas fa-sort-amount-down',
  collapsed: true,
  fields: [
    { name: 'result_limit', label: 'Result Limit', type: 'text', description: 'Max number of results returned' },
    { name: 'page_number', label: 'Page Number', type: 'text', description: 'Page of results (default: 0)' },
    { name: 'result_order', label: 'Result Order', type: 'select', options: RESULT_ORDER_OPTS }
  ]
};

const GRP_VAULT_OPTIONS = {
  name: 'Vault & Report Options',
  icon: 'fas fa-sliders-h',
  collapsed: true,
  fields: [
    { name: 'date_search', label: 'Date Search', type: 'select', options: DATE_SEARCH_OPTS, description: 'Use with report_type=customer_vault' },
    { name: 'invoice_status', label: 'Invoice Status', type: 'select', options: INVOICE_STATUS_OPTS, description: 'Use with report_type=invoicing. Comma-separate multiple.' },
    { name: 'mobile_device_license', label: 'Mobile Device License', type: 'text', description: 'Device ID or "any_mobile" for all' },
    { name: 'mobile_device_nickname', label: 'Mobile Device Nickname', type: 'text' },
    { name: 'processor_details', label: 'Processor Details', type: 'select', options: BOOL_OPTS, description: 'Use with report_type=profile to include card_schemes' }
  ]
};

const GRP_MERCHANT_DEFINED = {
  name: 'Merchant Defined Fields',
  icon: 'fas fa-tags',
  collapsed: true,
  fields: Array.from({ length: 20 }, (_, i) => ({
    name: 'merchant_defined_field_' + (i + 1),
    label: 'Merchant Defined Field ' + (i + 1),
    type: 'text'
  }))
};

// ============================================================================
// ENDPOINT DEFINITIONS
// ============================================================================

const ENDPOINTS = [
  {
    id: 'query-transactions',
    title: 'Query Transactions',
    description: 'Search and retrieve transaction data with flexible filters including date ranges, conditions, action types, and customer information.',
    reportType: null,
    fieldGroups: [GRP_QUERY_FILTERS, GRP_CUSTOMER_SEARCH, GRP_ID_FILTERS, GRP_PAGINATION, GRP_MERCHANT_DEFINED]
  },
  {
    id: 'query-customer-vault',
    title: 'Query Customer Vault',
    description: 'Retrieve customer records stored in the Customer Vault. Optionally filter by customer_vault_id or date ranges.',
    reportType: 'customer_vault',
    fieldGroups: [
      {
        name: 'Vault Filters',
        icon: 'fas fa-vault',
        collapsed: false,
        fields: [
          { name: 'customer_vault_id', label: 'Customer Vault ID', type: 'text', description: 'Omit to return all vault records' },
          { name: 'date_search', label: 'Date Search', type: 'select', options: DATE_SEARCH_OPTS, description: 'Filter by created or updated date' },
          { name: 'start_date', label: 'Start Date', type: 'text', placeholder: 'YYYYMMDDhhmmss' },
          { name: 'end_date', label: 'End Date', type: 'text', placeholder: 'YYYYMMDDhhmmss' }
        ]
      },
      GRP_CUSTOMER_SEARCH,
      GRP_PAGINATION
    ]
  },
  {
    id: 'query-subscriptions',
    title: 'Query Subscriptions',
    description: 'Retrieve subscription/recurring billing data. Use subscription_id for a specific record or query all subscriptions.',
    reportType: 'recurring',
    fieldGroups: [
      {
        name: 'Subscription Filters',
        icon: 'fas fa-sync',
        collapsed: false,
        fields: [
          { name: 'subscription_id', label: 'Subscription ID', type: 'text', description: 'Single ID or comma-separated list' },
          { name: 'start_date', label: 'Start Date', type: 'text', placeholder: 'YYYYMMDDhhmmss' },
          { name: 'end_date', label: 'End Date', type: 'text', placeholder: 'YYYYMMDDhhmmss' }
        ]
      },
      GRP_PAGINATION
    ]
  },
  {
    id: 'query-plans',
    title: 'Query Recurring Plans',
    description: 'Retrieve recurring billing plan definitions.',
    reportType: 'recurring_plans',
    fieldGroups: [GRP_PAGINATION]
  },
  {
    id: 'query-invoicing',
    title: 'Query Invoicing',
    description: 'Retrieve invoice data. Filter by invoice ID, status, or date range.',
    reportType: 'invoicing',
    fieldGroups: [
      {
        name: 'Invoice Filters',
        icon: 'fas fa-file-invoice-dollar',
        collapsed: false,
        fields: [
          { name: 'invoice_id', label: 'Invoice ID', type: 'text' },
          { name: 'invoice_status', label: 'Invoice Status', type: 'select', options: INVOICE_STATUS_OPTS, description: 'Comma-separate multiple: open,paid,closed,past_due' },
          { name: 'start_date', label: 'Start Date', type: 'text', placeholder: 'YYYYMMDDhhmmss' },
          { name: 'end_date', label: 'End Date', type: 'text', placeholder: 'YYYYMMDDhhmmss' }
        ]
      },
      GRP_PAGINATION
    ]
  },
  {
    id: 'query-gateway-processors',
    title: 'Query Gateway Processors',
    description: 'Retrieve processor details for the merchant account associated with the security key.',
    reportType: 'gateway_processors',
    fieldGroups: []
  },
  {
    id: 'query-merchant-profile',
    title: 'Query Merchant Profile',
    description: 'Retrieve merchant profile information including company, email, address, timezone, and defined fields. Set Processor Details to include card schemes.',
    reportType: 'profile',
    fieldGroups: [
      {
        name: 'Profile Options',
        icon: 'fas fa-id-badge',
        collapsed: false,
        fields: [
          { name: 'processor_details', label: 'Processor Details', type: 'select', options: BOOL_OPTS, description: 'Include card_schemes in response' }
        ]
      }
    ]
  },
  {
    id: 'query-test-mode',
    title: 'Query Test Mode Status',
    description: 'Check whether the merchant account has test mode active or inactive.',
    reportType: 'test_mode_status',
    fieldGroups: []
  },
  {
    id: 'query-account-updater',
    title: 'Query Account Updater',
    description: 'Retrieve Customer Vault data that has been updated using the Account Updater service.',
    reportType: 'account_updater',
    fieldGroups: [
      {
        name: 'Account Updater Filters',
        icon: 'fas fa-redo',
        collapsed: false,
        fields: [
          { name: 'start_date', label: 'Start Date', type: 'text', placeholder: 'YYYYMMDDhhmmss' },
          { name: 'end_date', label: 'End Date', type: 'text', placeholder: 'YYYYMMDDhhmmss' }
        ]
      },
      GRP_PAGINATION
    ]
  },
  {
    id: 'query-receipt',
    title: 'Transaction Receipt',
    description: 'Retrieve an HTML receipt for a specific transaction by its ID.',
    reportType: 'receipt',
    fieldGroups: [
      {
        name: 'Receipt Filters',
        icon: 'fas fa-receipt',
        collapsed: false,
        fields: [
          { name: 'transaction_id', label: 'Transaction ID', type: 'text', required: true, description: 'Required. The transaction to generate a receipt for.' }
        ]
      }
    ]
  }
];

// ============================================================================
// UTILITY HELPERS
// ============================================================================

const DEFAULT_KEYS = {
  sandbox: 'Kes9dc87682hQHn6JSTTs44uyvz66c56',
  secure: 'dWE6997j8s3rEwK75a4d53t6gZgJUEev'
};

function getEnvName() {
  return $('#envToggle').is(':checked') ? 'secure' : 'sandbox';
}

function getBaseUrl() {
  return getEnvName() === 'secure'
    ? 'https://secure.nmi.com'
    : 'https://sandbox.nmi.com';
}

function getApiKeyForEnv(env) {
  return localStorage.getItem('nmi_query_api_key_' + env) || DEFAULT_KEYS[env] || '';
}

function setApiKeyForEnv(env, key) {
  localStorage.setItem('nmi_query_api_key_' + env, key);
}

function showAlert(message, type) {
  var icon = type === 'warning' ? 'exclamation-triangle'
    : type === 'success' ? 'check-circle'
    : type === 'danger' ? 'exclamation-circle'
    : 'info-circle';

  var alertHtml =
    '<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">' +
    '  <i class="fas fa-' + icon + ' me-2"></i>' + message +
    '  <button type="button" class="btn-close" data-bs-dismiss="alert"></button>' +
    '</div>';

  $('#endpointContainer').prepend(alertHtml);
  setTimeout(function () { $('#endpointContainer > .alert').first().fadeOut(300, function () { $(this).remove(); }); }, 5000);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function syntaxHighlightJson(json) {
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      var cls = 'json-number';
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

function formatXml(xml) {
  var formatted = '';
  var indent = '';
  var tab = '  ';

  xml = xml.replace(/>\s*</g, '><');

  xml.split(/(<[^>]+>)/g).forEach(function (node) {
    if (!node.trim()) return;

    if (node.match(/^<\/\w/)) {
      indent = indent.substring(tab.length);
      formatted += indent + node + '\n';
    } else if (node.match(/^<\w[^>]*[^\/]>$/)) {
      formatted += indent + node + '\n';
      indent += tab;
    } else if (node.match(/^<\w[^>]*\/>$/)) {
      formatted += indent + node + '\n';
    } else if (node.match(/^<\?/)) {
      formatted += indent + node + '\n';
    } else {
      formatted = formatted.trimEnd();
      formatted += node + '\n';
    }
  });

  return formatted.trim();
}

function syntaxHighlightXml(xml) {
  var escaped = escapeHtml(xml);
  return escaped
    .replace(/(&lt;\/?)([\w:-]+)/g, '$1<span class="xml-tag">$2</span>')
    .replace(/([\w:-]+)=&quot;([^&]*?)&quot;/g, '<span class="xml-attr">$1</span>=<span class="xml-string">&quot;$2&quot;</span>')
    .replace(/(&lt;\?[\s\S]*?\?&gt;)/g, '<span class="xml-declaration">$1</span>');
}

// ============================================================================
// FORM RENDERING
// ============================================================================

function renderEndpoint(endpointId) {
  var endpoint = ENDPOINTS.find(function (e) { return e.id === endpointId; });
  if (!endpoint) return;

  var baseUrl = getBaseUrl();
  var fullUrl = baseUrl + '/api/query.php';
  var html = '';

  html += '<div class="endpoint-header">';
  html += '  <div class="d-flex align-items-center flex-wrap gap-2 mb-2">';
  html += '    <span class="http-method post-method">POST</span>';
  html += '    <span class="endpoint-url" id="' + endpointId + '-url">' + fullUrl + '</span>';
  html += '  </div>';
  html += '  <h2>' + endpoint.title + '</h2>';
  html += '  <p class="text-muted">' + endpoint.description + '</p>';
  if (endpoint.reportType) {
    html += '  <span class="report-type-badge"><i class="fas fa-tag me-1"></i>report_type=' + endpoint.reportType + '</span>';
  }
  html += '</div>';

  // Security Key card
  html += '<div class="card mb-3">';
  html += '  <div class="card-header"><h5><i class="fas fa-key"></i> Authentication</h5></div>';
  html += '  <div class="card-body">';
  html += '    <div class="row"><div class="col-md-6">';
  html += '      <label class="form-label" for="' + endpointId + '-securityKey">Security Key <span class="text-danger">*</span></label>';
  html += '      <input type="text" class="form-control" id="' + endpointId + '-securityKey" placeholder="Enter your security key" autocomplete="off">';
  html += '      <div class="form-text">API Security Key from Settings &gt; Security Keys in the merchant control panel.</div>';
  html += '    </div></div>';
  html += '  </div>';
  html += '</div>';

  // Field groups
  if (endpoint.fieldGroups.length > 0) {
    html += '<div class="card mb-3"><div class="card-body p-2">';

    endpoint.fieldGroups.forEach(function (group, groupIndex) {
      var collapsed = group.collapsed ? 'collapsed' : '';
      var groupId = endpointId + '-group-' + groupIndex;

      html += '<div class="field-group-header ' + collapsed + '" data-group="' + groupId + '">';
      html += '  <h6><i class="' + group.icon + '"></i> ' + group.name + '</h6>';
      html += '  <i class="fas fa-chevron-down toggle-icon"></i>';
      html += '</div>';
      html += '<div class="field-group-body ' + collapsed + '" id="' + groupId + '">';
      html += '  <div class="row px-3">';

      group.fields.forEach(function (field) {
        var fieldId = endpointId + '-g' + groupIndex + '-' + field.name;

        html += '<div class="col-md-6 mb-3">';
        html += '  <label class="form-label" for="' + fieldId + '">' + field.label;
        if (field.required) html += ' <span class="text-danger">*</span>';
        html += '</label>';

        if (field.type === 'select') {
          html += '<select class="form-control query-field" id="' + fieldId + '" data-field-name="' + field.name + '">';
          (field.options || []).forEach(function (opt) {
            html += '<option value="' + opt.v + '">' + opt.l + '</option>';
          });
          html += '</select>';
        } else {
          html += '<input type="text" class="form-control query-field" id="' + fieldId + '"';
          html += ' data-field-name="' + field.name + '"';
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
  html += '    <i class="fas fa-paper-plane"></i> Send Query';
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
  html += '        <p>Send a query to see the response</p>';
  html += '      </div>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  $('#endpointContainer').html(html);

  var currentKey = getApiKeyForEnv(getEnvName());
  if (currentKey) {
    $('#' + endpointId + '-securityKey').val(currentKey);
  }
}

// ============================================================================
// DATA COLLECTION
// ============================================================================

function collectFormData(endpointId) {
  var endpoint = ENDPOINTS.find(function (e) { return e.id === endpointId; });
  if (!endpoint) return {};

  var params = {};

  endpoint.fieldGroups.forEach(function (group, groupIndex) {
    group.fields.forEach(function (field) {
      var fieldId = endpointId + '-g' + groupIndex + '-' + field.name;
      var val = $('#' + $.escapeSelector(fieldId)).val();

      if (val === '' || val === undefined || val === null) return;
      val = val.trim ? val.trim() : val;
      if (val === '') return;

      params[field.name] = val;
    });
  });

  return params;
}

// ============================================================================
// REQUEST HANDLING
// ============================================================================

function sendRequest(endpointId) {
  var endpoint = ENDPOINTS.find(function (e) { return e.id === endpointId; });
  if (!endpoint) return;

  var securityKey = $('#' + $.escapeSelector(endpointId + '-securityKey')).val().trim();
  if (!securityKey) {
    showAlert('Please enter your Security Key before making a request.', 'warning');
    $('#' + $.escapeSelector(endpointId + '-securityKey')).focus();
    return;
  }

  setApiKeyForEnv(getEnvName(), securityKey);

  updateStatus(endpointId, 'loading', 'Sending query...');
  $('#' + $.escapeSelector(endpointId + '-response'))
    .removeClass('response-empty')
    .html(
      '<div class="text-center py-5">' +
      '  <i class="fas fa-spinner fa-spin fa-3x mb-3" style="color: #60a5fa;"></i>' +
      '  <p>Processing query...</p>' +
      '</div>'
    );

  $('.send-request-btn[data-endpoint="' + endpointId + '"]').prop('disabled', true)
    .html('<i class="fas fa-spinner fa-spin"></i> Querying...');

  var parameters = collectFormData(endpointId);

  if (endpoint.reportType) {
    parameters.report_type = endpoint.reportType;
  }

  var payload = {
    security_key: securityKey,
    parameters: parameters,
    baseUrl: getBaseUrl()
  };

  $.ajax({
    url: '/api/v5/query-proxy',
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
        .html('<i class="fas fa-paper-plane"></i> Send Query');
    }
  });
}

// ============================================================================
// RESPONSE DISPLAY
// ============================================================================

function displayResponse(endpointId, data) {
  var $resp = $('#' + $.escapeSelector(endpointId + '-response'));
  $resp.removeClass('response-empty');

  var statusCode = data.statusCode || 200;
  var responseData = data.data || '';
  var contentType = data.contentType || 'text/xml';

  if (data.success) {
    updateStatus(endpointId, 'success', statusCode + ' OK');
  } else {
    updateStatus(endpointId, 'error', statusCode + ' Error');
  }

  if (contentType.includes('xml') || (typeof responseData === 'string' && (responseData.trim().startsWith('<?xml') || responseData.trim().startsWith('<')))) {
    try {
      var formatted = formatXml(responseData);
      $resp.html('<pre>' + syntaxHighlightXml(formatted) + '</pre>');
    } catch (e) {
      $resp.html('<pre>' + escapeHtml(responseData) + '</pre>');
    }
  } else if (typeof responseData === 'string') {
    try {
      var jsonData = JSON.parse(responseData);
      $resp.html('<pre>' + syntaxHighlightJson(JSON.stringify(jsonData, null, 2)) + '</pre>');
    } catch (e) {
      $resp.html('<pre>' + escapeHtml(responseData) + '</pre>');
    }
  } else {
    $resp.html('<pre>' + syntaxHighlightJson(JSON.stringify(responseData, null, 2)) + '</pre>');
  }
}

function displayError(endpointId, xhr) {
  var $resp = $('#' + $.escapeSelector(endpointId + '-response'));
  $resp.removeClass('response-empty');

  var errorData;
  try {
    errorData = JSON.parse(xhr.responseText);
  } catch (e) {
    errorData = {
      error: 'Request Failed',
      message: xhr.responseText || xhr.statusText || 'Unknown error',
      statusCode: xhr.status
    };
  }

  var statusCode = xhr.status || 0;
  updateStatus(endpointId, 'error', statusCode + ' Error');
  $resp.html('<pre>' + syntaxHighlightJson(JSON.stringify(errorData, null, 2)) + '</pre>');
}

function updateStatus(endpointId, type, message) {
  var $status = $('#' + $.escapeSelector(endpointId + '-status'));
  $status.removeClass('success error loading').addClass(type).text(message);
}

// ============================================================================
// FORM UTILITIES
// ============================================================================

function copyResponse(endpointId) {
  var $resp = $('#' + $.escapeSelector(endpointId + '-response'));
  var text = $resp.find('pre').text();
  if (!text) {
    showAlert('No response to copy.', 'info');
    return;
  }

  navigator.clipboard.writeText(text).then(function () {
    var $btn = $('.copy-response-btn[data-endpoint="' + endpointId + '"]');
    var originalHtml = $btn.html();
    $btn.html('<i class="fas fa-check"></i> Copied!');
    setTimeout(function () { $btn.html(originalHtml); }, 2000);
  }).catch(function () {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    var $btn = $('.copy-response-btn[data-endpoint="' + endpointId + '"]');
    var originalHtml = $btn.html();
    $btn.html('<i class="fas fa-check"></i> Copied!');
    setTimeout(function () { $btn.html(originalHtml); }, 2000);
  });
}

function clearForm(endpointId) {
  $('#endpointContainer .query-field').val('');

  var $resp = $('#' + $.escapeSelector(endpointId + '-response'));
  $resp.addClass('response-empty').html(
    '<div class="text-center text-muted py-5">' +
    '  <i class="fas fa-play-circle fa-3x mb-3"></i>' +
    '  <p>Send a query to see the response</p>' +
    '</div>'
  );
  updateStatus(endpointId, '', '');
}

// ============================================================================
// ENVIRONMENT TOGGLE
// ============================================================================

function handleEnvToggle() {
  var env = getEnvName();
  var $label = $('#envLabel');

  $label
    .text(env)
    .removeClass('env-sandbox env-secure')
    .addClass('env-' + env);

  var currentEndpointId = $('.menu-item.active').data('endpoint');
  if (currentEndpointId) {
    $('#' + $.escapeSelector(currentEndpointId + '-url')).text(getBaseUrl() + '/api/query.php');

    var $keyField = $('#' + $.escapeSelector(currentEndpointId + '-securityKey'));
    if ($keyField.length) {
      $keyField.val(getApiKeyForEnv(env));
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

$(document).ready(function () {
  renderEndpoint('query-transactions');

  $('.menu-item').on('click', function () {
    var endpointId = $(this).data('endpoint');
    $('.menu-item').removeClass('active');
    $(this).addClass('active');
    renderEndpoint(endpointId);
  });

  $('#envToggle').on('change', handleEnvToggle);

  $(document).on('click', '.field-group-header', function () {
    var targetId = $(this).data('group');
    $(this).toggleClass('collapsed');
    $('#' + targetId).toggleClass('collapsed');
  });

  $(document).on('click', '.send-request-btn', function () {
    sendRequest($(this).data('endpoint'));
  });

  $(document).on('click', '.clear-form-btn', function () {
    clearForm($(this).data('endpoint'));
  });

  $(document).on('click', '.copy-response-btn', function () {
    copyResponse($(this).data('endpoint'));
  });
});
