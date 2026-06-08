// NMI Invoice Management - Classic API (transact.php)
// Per documentation, this integration always targets the sandbox endpoint.

// ============================================================================
// CONSTANTS
// ============================================================================

const SANDBOX_SECURITY_KEY = 'Kes9dc87682hQHn6JSTTs44uyvz66c56';
const SANDBOX_URL = 'https://sandbox.nmi.com/api/transact.php';
const PROXY_ENDPOINT = '/invoice';

const PAYMENT_METHOD_OPTS = [
  { v: '', l: '-- Default (all enabled) --' },
  { v: 'cc', l: 'Credit Card (cc)' },
  { v: 'ck', l: 'eCheck (ck)' },
  { v: 'cs', l: 'Cash (cs)' },
  { v: 'cc,ck', l: 'Credit Card + eCheck' },
  { v: 'cc,ck,cs', l: 'All Methods' }
];

// ============================================================================
// FIELD GROUP DEFINITIONS
// ============================================================================

const GRP_INVOICE_DETAILS_CREATE = {
  name: 'Invoice Details',
  icon: 'fas fa-file-invoice-dollar',
  collapsed: false,
  fields: [
    { name: 'amount', label: 'Amount', type: 'text', required: true, placeholder: '1.00', description: 'Total amount to be invoiced. Must be greater than 0.00. Format: x.xx' },
    { name: 'email', label: 'Billing Email', type: 'text', required: true, placeholder: 'customer@example.com', description: 'Where the invoice will be emailed.' },
    { name: 'payment_terms', label: 'Payment Terms', type: 'text', placeholder: 'upon_receipt', description: '"upon_receipt" or integer days 0-999. Default: upon_receipt.' },
    { name: 'payment_methods_allowed', label: 'Payment Methods Allowed', type: 'select', options: PAYMENT_METHOD_OPTS, description: 'Defaults to all methods available on your merchant account.' },
    { name: 'currency', label: 'Currency', type: 'text', placeholder: 'USD', description: 'ISO 4217 currency code. Cannot be changed once set.' },
    { name: 'processor_id', label: 'Processor ID', type: 'text', description: 'Only when using multiple MIDs. Comma-separate per payment type if needed.' }
  ]
};

const GRP_INVOICE_DETAILS_UPDATE = {
  name: 'Invoice Details',
  icon: 'fas fa-file-invoice-dollar',
  collapsed: false,
  fields: [
    { name: 'invoice_id', label: 'Invoice ID', type: 'text', required: true, placeholder: '8543919398', description: 'The invoice ID to be updated.' },
    { name: 'amount', label: 'Amount', type: 'text', placeholder: '2.00', description: 'Updated invoice amount. Format: x.xx' },
    { name: 'email', label: 'Billing Email', type: 'text', placeholder: 'customer@example.com' },
    { name: 'payment_terms', label: 'Payment Terms', type: 'text', placeholder: 'upon_receipt' },
    { name: 'payment_methods_allowed', label: 'Payment Methods Allowed', type: 'select', options: PAYMENT_METHOD_OPTS },
    { name: 'processor_id', label: 'Processor ID', type: 'text' }
  ]
};

const GRP_ORDER_INFO = {
  name: 'Order Information',
  icon: 'fas fa-receipt',
  collapsed: true,
  fields: [
    { name: 'order_description', label: 'Order Description', type: 'text' },
    { name: 'orderid', label: 'Order ID', type: 'text' },
    { name: 'ponumber', label: 'PO Number', type: 'text', description: 'Original purchase order.' },
    { name: 'customer_id', label: 'Customer ID', type: 'text' },
    { name: 'customer_tax_id', label: 'Customer Tax ID', type: 'text' },
    { name: 'tax', label: 'Tax', type: 'text', placeholder: '0.00', description: 'Total sales tax amount.' },
    { name: 'shipping', label: 'Shipping', type: 'text', placeholder: '0.00', description: 'Total shipping amount.' }
  ]
};

const GRP_BILLING = {
  name: 'Billing Address',
  icon: 'fas fa-user',
  collapsed: true,
  fields: [
    { name: 'first_name', label: 'First Name', type: 'text' },
    { name: 'last_name', label: 'Last Name', type: 'text' },
    { name: 'company', label: 'Company', type: 'text' },
    { name: 'address1', label: 'Address', type: 'text' },
    { name: 'address2', label: 'Address Line 2', type: 'text' },
    { name: 'city', label: 'City', type: 'text' },
    { name: 'state', label: 'State', type: 'text', placeholder: 'CC' },
    { name: 'zip', label: 'Zip', type: 'text' },
    { name: 'country', label: 'Country', type: 'text', placeholder: 'CC', description: 'ISO 3166-1 alpha-2.' },
    { name: 'phone', label: 'Phone', type: 'text' },
    { name: 'fax', label: 'Fax', type: 'text' },
    { name: 'website', label: 'Website', type: 'text' }
  ]
};

const GRP_SHIPPING = {
  name: 'Shipping Address',
  icon: 'fas fa-truck',
  collapsed: true,
  fields: [
    { name: 'shipping_firstname', label: 'Shipping First Name', type: 'text' },
    { name: 'shipping_lastname', label: 'Shipping Last Name', type: 'text' },
    { name: 'shipping_company', label: 'Shipping Company', type: 'text' },
    { name: 'shipping_address1', label: 'Shipping Address', type: 'text' },
    { name: 'shipping_address2', label: 'Shipping Address Line 2', type: 'text' },
    { name: 'shipping_city', label: 'Shipping City', type: 'text' },
    { name: 'shipping_state', label: 'Shipping State', type: 'text', placeholder: 'CC' },
    { name: 'shipping_zip', label: 'Shipping Zip', type: 'text' },
    { name: 'shipping_country', label: 'Shipping Country', type: 'text', placeholder: 'CC' },
    { name: 'shipping_email', label: 'Shipping Email', type: 'text' }
  ]
};

const GRP_LINE_ITEM = {
  name: 'Line Item (Product Information)',
  icon: 'fas fa-box',
  collapsed: true,
  fields: [
    { name: 'item_product_code_1', label: 'Product Code', type: 'text' },
    { name: 'item_description_1', label: 'Description', type: 'text' },
    { name: 'item_commodity_code_1', label: 'Commodity Code', type: 'text' },
    { name: 'item_unit_of_measure_1', label: 'Unit of Measure', type: 'text', placeholder: 'EACH' },
    { name: 'item_unit_cost_1', label: 'Unit Cost', type: 'text' },
    { name: 'item_quantity_1', label: 'Quantity', type: 'text', placeholder: '1' },
    { name: 'item_total_amount_1', label: 'Total Amount', type: 'text', description: 'Defaults to unit_cost x quantity.' },
    { name: 'item_tax_amount_1', label: 'Tax Amount', type: 'text', placeholder: '0.00' },
    { name: 'item_tax_rate_1', label: 'Tax Rate', type: 'text', placeholder: '0.00' },
    { name: 'item_discount_amount_1', label: 'Discount Amount', type: 'text' },
    { name: 'item_discount_rate_1', label: 'Discount Rate', type: 'text', placeholder: '0.00' },
    { name: 'item_tax_type_1', label: 'Tax Type', type: 'text' },
    { name: 'item_alternate_tax_id_1', label: 'Alternate Tax ID', type: 'text' }
  ]
};

const GRP_LINE_ITEM_UPDATE = {
  name: 'Line Item (Product Information)',
  icon: 'fas fa-box',
  collapsed: true,
  fields: [
    { name: 'item_id_1', label: 'Item ID', type: 'text', description: 'Existing line item ID to update. Omit to add a new line item.' },
    { name: 'item_product_code_1', label: 'Product Code', type: 'text' },
    { name: 'item_description_1', label: 'Description', type: 'text' },
    { name: 'item_commodity_code_1', label: 'Commodity Code', type: 'text' },
    { name: 'item_unit_of_measure_1', label: 'Unit of Measure', type: 'text', placeholder: 'EACH' },
    { name: 'item_unit_cost_1', label: 'Unit Cost', type: 'text' },
    { name: 'item_quantity_1', label: 'Quantity', type: 'text', placeholder: '1' },
    { name: 'item_total_amount_1', label: 'Total Amount', type: 'text', description: 'Defaults to unit_cost x quantity.' },
    { name: 'item_tax_amount_1', label: 'Tax Amount', type: 'text', placeholder: '0.00' },
    { name: 'item_tax_rate_1', label: 'Tax Rate', type: 'text', placeholder: '0.00' },
    { name: 'item_discount_amount_1', label: 'Discount Amount', type: 'text' },
    { name: 'item_discount_rate_1', label: 'Discount Rate', type: 'text', placeholder: '0.00' },
    { name: 'item_tax_type_1', label: 'Tax Type', type: 'text' },
    { name: 'item_alternate_tax_id_1', label: 'Alternate Tax ID', type: 'text' }
  ]
};

const GRP_MERCHANT_DEFINED = {
  name: 'Merchant Defined Fields',
  icon: 'fas fa-tags',
  collapsed: true,
  fields: Array.from({ length: 5 }, (_, i) => ({
    name: 'merchant_defined_field_' + (i + 1),
    label: 'Merchant Defined Field ' + (i + 1),
    type: 'text'
  }))
};

// ============================================================================
// OPERATION DEFINITIONS
// ============================================================================

const OPERATIONS = {
  add_invoice: {
    id: 'add_invoice',
    title: 'Create Invoice',
    description: 'Create a new invoice and email it to the customer.',
    badge: 'invoicing=add_invoice',
    fieldGroups: [
      GRP_INVOICE_DETAILS_CREATE,
      GRP_ORDER_INFO,
      GRP_BILLING,
      GRP_SHIPPING,
      GRP_LINE_ITEM,
      GRP_MERCHANT_DEFINED
    ],
    sample: {
      amount: '1.00',
      email: 'test@example.com'
    }
  },
  update_invoice: {
    id: 'update_invoice',
    title: 'Update Invoice',
    description: 'Update an existing invoice. All variables (besides currency) may be updated. Updating an invoice does not send a new email to the customer — use Send Invoice afterward.',
    badge: 'invoicing=update_invoice',
    fieldGroups: [
      GRP_INVOICE_DETAILS_UPDATE,
      GRP_ORDER_INFO,
      GRP_BILLING,
      GRP_SHIPPING,
      GRP_LINE_ITEM_UPDATE,
      GRP_MERCHANT_DEFINED
    ],
    sample: {
      invoice_id: '',
      amount: '2.00'
    }
  },
  send_invoice: {
    id: 'send_invoice',
    title: 'Send Invoice',
    description: 'Email an existing invoice to the billing email on file.',
    badge: 'invoicing=send_invoice',
    fieldGroups: [
      {
        name: 'Invoice',
        icon: 'fas fa-paper-plane',
        collapsed: false,
        fields: [
          { name: 'invoice_id', label: 'Invoice ID', type: 'text', required: true, placeholder: '8543919398', description: 'The invoice ID to email to the customer.' }
        ]
      }
    ],
    sample: {
      invoice_id: ''
    }
  },
  close_invoice: {
    id: 'close_invoice',
    title: 'Close Invoice',
    description: 'Close an open invoice. Once closed, the invoice cannot be re-opened or modified.',
    badge: 'invoicing=close_invoice',
    fieldGroups: [
      {
        name: 'Invoice',
        icon: 'fas fa-circle-xmark',
        collapsed: false,
        fields: [
          { name: 'invoice_id', label: 'Invoice ID', type: 'text', required: true, placeholder: '8543919398', description: 'The invoice ID to close.' }
        ]
      }
    ],
    sample: {
      invoice_id: ''
    }
  }
};

// ============================================================================
// HELPERS
// ============================================================================

function getApiKey() {
  return localStorage.getItem('nmi_invoice_api_key') || SANDBOX_SECURITY_KEY;
}

function setApiKey(key) {
  localStorage.setItem('nmi_invoice_api_key', key);
}

function rememberInvoiceId(id) {
  if (id) localStorage.setItem('nmi_invoice_last_id', id);
}

function getLastInvoiceId() {
  return localStorage.getItem('nmi_invoice_last_id') || '';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseFormUrlEncoded(body) {
  var pairs = {};
  if (!body) return pairs;
  body.split('&').forEach(function (segment) {
    var idx = segment.indexOf('=');
    if (idx < 0) {
      pairs[decodeURIComponent(segment)] = '';
      return;
    }
    var key = decodeURIComponent(segment.slice(0, idx).replace(/\+/g, ' '));
    var value = decodeURIComponent(segment.slice(idx + 1).replace(/\+/g, ' '));
    pairs[key] = value;
  });
  return pairs;
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

  $('#invoiceContainer').prepend(alertHtml);
  setTimeout(function () {
    $('#invoiceContainer > .alert').first().fadeOut(300, function () { $(this).remove(); });
  }, 5000);
}

// ============================================================================
// FORM RENDERING
// ============================================================================

function renderOperation(operationKey) {
  var op = OPERATIONS[operationKey];
  if (!op) return;

  var html = '';

  // Header
  html += '<div class="endpoint-header">';
  html += '  <div class="d-flex align-items-center flex-wrap gap-2 mb-2">';
  html += '    <span class="http-method post-method">POST</span>';
  html += '    <span class="endpoint-url">' + SANDBOX_URL + '</span>';
  html += '  </div>';
  html += '  <h2>' + op.title + '</h2>';
  html += '  <p class="text-muted">' + op.description + '</p>';
  html += '  <span class="operation-badge"><i class="fas fa-tag me-1"></i>' + op.badge + '</span>';
  html += '</div>';

  // Authentication card
  html += '<div class="card mb-3">';
  html += '  <div class="card-header"><h5><i class="fas fa-key"></i> Authentication</h5></div>';
  html += '  <div class="card-body">';
  html += '    <div class="row"><div class="col-md-8">';
  html += '      <label class="form-label" for="invoiceSecurityKey">Security Key <span class="text-danger">*</span></label>';
  html += '      <input type="text" class="form-control" id="invoiceSecurityKey" placeholder="Enter your security key" autocomplete="off">';
  html += '      <div class="form-text">Sandbox key prefilled. Override to test against a different sandbox merchant.</div>';
  html += '    </div></div>';
  html += '  </div>';
  html += '</div>';

  // Field groups
  if (op.fieldGroups.length > 0) {
    html += '<div class="card mb-3"><div class="card-body p-2">';

    op.fieldGroups.forEach(function (group, groupIndex) {
      var collapsed = group.collapsed ? 'collapsed' : '';
      var groupId = op.id + '-group-' + groupIndex;

      html += '<div class="field-group-header ' + collapsed + '" data-group="' + groupId + '">';
      html += '  <h6><i class="' + group.icon + '"></i> ' + group.name + '</h6>';
      html += '  <i class="fas fa-chevron-down toggle-icon"></i>';
      html += '</div>';
      html += '<div class="field-group-body ' + collapsed + '" id="' + groupId + '">';
      html += '  <div class="row px-3">';

      group.fields.forEach(function (field) {
        var fieldId = op.id + '-g' + groupIndex + '-' + field.name;

        html += '<div class="col-md-6 mb-3">';
        html += '  <label class="form-label" for="' + fieldId + '">' + field.label;
        if (field.required) html += ' <span class="text-danger">*</span>';
        html += '</label>';

        if (field.type === 'select') {
          html += '<select class="form-control invoice-field" id="' + fieldId + '" data-field-name="' + field.name + '">';
          (field.options || []).forEach(function (opt) {
            html += '<option value="' + escapeHtml(opt.v) + '">' + escapeHtml(opt.l) + '</option>';
          });
          html += '</select>';
        } else {
          html += '<input type="text" class="form-control invoice-field" id="' + fieldId + '"';
          html += ' data-field-name="' + field.name + '"';
          html += ' placeholder="' + escapeHtml(field.placeholder || '') + '"';
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
  html += '<div class="d-flex gap-2 mb-3 flex-wrap">';
  html += '  <button class="btn btn-primary send-invoice-btn" data-operation="' + op.id + '">';
  html += '    <i class="fas fa-paper-plane"></i> Send Request';
  html += '  </button>';
  html += '  <button class="btn btn-secondary clear-invoice-btn">';
  html += '    <i class="fas fa-eraser"></i> Clear Form';
  html += '  </button>';
  html += '  <button class="btn btn-secondary sample-invoice-btn" data-operation="' + op.id + '">';
  html += '    <i class="fas fa-magic"></i> Load Sample';
  html += '  </button>';

  var lastId = getLastInvoiceId();
  if (lastId && op.id !== 'add_invoice') {
    html += '  <button class="btn btn-secondary use-last-id-btn" data-operation="' + op.id + '" data-invoice-id="' + escapeHtml(lastId) + '">';
    html += '    <i class="fas fa-link"></i> Use Last Invoice ID (' + escapeHtml(lastId) + ')';
    html += '  </button>';
  }
  html += '</div>';

  // Response area
  html += '<div class="card mb-4">';
  html += '  <div class="card-header d-flex justify-content-between align-items-center">';
  html += '    <h5><i class="fas fa-code"></i> Gateway Response</h5>';
  html += '    <div class="d-flex align-items-center gap-2">';
  html += '      <span class="response-status" id="invoiceStatus"></span>';
  html += '      <button class="btn btn-sm btn-outline-secondary copy-invoice-response-btn">';
  html += '        <i class="fas fa-copy"></i> Copy';
  html += '      </button>';
  html += '    </div>';
  html += '  </div>';
  html += '  <div class="card-body p-0">';
  html += '    <div id="invoiceResponse" class="api-response-content response-empty">';
  html += '      <div class="text-center text-muted py-5">';
  html += '        <i class="fas fa-play-circle fa-3x mb-3"></i>';
  html += '        <p>Send a request to see the response</p>';
  html += '      </div>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  $('#invoiceContainer').html(html);
  $('#invoiceSecurityKey').val(getApiKey());
}

// ============================================================================
// DATA COLLECTION & SUBMISSION
// ============================================================================

function collectFormData(operationKey) {
  var op = OPERATIONS[operationKey];
  if (!op) return {};

  var params = {};
  op.fieldGroups.forEach(function (group, groupIndex) {
    group.fields.forEach(function (field) {
      var fieldId = op.id + '-g' + groupIndex + '-' + field.name;
      var val = $('#' + $.escapeSelector(fieldId)).val();
      if (val === '' || val === undefined || val === null) return;
      if (typeof val === 'string') val = val.trim();
      if (val === '') return;
      params[field.name] = val;
    });
  });
  return params;
}

function validateRequired(operationKey, params) {
  var op = OPERATIONS[operationKey];
  if (!op) return null;

  var missing = [];
  op.fieldGroups.forEach(function (group) {
    group.fields.forEach(function (field) {
      if (field.required && !params[field.name]) {
        missing.push(field.label);
      }
    });
  });
  return missing.length ? missing : null;
}

function sendRequest(operationKey) {
  var op = OPERATIONS[operationKey];
  if (!op) return;

  var securityKey = ($('#invoiceSecurityKey').val() || '').trim();
  if (!securityKey) {
    showAlert('Please enter your Security Key before sending a request.', 'warning');
    $('#invoiceSecurityKey').focus();
    return;
  }
  setApiKey(securityKey);

  var params = collectFormData(operationKey);
  var missing = validateRequired(operationKey, params);
  if (missing) {
    showAlert('Missing required field(s): ' + missing.join(', '), 'warning');
    return;
  }

  params.invoicing = operationKey;
  params.security_key = securityKey;

  updateStatus('loading', 'Sending...');
  $('#invoiceResponse').removeClass('response-empty').html(
    '<div class="text-center py-5">' +
    '  <i class="fas fa-spinner fa-spin fa-3x mb-3" style="color: #60a5fa;"></i>' +
    '  <p>Contacting gateway...</p>' +
    '</div>'
  );

  $('.send-invoice-btn').prop('disabled', true)
    .html('<i class="fas fa-spinner fa-spin"></i> Sending...');

  $.ajax({
    url: PROXY_ENDPOINT,
    method: 'POST',
    data: params,
    success: function (data) {
      displayResponse(operationKey, data);
    },
    error: function (xhr) {
      displayError(xhr);
    },
    complete: function () {
      $('.send-invoice-btn').prop('disabled', false)
        .html('<i class="fas fa-paper-plane"></i> Send Request');
    }
  });
}

// ============================================================================
// RESPONSE DISPLAY
// ============================================================================

function displayResponse(operationKey, rawBody) {
  var $resp = $('#invoiceResponse');
  $resp.removeClass('response-empty');

  var pairs = parseFormUrlEncoded(typeof rawBody === 'string' ? rawBody : '');
  var responseField = pairs.response || '';
  var responseCode = parseInt(pairs.response_code || '0', 10);
  var responseText = pairs.responsetext || pairs.response_text || '';
  var invoiceId = pairs.invoice_id || '';

  if (invoiceId && (operationKey === 'add_invoice' || operationKey === 'update_invoice')) {
    rememberInvoiceId(invoiceId);
  }

  var bannerClass = 'error';
  var bannerIcon = 'exclamation-triangle';
  var bannerLabel = 'Error';

  if (responseField === '1' || (responseCode >= 100 && responseCode < 200)) {
    bannerClass = 'approved';
    bannerIcon = 'check-circle';
    bannerLabel = 'Success';
    updateStatus('success', '200 OK');
  } else if (responseField === '2') {
    bannerClass = 'declined';
    bannerIcon = 'times-circle';
    bannerLabel = 'Declined';
    updateStatus('error', 'Declined');
  } else {
    updateStatus('error', responseField ? 'Failed' : 'Empty Response');
  }

  var html = '';
  html += '<div class="response-banner ' + bannerClass + '">';
  html += '  <i class="fas fa-' + bannerIcon + '"></i>';
  html += '  <span><strong>' + bannerLabel + '</strong>' + (responseText ? ' &mdash; ' + escapeHtml(responseText) : '') + '</span>';
  html += '</div>';

  if (invoiceId) {
    html += '<div class="mb-3">';
    html += '  <span class="text-muted me-2" style="font-size: 0.85rem;">Invoice ID:</span>';
    html += '  <span class="invoice-id-display copy-invoice-id" data-id="' + escapeHtml(invoiceId) + '">' + escapeHtml(invoiceId) + ' <i class="fas fa-copy ms-1 fa-xs"></i></span>';
    html += '</div>';
  }

  var keys = Object.keys(pairs);
  if (keys.length) {
    var lines = keys.map(function (k) {
      var v = pairs[k];
      var valueClass = '';
      if (k === 'response' && v === '1') valueClass = 'value-success';
      else if (k === 'response' && v !== '1' && v !== '') valueClass = 'value-error';
      var valSpan = valueClass
        ? '<span class="' + valueClass + '">' + escapeHtml(v) + '</span>'
        : escapeHtml(v);
      return '<span class="key">' + escapeHtml(k) + '</span>: ' + valSpan;
    });
    html += '<div class="response-kv"><pre style="margin:0; white-space: pre-wrap;">' + lines.join('\n') + '</pre></div>';
  } else {
    html += '<div class="text-muted">Empty response from gateway.</div>';
  }

  $resp.html(html);
}

function displayError(xhr) {
  var $resp = $('#invoiceResponse');
  $resp.removeClass('response-empty');

  var msg = xhr.responseText || xhr.statusText || 'Unknown error';
  var status = xhr.status || 0;

  updateStatus('error', status + ' Error');

  var html = '';
  html += '<div class="response-banner error">';
  html += '  <i class="fas fa-exclamation-triangle"></i>';
  html += '  <span><strong>Request Failed</strong> &mdash; ' + escapeHtml(msg) + '</span>';
  html += '</div>';
  html += '<div class="response-kv"><pre style="margin:0; white-space: pre-wrap;">' + escapeHtml(msg) + '</pre></div>';

  $resp.html(html);
}

function updateStatus(type, message) {
  var $status = $('#invoiceStatus');
  $status.removeClass('success error loading').addClass(type).text(message || '');
}

// ============================================================================
// FORM UTILITIES
// ============================================================================

function loadSample(operationKey) {
  var op = OPERATIONS[operationKey];
  if (!op || !op.sample) return;

  // Fill sample values
  Object.keys(op.sample).forEach(function (name) {
    op.fieldGroups.forEach(function (group, groupIndex) {
      group.fields.forEach(function (field) {
        if (field.name === name) {
          var fieldId = op.id + '-g' + groupIndex + '-' + field.name;
          $('#' + $.escapeSelector(fieldId)).val(op.sample[name]);
        }
      });
    });
  });

  // For non-create ops, also populate the last-known invoice_id when available
  if (operationKey !== 'add_invoice') {
    var lastId = getLastInvoiceId();
    if (lastId) {
      op.fieldGroups.forEach(function (group, groupIndex) {
        group.fields.forEach(function (field) {
          if (field.name === 'invoice_id') {
            var fieldId = op.id + '-g' + groupIndex + '-' + field.name;
            if (!$('#' + $.escapeSelector(fieldId)).val()) {
              $('#' + $.escapeSelector(fieldId)).val(lastId);
            }
          }
        });
      });
    }
  }

  showAlert('Sample data loaded. Edit as needed before sending.', 'info');
}

function clearForm() {
  $('#invoiceContainer .invoice-field').val('');
  $('#invoiceResponse').addClass('response-empty').html(
    '<div class="text-center text-muted py-5">' +
    '  <i class="fas fa-play-circle fa-3x mb-3"></i>' +
    '  <p>Send a request to see the response</p>' +
    '</div>'
  );
  updateStatus('', '');
}

function copyResponse() {
  var text = $('#invoiceResponse').text();
  if (!text || !text.trim()) {
    showAlert('No response to copy.', 'info');
    return;
  }
  navigator.clipboard.writeText(text.trim()).then(function () {
    var $btn = $('.copy-invoice-response-btn');
    var orig = $btn.html();
    $btn.html('<i class="fas fa-check"></i> Copied!');
    setTimeout(function () { $btn.html(orig); }, 1500);
  });
}

function copyInvoiceId(id) {
  if (!id) return;
  navigator.clipboard.writeText(id).then(function () {
    showAlert('Invoice ID copied to clipboard.', 'success');
  });
}

function useLastInvoiceId(operationKey, id) {
  var op = OPERATIONS[operationKey];
  if (!op) return;
  op.fieldGroups.forEach(function (group, groupIndex) {
    group.fields.forEach(function (field) {
      if (field.name === 'invoice_id') {
        var fieldId = op.id + '-g' + groupIndex + '-' + field.name;
        $('#' + $.escapeSelector(fieldId)).val(id);
      }
    });
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

$(document).ready(function () {
  renderOperation('add_invoice');

  $('.menu-item').on('click', function () {
    var op = $(this).data('operation');
    if (!op) return;
    $('.menu-item').removeClass('active');
    $(this).addClass('active');
    renderOperation(op);
  });

  $(document).on('click', '.field-group-header', function () {
    var targetId = $(this).data('group');
    $(this).toggleClass('collapsed');
    $('#' + $.escapeSelector(targetId)).toggleClass('collapsed');
  });

  $(document).on('click', '.send-invoice-btn', function () {
    sendRequest($(this).data('operation'));
  });

  $(document).on('click', '.clear-invoice-btn', function () {
    clearForm();
  });

  $(document).on('click', '.sample-invoice-btn', function () {
    loadSample($(this).data('operation'));
  });

  $(document).on('click', '.use-last-id-btn', function () {
    useLastInvoiceId($(this).data('operation'), $(this).data('invoice-id'));
  });

  $(document).on('click', '.copy-invoice-response-btn', function () {
    copyResponse();
  });

  $(document).on('click', '.copy-invoice-id', function () {
    copyInvoiceId($(this).data('id'));
  });
});
