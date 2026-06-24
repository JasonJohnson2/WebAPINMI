let _tokenResolve = null;

// Public tokenization keys for Collect.js and Gateway.js (3DS).
// NOT the merchant security_key — that one is used server-side by /api/payment
// to call transact.php and must stay out of client code.
const DEFAULT_KEYS = {
  sandbox: "Mm3Pt3-e6BCRA-329Frx-Ct5T9m",
  // TODO: replace with the tokenization key for the live/secure account.
  // The previous value here was a security_key, which Collect.js rejects.
  secure: "Mm3Pt3-e6BCRA-329Frx-Ct5T9m",
};

// NOTE: Callbacks are intentionally NOT declared here as data-*-callback
// string attributes. Collect.js runs those strings through eval(), which our
// CSP blocks (no 'unsafe-eval'). They are instead passed as real functions to
// CollectJS.configure() alongside blockEval:true — the PCI-compliant path per
// https://docs.nmi.com/docs/quick-start-tutorial
const COLLECT_STATIC_DATA_ATTRIBUTES = [
  ["data-variant", "inline"],
  ["data-field-ccnumber-title", "Card Number"],
  ["data-field-ccnumber-placeholder", "0000 0000 0000 0000"],
  ["data-field-ccnumber-enable-card-brand-previews", "true"],
  ["data-field-ccexp-title", "Expiration Date"],
  ["data-field-ccexp-placeholder", "00 / 00"],
  ["data-field-cvv-display", "required"],
  ["data-field-cvv-title", "CVV Code"],
  ["data-field-cvv-placeholder", "***"],
  ["data-field-checkaccount-selector", "#demoCheckaccount"],
  ["data-field-checkaccount-title", "Account Number"],
  ["data-field-checkaccount-placeholder", "Account Number"],
  ["data-field-checkaba-selector", "#demoCheckaba"],
  ["data-field-checkaba-title", "Routing Number"],
  ["data-field-checkaba-placeholder", "Routing Number"],
  ["data-field-checkname-selector", "#demoCheckname"],
  ["data-field-checkname-title", "Account Name"],
  ["data-field-checkname-placeholder", "Customer Name"],
  ["data-field-google-pay-selector", ".google-pay-button"],
  ["data-field-google-pay-shipping-address-required", "true"],
  [
    "data-field-google-pay-shipping-address-parameters-phone-number-required",
    "true",
  ],
  [
    "data-field-google-pay-shipping-address-parameters-allowed-country-codes",
    "US,CA",
  ],
  ["data-field-google-pay-billing-address-required", "true"],
  [
    "data-field-google-pay-billing-address-parameters-phone-number-required",
    "true",
  ],
  ["data-field-google-pay-billing-address-parameters-format", "MIN"],
  ["data-price", "50.00"],
  ["data-currency", "USD"],
  ["data-country", "US"],
  ["data-style-sniffer", "true"],
];

function getEnvName() {
  return $("#envToggle").is(":checked") ? "secure" : "sandbox";
}

function getBaseUrl() {
  return getEnvName() === "secure"
    ? "https://secure.nmi.com"
    : "https://sandbox.nmi.com";
}

function removeCollectScript() {
  const existing = document.getElementById("collect-js");
  if (existing) {
    existing.remove();
  }
  try {
    if (typeof CollectJS !== "undefined") {
      delete window.CollectJS;
    }
  } catch (_e) {
    /* ignore */
  }
}

function loadCollectScript(onLoaded) {
  removeCollectScript();
  const script = document.createElement("script");
  script.id = "collect-js";
  script.async = true;
  script.src = getBaseUrl() + "/token/Collect.js";
  script.setAttribute(
    "data-tokenization-key",
    DEFAULT_KEYS[getEnvName()] || ""
  );
  COLLECT_STATIC_DATA_ATTRIBUTES.forEach(function (pair) {
    script.setAttribute(pair[0], pair[1]);
  });
  script.onload = function () {
    if (typeof onLoaded === "function") {
      onLoaded();
    }
  };
  script.onerror = function () {
    console.error("Collect.js failed to load from", script.src);
    if (typeof onLoaded === "function") {
      onLoaded();
    }
  };
  document.body.appendChild(script);
}

function rebindCollectAfterEnvChange() {
  const checkVisible =
    document.getElementById("checkWrapper").style.display === "block";
  loadCollectScript(function () {
    if (checkVisible) {
      showCheckFields();
    } else {
      showCardFields();
    }
  });
}

function handleEnvToggle() {
  const env = getEnvName();
  const $label = $("#envLabel");
  $label
    .text(env)
    .removeClass("env-sandbox env-secure")
    .addClass("env-" + env);
  rebindCollectAfterEnvChange();
}

function initEnvToggle() {
  $("#envToggle").on("change", handleEnvToggle);
}

$(document).ready(function () {
  initEnvToggle();
  loadCollectScript(function () {
    configureCollectJS();
  });
  initCollapsibleSections();
  initTransactionTypeSelector();
  initOmitBillingToggle();
  initDynamicFields();
  initPaymentSubmit();
});

/* ─── Payment Submission ─── */
function initPaymentSubmit() {
  document
    .getElementById("paymentForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      document.getElementById("payButton").click();
    });

  document
    .getElementById("payButton")
    .addEventListener("click", async function (event) {
      event.preventDefault();
      showSpinner();

      var form = document.getElementById("paymentForm");
      var formData = new FormData(form);

      const skipToken = document.getElementById("skipTokenization").checked;
      let paymentToken = null;

      if (!skipToken) {
        try {
          paymentToken = await requestCollectJSToken();
          formData.append("payment_token", paymentToken);
        } catch (err) {
          hideSpinner();
          displayError(err.message || "Tokenization failed or timed out.");
          return;
        }
      }

      const txnType = formData.get("type");

      if (shouldRunThreeDS(txnType, formData, paymentToken)) {
        try {
          const threeDSResult = await runThreeDSecure(formData, paymentToken);
          applyThreeDSToFormData(formData, threeDSResult);
        } catch (err) {
          hideSpinner();
          displayError(
            err && err.message
              ? "3D Secure failed: " + err.message
              : "3D Secure authentication failed."
          );
          return;
        }
      }

      if (txnType === "") {
        formData.delete("type");
      }

      if (document.getElementById("omitBilling").checked) {
        const billingKeys = [
          "first_name", "last_name", "email", "phone",
          "address1", "city", "state", "zip", "country",
        ];
        billingKeys.forEach((key) => formData.delete(key));
      }

      formData.append("nmi_env", getEnvName());

      await fetch("/api/payment", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.text())
        .then((data) => {
          displayResponse(data);
          hideSpinner();
        })
        .catch((error) => {
          console.error("Error:", error);
          displayError("Network error. Check that the server is running.");
          hideSpinner();
        });
    });
}

/* ─── 3D Secure (Gateway.js) ─── */
function shouldRunThreeDS(txnType, formData, paymentToken) {
  if (typeof Gateway === "undefined") return false;
  const cardVisible =
    document.getElementById("cardWrapper").style.display !== "none";
  if (!cardVisible) return false;
  if (!paymentToken) return false;
  if (txnType !== "sale" && txnType !== "auth" && txnType !== "validate") {
    return false;
  }
  const amount = parseFloat(formData.get("amount") || "0");
  if (txnType !== "validate" && (!amount || amount <= 0)) return false;
  return true;
}

function buildThreeDSOptions(formData, paymentToken) {
  const get = (key) => (formData.get(key) || "").toString();
  return {
    paymentToken: paymentToken,
    currency: get("currency") || "USD",
    amount: get("amount"),
    email: get("email"),
    firstName: get("first_name"),
    lastName: get("last_name"),
    address1: get("address1"),
    city: get("city"),
    state: get("state"),
    country: get("country") || "US",
    postalCode: get("zip"),
    phone: get("phone"),
  };
}

function setThreeDSStatus(message, kind) {
  const el = document.getElementById("threeDSStatus");
  if (!el) return;
  if (!message) {
    el.style.display = "none";
    el.textContent = "";
    el.className = "three-ds-status";
    return;
  }
  el.style.display = "block";
  el.textContent = message;
  el.className = "three-ds-status three-ds-status-" + (kind || "info");
}

function clearThreeDSMount() {
  const mount = document.getElementById("threeDSMountPoint");
  if (mount) mount.innerHTML = "";
}

function runThreeDSecure(formData, paymentToken) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      fn(arg);
    };

    try {
      setThreeDSStatus("Initializing 3D Secure…", "info");
      clearThreeDSMount();

      const gateway = Gateway.create(DEFAULT_KEYS[getEnvName()] || "");
      const threeDS = gateway.get3DSecure();
      const ui = threeDS.createUI(buildThreeDSOptions(formData, paymentToken));

      gateway.on("error", (e) => {
        setThreeDSStatus("3D Secure error.", "error");
        finish(reject, new Error((e && e.message) || "Gateway error"));
      });

      ui.on("challenge", () => {
        setThreeDSStatus("Cardholder challenge in progress…", "info");
      });

      ui.on("complete", (e) => {
        setThreeDSStatus(
          "3D Secure authentication " + (e.cardHolderAuth || "complete") + ".",
          "success"
        );
        finish(resolve, e);
      });

      ui.on("failure", (e) => {
        setThreeDSStatus("3D Secure authentication failed.", "error");
        finish(
          reject,
          new Error((e && e.message) || "Authentication failed")
        );
      });

      ui.start("#threeDSMountPoint");
    } catch (err) {
      setThreeDSStatus("3D Secure could not start.", "error");
      finish(reject, err);
    }
  });
}

function applyThreeDSToFormData(formData, result) {
  if (!result) return;
  const fields = {
    cavv: result.cavv,
    xid: result.xid,
    eci: result.eci,
    three_ds_version: result.threeDsVersion,
    directory_server_id: result.directoryServerId,
    cardholder_auth: result.cardHolderAuth,
  };
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.set(key, value);
    }
  });
}

function requestCollectJSToken() {
  const TIMEOUT_MS = 30000;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      _tokenResolve = null;
      reject(new Error("Collect.js did not respond within 30 seconds. Ensure payment fields are filled in, or check 'Skip tokenization'."));
    }, TIMEOUT_MS);

    _tokenResolve = (token) => {
      clearTimeout(timer);
      resolve(token);
    };

    CollectJS.startPaymentRequest();
  });
}

/* ─── Response Display ─── */
function displayResponse(data) {
  const placeholder = document.getElementById("responsePlaceholder");
  const content = document.getElementById("responseContent");
  const statusEl = document.getElementById("responseStatus");
  const preEl = document.getElementById("prettyPrint");

  placeholder.style.display = "none";
  content.style.display = "block";

  const pairs = data.split("&").reduce((acc, pair) => {
    const [key, value] = pair.split("=");
    if (key) acc[decodeURIComponent(key)] = decodeURIComponent(value || "");
    return acc;
  }, {});

  const responseCode = parseInt(pairs["response_code"] || "0", 10);
  const responseText = pairs["responsetext"] || pairs["response_text"] || "";

  if (responseCode === 1 || (responseCode >= 100 && responseCode < 200)) {
    statusEl.className = "response-status status-approved";
    statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Approved';
  } else if (responseCode === 2 || (responseCode >= 200 && responseCode < 300)) {
    statusEl.className = "response-status status-declined";
    statusEl.innerHTML = '<i class="fas fa-times-circle"></i> Declined';
  } else {
    statusEl.className = "response-status status-error";
    statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
  }

  if (responseText) {
    statusEl.innerHTML += " &mdash; " + responseText;
  }

  const formatted = Object.entries(pairs)
    .map(([key, value]) => {
      const keySpan = '<span class="key">' + escapeHtml(key) + '</span>';
      let valueClass = "";
      if (key === "response" && value === "1") valueClass = "value-success";
      else if (key === "response" && value !== "1") valueClass = "value-error";
      const valSpan = valueClass
        ? '<span class="' + valueClass + '">' + escapeHtml(value) + "</span>"
        : escapeHtml(value);
      return keySpan + ": " + valSpan;
    })
    .join("\n");

  preEl.innerHTML = formatted;

  document.getElementById("responsePanel").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function displayError(message) {
  const placeholder = document.getElementById("responsePlaceholder");
  const content = document.getElementById("responseContent");
  const statusEl = document.getElementById("responseStatus");
  const preEl = document.getElementById("prettyPrint");

  placeholder.style.display = "none";
  content.style.display = "block";

  statusEl.className = "response-status status-error";
  statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
  preEl.textContent = message;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ─── Spinner ─── */
function showSpinner() {
  document.getElementById("spinner").classList.add("visible");
}

function hideSpinner() {
  document.getElementById("spinner").classList.remove("visible");
}

/* ─── Transaction Type Selector ─── */
function initTransactionTypeSelector() {
  document.querySelectorAll(".txn-type-option").forEach((option) => {
    option.addEventListener("click", function () {
      document
        .querySelectorAll(".txn-type-option")
        .forEach((o) => o.classList.remove("active"));
      this.classList.add("active");
      this.querySelector('input[type="radio"]').checked = true;
    });
  });
}

/* ─── Omit / Skip Toggles ─── */
function initOmitBillingToggle() {
  const billingCb = document.getElementById("omitBilling");
  const billingLabel = billingCb.closest(".omit-label");
  const billingFields = document.getElementById("billingFields");

  billingCb.addEventListener("change", function () {
    billingLabel.classList.toggle("checked", this.checked);
    billingFields.classList.toggle("billing-omitted", this.checked);
  });

  const skipCb = document.getElementById("skipTokenization");
  const skipLabel = skipCb.closest(".omit-label");
  const paymentContainer = document.querySelector(".payment-form-container");

  skipCb.addEventListener("change", function () {
    skipLabel.classList.toggle("checked", this.checked);
    paymentContainer.classList.toggle("billing-omitted", this.checked);
  });
}

/* ─── Collapsible Sections ─── */
function initCollapsibleSections() {
  document.querySelectorAll(".collapsible-header").forEach((header) => {
    header.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      const target = document.getElementById(targetId);

      if (this.classList.contains("collapsed")) {
        this.classList.remove("collapsed");
        target.classList.remove("section-collapsed");
        target.style.display = "";
      } else {
        this.classList.add("collapsed");
        target.classList.add("section-collapsed");
        target.style.display = "none";
      }
    });
  });
}

/* ─── Dynamic Fields ─── */
function initDynamicFields() {
  const transactionVariables = [
    // Account Updater
    "acu_enabled",
    // ACH-specific
    "account_holder_type",
    "account_type",
    "payment",
    "sec_code",
    "social_security_number",
    // Billing
    "address2",
    "billing_method",
    "billing_number",
    "billing_total",
    "company",
    "fax",
    // Convenience / Fees
    "convenience_fee",
    "currency",
    "misc_fee",
    "misc_fee_name",
    "surcharge",
    "tip",
    // Customer Receipt
    "customer_receipt",
    // Customer Vault
    "customer_vault",
    "customer_vault_id",
    // Descriptors
    "descriptor",
    "descriptor_address",
    "descriptor_city",
    "descriptor_country",
    "descriptor_mcc",
    "descriptor_merchant_id",
    "descriptor_phone",
    "descriptor_postal",
    "descriptor_state",
    "descriptor_url",
    // Driver's License
    "drivers_license_dob",
    "drivers_license_number",
    "drivers_license_state",
    // Duplicate / Processor
    "dup_seconds",
    "industry",
    "ipaddress",
    "network_tokenize",
    "pinless_debit_override",
    "processor_id",
    // Level II/III Order
    "alternate_tax_amount",
    "alternate_tax_id",
    "customer_vat_registration",
    "discount_amount",
    "duty_amount",
    "merchant_vat_registration",
    "national_tax_amount",
    "order_date",
    "order_description",
    "order_template",
    "orderid",
    "ponumber",
    "ship_from_postal",
    "shipping",
    "shipping_postal",
    "summary_commodity_code",
    "tax",
    "vat_invoice_reference_number",
    "vat_tax_amount",
    "vat_tax_rate",
    // Level III Line Items
    "item_alternate_tax_id_1",
    "item_commodity_code_1",
    "item_description_1",
    "item_discount_amount_1",
    "item_discount_rate_1",
    "item_product_code_1",
    "item_quantity_1",
    "item_tax_amount_1",
    "item_tax_rate_1",
    "item_tax_type_1",
    "item_total_amount_1",
    "item_unit_cost_1",
    "item_unit_of_measure_1",
    // Merchant Defined
    "merchant_defined_field_1",
    "merchant_defined_field_2",
    "merchant_defined_field_3",
    // Partial Payments
    "partial_payment_id",
    "partial_payments",
    // Payment Facilitator
    "payment_facilitator_id",
    "submerchant_address",
    "submerchant_city",
    "submerchant_country",
    "submerchant_email",
    "submerchant_id",
    "submerchant_name",
    "submerchant_phone",
    "submerchant_postal",
    "submerchant_state",
    // Recurring / Subscription
    "day_frequency",
    "day_of_month",
    "month_frequency",
    "plan_amount",
    "plan_id",
    "plan_payments",
    "recurring",
    "start_date",
    // Secondary Transaction
    "authorization_code",
    "source_transaction_id",
    "transactionid",
    // Shipping
    "shipping_address1",
    "shipping_address2",
    "shipping_carrier",
    "shipping_city",
    "shipping_company",
    "shipping_country",
    "shipping_date",
    "shipping_email",
    "shipping_firstname",
    "shipping_lastname",
    "shipping_state",
    "shipping_zip",
    "tracking_number",
    // Stored Credentials (CIT/MIT)
    "initiated_by",
    "initial_transaction_id",
    "stored_credential_indicator",
    // Void / Refund
    "void_reason",
  ].sort();

  const addFieldButton = document.getElementById("addFieldButton");
  const dynamicFieldsContainer = document.getElementById(
    "dynamicFieldsContainer"
  );

  addFieldButton.addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "row g-2 mb-2 align-items-end";

    const selectCol = document.createElement("div");
    selectCol.className = "col-md-5";

    const selectLabel = document.createElement("label");
    selectLabel.textContent = "Field";
    selectLabel.className = "form-label";

    const selectElement = document.createElement("select");
    selectElement.className = "form-select form-select-sm";
    transactionVariables.forEach((variable) => {
      const option = document.createElement("option");
      option.value = variable;
      option.textContent = variable;
      selectElement.appendChild(option);
    });

    selectCol.appendChild(selectLabel);
    selectCol.appendChild(selectElement);

    const inputCol = document.createElement("div");
    inputCol.className = "col-md-5";

    const inputLabel = document.createElement("label");
    inputLabel.textContent = "Value";
    inputLabel.className = "form-label";

    const inputElement = document.createElement("input");
    inputElement.type = "text";
    inputElement.className = "form-control form-control-sm";
    inputElement.name = selectElement.value;
    inputElement.placeholder = "Enter value...";

    selectElement.addEventListener("change", () => {
      inputElement.name = selectElement.value;
    });

    inputCol.appendChild(inputLabel);
    inputCol.appendChild(inputElement);

    const removeCol = document.createElement("div");
    removeCol.className = "col-md-2";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-outline-danger btn-sm w-100";
    removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
    removeBtn.addEventListener("click", () => row.remove());

    removeCol.appendChild(removeBtn);

    row.appendChild(selectCol);
    row.appendChild(inputCol);
    row.appendChild(removeCol);
    dynamicFieldsContainer.appendChild(row);
  });
}

/* ─── Collect.js Configuration ─── */
function configureCollectJS() {
  console.log("Configure has been called.");

  if (typeof CollectJS != "undefined") {
    CollectJS.configure({
      // Restricts callbacks to named functions instead of eval'd strings so the
      // CSP can omit 'unsafe-eval'. See COLLECT_STATIC_DATA_ATTRIBUTES note.
      blockEval: true,
      fieldsAvailableCallback: function () {
        console.log("Collect.js has added fields to the form");
      },
      validationCallback: function (field, status, message) {
        console.log(
          field + (status ? " is now OK: " : " is now Invalid: ") + message
        );
      },
      callback: function (response) {
        console.log("CollectJS response: " + JSON.stringify(response));

        if (_tokenResolve) {
          _tokenResolve(response.token);
          _tokenResolve = null;
        }
      },
    });
  }
}

/* ─── Payment Method Switching ─── */
const showCheckFields = () => {
  document.getElementById("checkWrapper").style.display = "block";
  document.getElementById("cardWrapper").style.display = "none";
  document.getElementById("checkMethodBtn").classList.add("active");
  document.getElementById("cardMethodBtn").classList.remove("active");

  CollectJS.clearInputs();
  removeFields(["cvv", "ccnumber", "ccexp"], detachedCardFields);
  configureCollectJS();
};

const showCardFields = () => {
  removeFields(
    ["demoCheckaccount", "demoCheckaba", "demoCheckname"],
    detachedCheckFields
  );

  document.getElementById("cardWrapper").style.display = "block";
  document.getElementById("checkWrapper").style.display = "none";
  document.getElementById("cardMethodBtn").classList.add("active");
  document.getElementById("checkMethodBtn").classList.remove("active");

  configureCollectJS();
};

let detachedCardFields = {};
let detachedCheckFields = {};

const removeFields = (fieldIds, storageObj) => {
  fieldIds.forEach((id) => {
    let field = $(`#${id}`).detach();
    storageObj[id] = field;
  });
};

const addFields = (fieldIds, storageObj, parentElementId) => {
  fieldIds.forEach((id) => {
    if (storageObj[id]) {
      $(`#${parentElementId}`).append(storageObj[id]);
      delete storageObj[id];
    }
  });
};

/* ─── Clipboard Helper ─── */
function copyToClipboard(text, element) {
  navigator.clipboard.writeText(text).then(() => {
    element.classList.add("copied");
    showToast("Copied: " + text);
    setTimeout(() => element.classList.remove("copied"), 1500);
  });
}

function showToast(message) {
  const existing = document.querySelector(".toast-notification");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}
