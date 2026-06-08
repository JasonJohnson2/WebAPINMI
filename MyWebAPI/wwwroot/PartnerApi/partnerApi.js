// NMI V4 API Integration JavaScript

const ENV_CONFIG = {
  sandbox: {
    baseUrl: "https://sandbox.nmi.com",
    apiKey: "v4_secret_56rDaH4sx6Xr2xwFvXy2g3gMm5rVuD97",
    label: "sandbox",
  },
  secure: {
    baseUrl: "https://secure.nmi.com",
    apiKey: "v4_secret_yuW6u6248z55s634x4aSC5m6j2D858F7",
    label: "secure",
  },
};

let currentEnv = "sandbox";

function getBaseUrl() {
  return ENV_CONFIG[currentEnv].baseUrl;
}

$(document).ready(function () {
  // Initialize the page
  initializePartnerApi();

  // Set up event listeners
  setupEventListeners();

  // Set default date range (last 30 days)
  setDefaultDateRange();
});

/**
 * Initialize the Partner API interface
 */
function initializePartnerApi() {
  console.log("Initializing NMI V4 API Partner Interface...");

  // Test backend controller connection
  testControllerConnection()
    .then(() => {
      console.log("✅ Backend controller connection successful");
    })
    .catch((error) => {
      console.warn("⚠️ Backend controller connection failed:", error);
      showAlert(
        "Warning: Backend controller connection failed. API requests may not work properly.",
        "warning"
      );
    });

  // Load saved API key if exists
  loadSavedApiKey();

  // Set up sidebar navigation
  setupSidebarNavigation();
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // Prevent ALL form submissions by default as a safety net
  $(document).on("submit", "form", function(e) {
    e.preventDefault();
    console.log("Form submission prevented for:", this.id);
  });

  // Form submissions - using event delegation for robustness
  $(document).on("submit", "#transactionDataForm", handleTransactionQuery);
  $(document).on("submit", "#cardTypeLookupForm", handleCardTypeLookup);
  $(document).on("submit", "#createMerchantForm", handleCreateMerchant);
  $(document).on("submit", "#updateMerchantForm", handleUpdateMerchant);
  $(document).on("submit", "#getAgreementTextForm", handleGetAgreementText);
  $(document).on("submit", "#getMerchantListForm", handleGetMerchantList);
  $(document).on("submit", "#getMerchantInfoForm", handleGetMerchantInfo);
  $(document).on("submit", "#getApplePayForm", handleGetApplePay);
  $(document).on("submit", "#getSecurityKeysForm", handleGetSecurityKeys);
  $(document).on("submit", "#addSecurityKeyForm", handleAddSecurityKey);
  $(document).on("submit", "#getProcessorReportForm", handleGetProcessorReport);
  $(document).on("submit", "#addProcessorForm", handleAddProcessor);
  $(document).on("submit", "#updateProcessorForm", handleUpdateProcessor);
  $(document).on("submit", "#getProcessorConfigForm", handleGetProcessorConfig);
  $(document).on("submit", "#getAvailableServicesForm", handleGetAvailableServices);
  $(document).on("submit", "#getUserInfoForm", handleGetUserInfo);
  $(document).on("submit", "#txt2payForm", handleTxt2pay);
  $(document).on("submit", "#getProductsForm", handleGetProducts);

  // Clear form button
  $("#clearForm").on("click", clearForm);

  // Fill sample data button
  $("#fillSampleData").on("click", fillSampleData);

  // Debug request button
  $("#debugRequest").on("click", debugRequest);

  // API key input - save on change
  $("#apiKey").on("change", saveApiKey);

  // Apply API key button
  $("#applyApiKey").on("click", handleApplyApiKey);

  // Allow Enter key in the API key field to apply
  $("#apiKey").on("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApplyApiKey();
    }
  });

  // Toggle API key visibility
  $("#toggleApiKeyVisibility").on("click", toggleApiKeyVisibility);

  // Toggle API config card collapse
  $("#toggleApiConfig").on("click", toggleApiConfigPanel);

  // Sidebar menu item clicks
  $(".menu-item").on("click", handleMenuItemClick);

  // Environment toggle
  $("#envToggle").on("change", handleEnvToggle);
  
  console.log("✅ All event listeners set up successfully");
}

/**
 * Set up sidebar navigation functionality
 */
function setupSidebarNavigation() {
  $(".menu-item").on("click", function () {
    const endpointId = $(this).data("endpoint");

    // Don't switch if it's coming soon
    if ($(this).find(".coming-soon").length > 0) {
      showComingSoonAlert();
      return;
    }

    // Update active menu item
    $(".menu-item").removeClass("active");
    $(this).addClass("active");

    // Show corresponding content
    $(".endpoint-content").removeClass("active");
    $(`#${endpointId}`).addClass("active");
  });
}

/**
 * Handle menu item clicks
 */
function handleMenuItemClick() {
  const endpointId = $(this).data("endpoint");

  if ($(this).find(".coming-soon").length > 0) {
    showComingSoonAlert();
    return;
  }

  // Update active states
  $(".menu-item").removeClass("active");
  $(this).addClass("active");

  $(".endpoint-content").removeClass("active");
  $(`#${endpointId}`).addClass("active");
}

/**
 * Handle the Apply button for the API key input
 */
function handleApplyApiKey() {
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter a V4 API key.", "warning");
    $("#apiKey").focus();
    return;
  }

  saveApiKey();

  const isSandboxDefault = apiKey === ENV_CONFIG.sandbox.apiKey;
  const isSecureDefault = apiKey === ENV_CONFIG.secure.apiKey;

  if (isSandboxDefault) {
    $("#apiKeyStatus")
      .removeClass("bg-secondary bg-success bg-info")
      .addClass("bg-info")
      .text("Sandbox default");
  } else if (isSecureDefault) {
    $("#apiKeyStatus")
      .removeClass("bg-secondary bg-success bg-info")
      .addClass("bg-info")
      .text("Secure default");
  } else {
    $("#apiKeyStatus")
      .removeClass("bg-secondary bg-info")
      .addClass("bg-success")
      .text("Custom key applied");
  }

  showAlert("API key updated and saved.", "success");
}

/**
 * Toggle the API key field between password and text
 */
function toggleApiKeyVisibility() {
  const $input = $("#apiKey");
  const $icon = $("#toggleApiKeyVisibility i");

  if ($input.attr("type") === "password") {
    $input.attr("type", "text");
    $icon.removeClass("fa-eye").addClass("fa-eye-slash");
  } else {
    $input.attr("type", "password");
    $icon.removeClass("fa-eye-slash").addClass("fa-eye");
  }
}

/**
 * Collapse/expand the API config panel
 */
function toggleApiConfigPanel() {
  const $body = $("#apiConfigBody");
  const $icon = $("#toggleApiConfig i");

  $body.slideToggle(200, function () {
    if ($body.is(":visible")) {
      $icon.removeClass("fa-chevron-down").addClass("fa-chevron-up");
    } else {
      $icon.removeClass("fa-chevron-up").addClass("fa-chevron-down");
    }
  });
}

/**
 * Handle environment toggle between sandbox and secure
 */
function handleEnvToggle() {
  const isSecure = $(this).is(":checked");
  currentEnv = isSecure ? "secure" : "sandbox";

  const config = ENV_CONFIG[currentEnv];

  // Update label
  const $label = $("#envLabel");
  $label
    .text(config.label)
    .removeClass("env-sandbox env-secure")
    .addClass(isSecure ? "env-secure" : "env-sandbox");

  // Swap API key
  $("#apiKey").val(config.apiKey);
  saveApiKey();

  // Update key status badge
  $("#apiKeyStatus")
    .removeClass("bg-secondary bg-success bg-info")
    .addClass("bg-info")
    .text(isSecure ? "Secure default" : "Sandbox default");

  // Update all endpoint URLs displayed in the page
  updateEndpointUrls();

  showAlert(
    `Switched to <strong>${config.baseUrl}</strong>`,
    isSecure ? "success" : "info"
  );
}

/**
 * Rewrite every visible endpoint URL to reflect the current environment
 */
function updateEndpointUrls() {
  const oldHost = currentEnv === "secure" ? "sandbox.nmi.com" : "secure.nmi.com";
  const newHost = currentEnv === "secure" ? "secure.nmi.com" : "sandbox.nmi.com";

  $(".endpoint-url").each(function () {
    $(this).text($(this).text().replace(oldHost, newHost));
  });

  // Also update the readonly endpoint input on the transaction data page
  const $epInput = $("#apiEndpoint");
  if ($epInput.length) {
    $epInput.val($epInput.val().replace(oldHost, newHost));
  }
}

/**
 * Show coming soon alert
 */
function showComingSoonAlert() {
  const alertHtml = `
        <div class="alert alert-info alert-dismissible fade show" role="alert">
            <i class="fas fa-info-circle me-2"></i>
            This endpoint is coming soon! We're working on adding more NMI V4 API endpoints.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

  // Insert alert at the top of the main content area
  $(".col-md-9.col-lg-10").prepend(alertHtml);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    $(".alert").fadeOut();
  }, 5000);
}

/**
 * Set default date range (last 30 days)
 */
function setDefaultDateRange() {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // Format dates for datetime-local input
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  $("#startDate").val(formatDate(thirtyDaysAgo));
  $("#endDate").val(formatDate(now));
}

/**
 * Handle transaction query form submission
 */
function handleTransactionQuery(e) {
  e.preventDefault();

  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    $("#apiKey").focus();
    return;
  }

  // Show loading state
  showLoadingState(true);
  updateResponseStatus("loading", "Making API Request...");

  // Collect form data
  const requestData = collectFormData();
  requestData.baseUrl = getBaseUrl();

  // Make API request
  makeApiRequest(requestData)
    .then((response) => {
      showLoadingState(false);
      displayResponse(response, "success");
      updateResponseStatus("success", `Request completed successfully`);
    })
    .catch((error) => {
      showLoadingState(false);
      displayResponse(error, "error");
      updateResponseStatus("error", "Request failed");
      console.error("API Request failed:", error);
    });
}

/**
 * Collect form data for API request
 */
function collectFormData() {
  const data = {};

  // Add API key
  data.api_key = $("#apiKey").val().trim();

  // Add optional parameters if they have values
  const transactionId = $("#transactionId").val().trim();
  if (transactionId) data.transaction_id = transactionId;

  const merchantId = $("#merchantId").val().trim();
  if (merchantId) data.merchant_id = merchantId;

  const startDate = $("#startDate").val();
  if (startDate) data.start_date = new Date(startDate).toISOString();

  const endDate = $("#endDate").val();
  if (endDate) data.end_date = new Date(endDate).toISOString();

  const status = $("#transactionStatus").val();
  if (status) data.transaction_status = status;

  const minAmount = $("#minAmount").val();
  if (minAmount) data.min_amount = parseFloat(minAmount);

  const maxAmount = $("#maxAmount").val();
  if (maxAmount) data.max_amount = parseFloat(maxAmount);

  return data;
}

/**
 * Make API request to NMI V4 API through our backend controller
 */
function makeApiRequest(requestData) {
  return new Promise((resolve, reject) => {
    // Call our backend PartnerController which will proxy to NMI V4 API
    $.ajax({
      url: "/api/partner/transaction-data",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(requestData),
      success: function (response) {
        if (response.success) {
          // Process the response data
          const processedResponse = handleApiResponse(response.data);
          resolve(processedResponse);
        } else {
          reject({
            error: "API Request Failed",
            message: response.message || response.error,
            statusCode: response.statusCode,
            details: response,
          });
        }
      },
      error: function (xhr, status, error) {
        let errorMessage = "Network error occurred";
        let errorDetails = error;

        try {
          const errorResponse = JSON.parse(xhr.responseText);
          errorMessage =
            errorResponse.message || errorResponse.error || errorMessage;
          errorDetails = errorResponse;
        } catch (e) {
          // If response is not JSON, use the raw response text
          errorDetails = xhr.responseText || error;
        }

        reject({
          error: "Network Error",
          message: errorMessage,
          statusCode: xhr.status,
          details: errorDetails,
        });
      },
    });
  });
}

/**
 * Test connection to our backend controller
 */
function testControllerConnection() {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "/api/partner/health",
      method: "GET",
      success: function (response) {
        console.log("Controller health check:", response);
        resolve(response);
      },
      error: function (xhr, status, error) {
        console.error("Controller health check failed:", error);
        reject(error);
      },
    });
  });
}

/**
 * Handle different types of API responses
 */
function handleApiResponse(response) {
  // If the response is a string (like query string format), try to parse it
  if (typeof response === "string") {
    try {
      // Try to parse as query string first (NMI sometimes returns this format)
      const queryParams = new URLSearchParams(response);
      const parsedResponse = {};
      for (const [key, value] of queryParams) {
        parsedResponse[key] = value;
      }

      // If we got some data, return it formatted
      if (Object.keys(parsedResponse).length > 0) {
        return {
          status: "success",
          format: "query_string",
          timestamp: new Date().toISOString(),
          data: parsedResponse,
          raw_response: response,
        };
      }
    } catch (e) {
      // If query string parsing fails, return as raw string
      console.warn("Failed to parse response as query string:", e);
    }

    // Return as raw string response
    return {
      status: "success",
      format: "raw_string",
      timestamp: new Date().toISOString(),
      data: response,
      message: "Response received as raw string",
    };
  }

  // If it's already an object, return it as-is
  return response;
}

/**
 * Display API response in the response section
 */
function displayResponse(data, type) {
  const responseContent = $("#responseContent");

  if (type === "success") {
    responseContent.removeClass("response-empty");
    responseContent.html(
      `<pre>${syntaxHighlightJson(JSON.stringify(data, null, 2))}</pre>`
    );
  } else if (type === "error") {
    responseContent.removeClass("response-empty");
    responseContent.html(
      `<pre class="text-danger">${JSON.stringify(data, null, 2)}</pre>`
    );
  }
}

/**
 * Add syntax highlighting to JSON
 */
function syntaxHighlightJson(json) {
  json = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      let cls = "json-number";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "json-key";
        } else {
          cls = "json-string";
        }
      } else if (/true|false/.test(match)) {
        cls = "json-boolean";
      } else if (/null/.test(match)) {
        cls = "json-null";
      }
      return '<span class="' + cls + '">' + match + "</span>";
    }
  );
}

/**
 * Update response status indicator
 */
function updateResponseStatus(type, message) {
  const statusEl = $("#responseStatus");
  statusEl.removeClass("success error loading");
  statusEl.addClass(type);
  statusEl.text(message);
}

/**
 * Show/hide loading state
 */
function showLoadingState(loading) {
  const spinner = $("#loadingSpinner");
  const submitBtn = $('#transactionDataForm button[type="submit"]');

  if (loading) {
    spinner.show();
    submitBtn.prop("disabled", true);
    submitBtn.html('<i class="fas fa-spinner fa-spin"></i> Querying...');
    $("body").addClass("loading");
  } else {
    spinner.hide();
    submitBtn.prop("disabled", false);
    submitBtn.html('<i class="fas fa-search"></i> Query Transactions');
    $("body").removeClass("loading");
  }
}

/**
 * Clear the form
 */
function clearForm() {
  $("#transactionDataForm")[0].reset();
  $("#responseContent").addClass("response-empty").html(`
        <div class="text-center text-muted py-5">
            <i class="fas fa-play-circle fa-3x mb-3"></i>
            <p>Click "Query Transactions" to see the API response</p>
        </div>
    `);
  updateResponseStatus("", "");
  setDefaultDateRange();
}

/**
 * Fill form with sample data for testing
 */
function fillSampleData() {
  $("#merchantId").val("test_merchant_123");
  $("#transactionStatus").val("complete");
  $("#minAmount").val("10.00");
  $("#maxAmount").val("1000.00");

  showAlert(
    'Sample data filled. Make sure to enter your test API key, then click "Query Transactions" to test the API.',
    "info"
  );
}

/**
 * Debug request - show what would be sent to NMI API
 */
function debugRequest() {
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert(
      "Please enter your API key first to debug the request.",
      "warning"
    );
    $("#apiKey").focus();
    return;
  }

  // Collect form data
  const requestData = collectFormData();
  requestData.baseUrl = getBaseUrl();

  // Show loading state
  updateResponseStatus("loading", "Debugging request structure...");

  // Call debug endpoint
  $.ajax({
    url: "/api/partner/debug-request",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(requestData),
    success: function (response) {
      if (response.success) {
        displayResponse(response, "success");
        updateResponseStatus(
          "success",
          "Debug completed - showing request structure"
        );
        showAlert(
          "Debug completed! Check the response to see exactly what will be sent to NMI V4 API.",
          "info"
        );
      } else {
        displayResponse(response, "error");
        updateResponseStatus("error", "Debug failed");
      }
    },
    error: function (xhr, status, error) {
      let errorMessage = "Debug request failed";
      try {
        const errorResponse = JSON.parse(xhr.responseText);
        errorMessage =
          errorResponse.message || errorResponse.error || errorMessage;
      } catch (e) {
        errorMessage = xhr.responseText || error;
      }

      displayResponse(
        {
          error: "Debug Error",
          message: errorMessage,
          statusCode: xhr.status,
        },
        "error"
      );
      updateResponseStatus("error", "Debug failed");
    },
  });
}

/**
 * Save API key to localStorage
 */
function saveApiKey() {
  const apiKey = $("#apiKey").val().trim();
  if (apiKey) {
    localStorage.setItem("nmi_api_key", apiKey);
  }
}

/**
 * Load saved API key from localStorage
 */
function loadSavedApiKey() {
  const savedKey = localStorage.getItem("nmi_api_key");
  if (savedKey) {
    $("#apiKey").val(savedKey);
  }

  const currentKey = $("#apiKey").val().trim();
  if (currentKey === ENV_CONFIG.sandbox.apiKey) {
    $("#apiKeyStatus")
      .removeClass("bg-secondary bg-success bg-info")
      .addClass("bg-info")
      .text("Sandbox default");
  } else if (currentKey === ENV_CONFIG.secure.apiKey) {
    $("#apiKeyStatus")
      .removeClass("bg-secondary bg-success bg-info")
      .addClass("bg-info")
      .text("Secure default");
  } else if (currentKey) {
    $("#apiKeyStatus")
      .removeClass("bg-secondary bg-info")
      .addClass("bg-success")
      .text("Custom key");
  }
}

/**
 * Show alert message
 */
function showAlert(message, type = "info") {
  const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas fa-${getAlertIcon(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

  $(".col-md-9.col-lg-10").prepend(alertHtml);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    $(".alert").fadeOut();
  }, 5000);
}

/**
 * Get appropriate icon for alert type
 */
function getAlertIcon(type) {
  const icons = {
    info: "info-circle",
    success: "check-circle",
    warning: "exclamation-triangle",
    danger: "exclamation-circle",
  };
  return icons[type] || "info-circle";
}

// ============================================================================
// ENDPOINT HANDLERS
// ============================================================================

/**
 * Handle Card Type Lookup form submission
 */
function handleCardTypeLookup(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const ccnumber = $("#ccnumber").val().trim();
  if (!ccnumber) {
    showAlert("Please enter a card number (BIN).", "warning");
    return;
  }

  makeGenericApiRequest(
    {
      endpoint: "card-type-lookup",
      method: "GET",
      data: { ccnumber: ccnumber },
    },
    "cardTypeLookupResponse",
    "cardTypeLookupStatus"
  );
}

/**
 * Handle Create Merchant form submission
 */
function handleCreateMerchant(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const data = {
    type: $("#merchant_type").val(),
    company: $("#merchant_company").val().trim(),
    country: $("#merchant_country").val().trim(),
    address1: $("#merchant_address1").val().trim(),
    city: $("#merchant_city").val().trim(),
    state: $("#merchant_state").val().trim(),
    zip: $("#merchant_zip").val().trim(),
    timezone: $("#merchant_timezone").val(),
    firstName: $("#merchant_firstName").val().trim(),
    lastName: $("#merchant_lastName").val().trim(),
    email: $("#merchant_email").val().trim(),
    phone: $("#merchant_phone").val().trim(),
    language: $("#merchant_language").val(),
    username: $("#merchant_username").val().trim(),
    accountInfo: {
      checkAccount: $("#merchant_checkAccount").val().trim(),
      checkAba: $("#merchant_checkAba").val().trim(),
      accountHolderType: $("#merchant_accountHolderType").val(),
      accountType: $("#merchant_accountType").val(),
    },
  };

  const address2 = $("#merchant_address2").val().trim();
  if (address2) data.address2 = address2;

  const url = $("#merchant_url").val().trim();
  if (url) data.url = url;

  const fax = $("#merchant_fax").val().trim();
  if (fax) data.fax = fax;

  const externalIdentifier = $("#merchant_externalIdentifier").val().trim();
  if (externalIdentifier) data.externalIdentifier = externalIdentifier;

  const parentAffiliateId = $("#merchant_parentAffiliateId").val().trim();
  if (parentAffiliateId) data.parentAffiliateId = parentAffiliateId;

  makeGenericApiRequest(
    {
      endpoint: "create-merchant",
      method: "POST",
      data: data,
    },
    "createMerchantResponse",
    "createMerchantStatus"
  );
}

/**
 * Toggle visibility of an Update Merchant section
 */
function toggleUpdateSection(section, enabled) {
  const el = $(`#section_${section}`);
  if (enabled) {
    el.slideDown(200).find("input, select").prop("disabled", false);
  } else {
    el.slideUp(200).find("input, select").prop("disabled", true);
  }
}

/**
 * Handle Update Merchant form submission (PATCH /merchants/{gateway_id})
 * Only includes fields from enabled sections.
 */
function handleUpdateMerchant(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const gatewayId = $("#updatemerchant_gatewayId").val().trim();
  if (!gatewayId) {
    showAlert("Please enter the Gateway / Merchant ID.", "warning");
    return;
  }

  const feeEnabled = $("#toggle_feeSchedule").is(":checked");
  const welcomeEnabled = $("#toggle_welcomeEmail").is(":checked");
  const tosEnabled = $("#toggle_agreeTos").is(":checked");

  if (!feeEnabled && !welcomeEnabled && !tosEnabled) {
    showAlert("Please enable at least one section to include in the request.", "warning");
    return;
  }

  const data = { gatewayId: gatewayId };

  if (feeEnabled) {
    const costPlan = $("#updatemerchant_costPlan").val().trim();
    if (costPlan) data.costPlan = costPlan;
  }

  if (welcomeEnabled) {
    data.status = $("#updatemerchant_status").val();
  }

  if (tosEnabled) {
    const agreementTextId = $("#updatemerchant_agreementTextId").val().trim();
    if (agreementTextId) data.agreementTextId = agreementTextId;

    const activateVal = $("#updatemerchant_activatePendingServices").val();
    if (activateVal) {
      data.activatePendingServices = activateVal === "true";
    }
  }

  makeGenericApiRequest(
    {
      endpoint: "update-merchant",
      method: "PATCH",
      data: data,
    },
    "updateMerchantResponse",
    "updateMerchantStatus"
  );
}

/**
 * Fill sample Update Merchant data
 */
function fillSampleUpdateMerchantData() {
  $("#toggle_feeSchedule").prop("checked", true).trigger("change");
  $("#toggle_welcomeEmail").prop("checked", true).trigger("change");
  $("#toggle_agreeTos").prop("checked", true).trigger("change");

  $("#updatemerchant_gatewayId").val("1150937");
  $("#updatemerchant_costPlan").val("25730");
  $("#updatemerchant_status").val("active");
  $("#updatemerchant_agreementTextId").val("11");
  $("#updatemerchant_activatePendingServices").val("true");

  showAlert("Sample update merchant data filled.", "info");
}

/**
 * Handle Get Agreement Text form submission (GET /merchants/{id}/agreement_text)
 */
function handleGetAgreementText(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const merchantId = $("#agreement_merchantId").val().trim();
  if (!merchantId) {
    showAlert("Please enter a Merchant ID.", "warning");
    return;
  }

  makeGenericApiRequest(
    {
      endpoint: "get-agreement-text",
      method: "GET",
      data: { merchantId: merchantId },
    },
    "getAgreementTextResponse",
    "getAgreementTextStatus"
  );
}

/**
 * Handle Get Merchant List form submission
 */
function handleGetMerchantList(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const data = {
    maxResults: parseInt($("#merchant_maxResults").val()) || 10,
  };

  makeGenericApiRequest(
    {
      endpoint: "get-merchant-list",
      method: "POST",
      data: data,
    },
    "getMerchantListResponse",
    "getMerchantListStatus"
  );
}

/**
 * Handle Get Merchant Info form submission
 */
function handleGetMerchantInfo(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const merchantId = $("#merchant_merchantId").val().trim();
  if (!merchantId) {
    showAlert("Please enter a merchant ID.", "warning");
    return;
  }

  makeGenericApiRequest(
    {
      endpoint: "get-merchant-info",
      method: "GET",
      data: { merchantId: merchantId },
    },
    "getMerchantInfoResponse",
    "getMerchantInfoStatus"
  );
}

/**
 * Handle Get Apple Pay form submission (GET /merchants/{gatewayId}/apple_pay)
 */
function handleGetApplePay(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const gatewayId = $("#applepay_gatewayId").val().trim();
  if (!gatewayId) {
    showAlert("Please enter a Gateway ID.", "warning");
    return;
  }

  makeGenericApiRequest(
    {
      endpoint: "get-apple-pay",
      method: "GET",
      data: { gatewayId: gatewayId },
    },
    "getApplePayResponse",
    "getApplePayStatus"
  );
}

/**
 * Handle Get Security Keys form submission
 */
function handleGetSecurityKeys(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const gatewayId = $("#security_gatewayId").val().trim();
  if (!gatewayId) {
    showAlert("Please enter a gateway ID.", "warning");
    return;
  }

  makeGenericApiRequest(
    {
      endpoint: "get-security-keys",
      method: "GET",
      data: { gatewayId: gatewayId },
    },
    "getSecurityKeysResponse",
    "getSecurityKeysStatus"
  );
}

/**
 * Handle Add Security Key form submission
 */
function handleAddSecurityKey(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const merchantId = $("#securitykey_merchantId").val().trim();
  const description = $("#securitykey_description").val().trim();
  if (!merchantId || !description) {
    showAlert("Please fill in all required fields.", "warning");
    return;
  }

  const permissions = $("#securitykey_permissions").val() || ["transaction"];

  const data = {
    merchantId: merchantId,
    description: description,
    permissions: permissions,
  };

  makeGenericApiRequest(
    {
      endpoint: "add-security-key",
      method: "POST",
      data: data,
    },
    "addSecurityKeyResponse",
    "addSecurityKeyStatus"
  );
}

/**
 * Handle Get Processor Report form submission
 */
function handleGetProcessorReport(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const maxResults = parseInt($("#processor_maxResults").val()) || 10;
  const merchantIdsStr = $("#processor_merchantIds").val().trim();
  
  const data = {
    maxResults: maxResults,
  };

  if (merchantIdsStr) {
    data.merchantIds = merchantIdsStr.split(",").map((id) => id.trim());
  }

  makeGenericApiRequest(
    {
      endpoint: "get-processor-report",
      method: "POST",
      data: data,
    },
    "getProcessorReportResponse",
    "getProcessorReportStatus"
  );
}

/**
 * Handle Add Processor form submission
 */
function handleAddProcessor(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const merchantId = $("#addproc_merchantId").val().trim();
  const processorName = $("#addproc_processorName").val().trim();
  const serviceId = $("#addproc_serviceId").val().trim();

  if (!merchantId || !processorName || !serviceId) {
    showAlert("Please fill in all required fields.", "warning");
    return;
  }

  const data = {
    merchantId: merchantId,
    processorName: processorName,
    serviceId: serviceId,
    mcc: $("#addproc_mcc").val().trim() || "0742",
    currencies: ["USD"],
    accountClassification: "ecommerce",
    paymentTypes: ["amex", "visa", "mastercard", "diners", "discover"],
    maxMonthlyVolume: "0.00",
    duplicateTime: "1200",
    processorFields: {},
  };

  makeGenericApiRequest(
    {
      endpoint: "add-processor",
      method: "POST",
      data: data,
    },
    "addProcessorResponse",
    "addProcessorStatus"
  );
}

/**
 * Handle Update Processor form submission
 */
function handleUpdateProcessor(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const processorId = $("#updateproc_processorId").val().trim();
  if (!processorId) {
    showAlert("Please enter a processor ID.", "warning");
    return;
  }

  const data = {
    processorId: processorId,
  };

  const status = $("#updateproc_status").val();
  if (status) data.status = status;

  const currenciesRaw = $("#updateproc_currencies").val().trim();
  if (currenciesRaw) {
    data.currencies = currenciesRaw
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
  }

  makeGenericApiRequest(
    {
      endpoint: "update-processor",
      method: "PATCH",
      data: data,
    },
    "updateProcessorResponse",
    "updateProcessorStatus"
  );
}

/**
 * Handle Get Processor Config form submission
 */
function handleGetProcessorConfig(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const serviceId = $("#procconfig_serviceId").val().trim();
  if (!serviceId) {
    showAlert("Please enter a service ID.", "warning");
    return;
  }

  makeGenericApiRequest(
    {
      endpoint: "get-processor-config",
      method: "GET",
      data: { serviceId: serviceId },
    },
    "getProcessorConfigResponse",
    "getProcessorConfigStatus"
  );
}

/**
 * Handle Get Available Services form submission
 */
function handleGetAvailableServices(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const maxResults = $("#services_maxResults").val() || "1000";

  makeGenericApiRequest(
    {
      endpoint: "get-available-services",
      method: "POST",
      data: { maxResults: String(maxResults) },
    },
    "getAvailableServicesResponse",
    "getAvailableServicesStatus"
  );
}

/**
 * Handle Get User Info form submission
 */
function handleGetUserInfo(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const merchantId = $("#user_merchantId").val().trim();
  if (!merchantId) {
    showAlert("Please enter a merchant ID.", "warning");
    return;
  }

  const data = {
    merchantId: merchantId,
    maxResults: parseInt($("#user_maxResults").val()) || 100,
  };

  makeGenericApiRequest(
    {
      endpoint: "get-user-info",
      method: "POST",
      data: data,
    },
    "getUserInfoResponse",
    "getUserInfoStatus"
  );
}

/**
 * Handle TXT2PAY form submission
 */
function handleTxt2pay(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  const merchantId = $("#txt2pay_merchantId").val().trim();
  const phone = $("#txt2pay_phone").val().trim();
  const amount = $("#txt2pay_amount").val().trim();

  if (!merchantId || !phone || !amount) {
    showAlert("Please fill in all required fields.", "warning");
    return;
  }

  const data = {
    merchantId: merchantId,
    phone: phone,
    amount: amount,
    firstName: $("#txt2pay_firstName").val().trim(),
    lastName: $("#txt2pay_lastName").val().trim(),
    expiration: $("#txt2pay_expiration").val().trim() || "7d",
    instructions: $("#txt2pay_instructions").val().trim(),
    topic: $("#txt2pay_topic").val().trim(),
  };

  makeGenericApiRequest(
    {
      endpoint: "txt2pay",
      method: "POST",
      data: data,
    },
    "txt2payResponse",
    "txt2payStatus"
  );
}

/**
 * Handle Get Products form submission
 */
function handleGetProducts(e) {
  e.preventDefault();
  const apiKey = $("#apiKey").val().trim();
  if (!apiKey) {
    showAlert("Please enter your API key before making a request.", "warning");
    return;
  }

  makeGenericApiRequest(
    {
      endpoint: "get-products",
      method: "GET",
      data: {},
    },
    "getProductsResponse",
    "getProductsStatus"
  );
}

/**
 * Generic API request handler for all endpoints
 */
function makeGenericApiRequest(config, responseElementId, statusElementId) {
  showLoadingStateForElement(responseElementId, statusElementId, true);

  const requestData = {
    api_key: $("#apiKey").val().trim(),
    endpoint: config.endpoint,
    method: config.method,
    data: config.data,
    baseUrl: getBaseUrl(),
  };

  $.ajax({
    url: "/api/partner/generic-request",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(requestData),
    success: function (response) {
      showLoadingStateForElement(responseElementId, statusElementId, false);
      if (response.success) {
        displayResponseInElement(
          response.data || response,
          "success",
          responseElementId
        );
        updateResponseStatusForElement(
          statusElementId,
          "success",
          "Request completed successfully"
        );
      } else {
        displayResponseInElement(response, "error", responseElementId);
        updateResponseStatusForElement(
          statusElementId,
          "error",
          "Request failed"
        );
      }
    },
    error: function (xhr, status, error) {
      showLoadingStateForElement(responseElementId, statusElementId, false);
      let errorMessage = "Network error occurred";
      let errorDetails = error;

      try {
        const errorResponse = JSON.parse(xhr.responseText);
        errorMessage =
          errorResponse.message || errorResponse.error || errorMessage;
        errorDetails = errorResponse;
      } catch (e) {
        errorDetails = xhr.responseText || error;
      }

      displayResponseInElement(
        {
          error: "Network Error",
          message: errorMessage,
          statusCode: xhr.status,
          details: errorDetails,
        },
        "error",
        responseElementId
      );
      updateResponseStatusForElement(statusElementId, "error", "Request failed");
    },
  });
}

/**
 * Display response in a specific element
 */
function displayResponseInElement(data, type, elementId) {
  const responseElement = $(`#${elementId}`);

  if (type === "success") {
    responseElement.removeClass("response-empty");
    responseElement.html(
      `<pre>${syntaxHighlightJson(JSON.stringify(data, null, 2))}</pre>`
    );
  } else if (type === "error") {
    responseElement.removeClass("response-empty");
    responseElement.html(
      `<pre class="text-danger">${JSON.stringify(data, null, 2)}</pre>`
    );
  }
}

/**
 * Update response status for a specific element
 */
function updateResponseStatusForElement(elementId, type, message) {
  const statusEl = $(`#${elementId}`);
  statusEl.removeClass("success error loading");
  statusEl.addClass(type);
  statusEl.text(message);
}

/**
 * Show/hide loading state for a specific element
 */
function showLoadingStateForElement(responseElementId, statusElementId, loading) {
  const responseEl = $(`#${responseElementId}`);
  const statusEl = $(`#${statusElementId}`);

  if (loading) {
    updateResponseStatusForElement(statusElementId, "loading", "Making API Request...");
    responseEl.html(
      `<div class="text-center text-muted py-5">
        <i class="fas fa-spinner fa-spin fa-3x mb-3"></i>
        <p>Processing request...</p>
      </div>`
    );
  }
}

/**
 * Clear a specific endpoint form
 */
function clearEndpointForm(formId) {
  $(`#${formId}`)[0].reset();
  const responseId = formId.replace("Form", "Response");
  const statusId = formId.replace("Form", "Status");
  
  $(`#${responseId}`).addClass("response-empty").html(`
    <div class="text-center text-muted py-5">
      <i class="fas fa-play-circle fa-3x mb-3"></i>
      <p>Submit the form to see the API response</p>
    </div>
  `);
  updateResponseStatusForElement(statusId, "", "");
}

/**
 * Fill sample merchant data
 */
function fillSampleMerchantData() {
  $("#merchant_firstName").val("Jason");
  $("#merchant_lastName").val("Test");
  $("#merchant_email").val("jason.test@example.com");
  $("#merchant_phone").val("555-555-5555");
  $("#merchant_company").val("ACME, Inc.");
  $("#merchant_type").val("test");
  $("#merchant_username").val("acme_test_user");
  $("#merchant_language").val("en_US");
  $("#merchant_timezone").val("America/Phoenix");
  $("#merchant_url").val("https://example.com");
  $("#merchant_address1").val("123 Test Street");
  $("#merchant_address2").val("Suite 100");
  $("#merchant_city").val("Phoenix");
  $("#merchant_state").val("AZ");
  $("#merchant_zip").val("85001");
  $("#merchant_country").val("US");
  $("#merchant_checkAccount").val("24413815");
  $("#merchant_checkAba").val("490000018");
  $("#merchant_accountHolderType").val("business");
  $("#merchant_accountType").val("checking");

  showAlert("Sample merchant data filled.", "info");
}

/**
 * Fill sample TXT2PAY data
 */
function fillSampleTxt2payData() {
  $("#txt2pay_merchantId").val("939992");
  $("#txt2pay_phone").val("5551234567");
  $("#txt2pay_amount").val("25.00");
  $("#txt2pay_firstName").val("John");
  $("#txt2pay_lastName").val("Doe");
  $("#txt2pay_expiration").val("7d");
  $("#txt2pay_topic").val("Payment Request");
  $("#txt2pay_instructions").val("Please complete your payment. Thank you!");

  showAlert("Sample TXT2PAY data filled.", "info");
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate UUID for request tracking
 */
function generateUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format currency for display
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Utility functions for potential future use
const PartnerApiUtils = {
  validateApiKey: function (apiKey) {
    // Add API key validation logic
    return apiKey && apiKey.length > 10;
  },

  formatTransactionData: function (transaction) {
    // Format transaction data for display
    return {
      ...transaction,
      amount: formatCurrency(transaction.amount),
      created_date: formatDate(transaction.created_date),
    };
  },

  exportToCSV: function (data) {
    // Export transaction data to CSV
    // Implementation would go here
    console.log("Export to CSV functionality would be implemented here");
  },
};
