/**
 * Payment Component with 3D Secure Integration
 *
 * Mounts NMI's @nmipayments/nmi-pay widget (card / ACH / Apple Pay / Google
 * Pay), tokenizes client-side, runs 3-D Secure through mountNmiThreeDSecure
 * only when it is actually warranted, and POSTs the token (+ any 3DS auth data)
 * to /api/pay.
 *
 * 3DS routing (port guide §10):
 *   - Google Pay / Apple Pay → bypass 3DS (wallet tokens are already
 *     device-authenticated; Apple Pay in particular is often *rejected* by 3DS).
 *   - ACH / e-check → bypass 3DS (not a card network).
 *   - Card → run 3DS only when the card looks enrolled; otherwise post directly.
 *   - TRANSACTION_STATUS_U in onFailure is now a log-only safety net, not the
 *     golden path.
 */

import { mountNmiPayments, mountNmiThreeDSecure } from "@nmipayments/nmi-pay";
import { fillCheckoutForm } from "../test/devFillers.js";

// Generate a random amount between $1.00 and $100.00
function generateRandomAmount() {
  const min = 1.0;
  const max = 100.0;
  const randomAmount = (Math.random() * (max - min) + min).toFixed(2);
  return randomAmount;
}

// Set the random amount globally when the module loads
const RANDOM_AMOUNT = generateRandomAmount();

// 3D Secure state variables
let paymentToken = null;
let threeDSInstance = null;
let paymentWidget = null;
let tokenLookupData = null;

// Public tokenization keys per environment (safe to expose client-side). The
// matching merchant *security key* lives server-side in Cloudflare secrets and
// is used by /api/pay — it must never appear here.
const TOKENIZATION_KEYS = {
  sandbox: "Mm3Pt3-e6BCRA-329Frx-Ct5T9m",
  secure: "422sBg-455HhP-5TqMwA-G4HX7m",
};

function getEnvName() {
  const toggle = document.getElementById("envToggle");
  return toggle && toggle.checked ? "secure" : "sandbox";
}

function getTokenizationKey() {
  return TOKENIZATION_KEYS[getEnvName()];
}

/** NMI may set paymentToken to a string (onChange) or an object with .token (onPay). */
function getPaymentTokenString() {
  if (paymentToken == null) return "";
  if (typeof paymentToken === "string") return paymentToken;
  if (typeof paymentToken === "object" && paymentToken.token != null) {
    const t = paymentToken.token;
    return typeof t === "string" ? t : String(t);
  }
  return String(paymentToken);
}

/**
 * Should a plain card payment attempt a 3DS challenge?
 *
 * The observed lookupData.card payload (number/bin/exp/type/hash) does not
 * carry an explicit enrollment flag, and the checkEnrollment SDK surface is not
 * confirmed for the pinned @nmipayments/nmi-pay build — so when there is no
 * signal we default to attempting 3DS and let the onFailure TRANSACTION_STATUS_U
 * safety net handle a not-enrolled card. If a future SDK build does expose an
 * enrollment hint on the card object, we honor it here (Y/true → challenge).
 */
function isCardEnrolledFor3DS(lookupData) {
  const card = lookupData && lookupData.card;
  if (!card) return true;
  const flag =
    card.enrolled != null
      ? card.enrolled
      : card.threeDsEnrolled != null
        ? card.threeDsEnrolled
        : card.three_ds_enrolled;
  if (typeof flag === "boolean") return flag;
  if (typeof flag === "string") {
    const f = flag.trim().toLowerCase();
    return f === "y" || f === "yes" || f === "true";
  }
  return true; // unknown → attempt 3DS
}

/**
 * Builds the /api/pay payload common to every path. When `threeDsResult` is
 * provided its authentication fields are folded in; otherwise the payload
 * carries no 3DS fields (wallets, ACH, non-enrolled cards).
 */
function buildPaymentPayload(threeDsResult) {
  const formData = getFormData();
  const amount = parseFloat(formData.amount || RANDOM_AMOUNT);

  const payload = {
    paymentToken: getPaymentTokenString(),
    amount: amount,
    currency: formData.currency || "USD",
    nmi_env: getEnvName(),

    // Customer information using NMI field names
    first_name: formData.first_name || "",
    last_name: formData.last_name || "",
    email: formData.email || "",
    phone: formData.phone || "",
    company: formData.company || "",

    // Billing address using NMI field names
    address1: formData.address1 || "",
    address2: formData.address2 || "",
    city: formData.city || "",
    state: formData.state || "",
    zip: formData.zip || "",
    country: formData.country || "US",

    type: "sale",
  };

  if (threeDsResult) {
    // 3DS data from authentication (camelCase field names; /api/pay maps them
    // to NMI's snake_case parameters).
    payload.cardHolderAuth = threeDsResult.cardHolderAuth || "";
    payload.cavv = threeDsResult.cavv || "";
    payload.directoryServerId = threeDsResult.directoryServerId || "";
    payload.eci = threeDsResult.eci || "";
    payload.threeDsVersion = threeDsResult.threeDsVersion || "";
    payload.xid = threeDsResult.xid || "";
  }

  // lookupData is logged server-side only.
  if (tokenLookupData) {
    payload.lookupData = tokenLookupData;
  }

  return payload;
}

/**
 * Non-3DS payment path shared by wallets (Apple/Google Pay), ACH, and
 * non-enrolled cards. `kind` is used only for user messaging/logging.
 * Consolidates what were separate Google Pay / standard-fallback code paths in
 * the source project.
 */
async function handleNonThreeDSPayment(kind) {
  if (!paymentToken) {
    showMessage(
      "error",
      "Payment token not available. Please re-enter your payment information.",
    );
    return;
  }

  const labels = {
    wallet: "Processing wallet payment...",
    ach: "Processing bank account payment...",
    card: "Processing payment...",
  };

  try {
    showProcessing(true);
    showMessage("info", labels[kind] || "Processing payment...");

    const payload = buildPaymentPayload(null);
    console.log(`Non-3DS payment (${kind}) payload:`, payload);

    await handlePayment(payload);
  } catch (error) {
    console.error(`Non-3DS payment error (${kind}):`, error);
    showMessage("error", `Error processing payment: ${error.message}`);
    showProcessing(false);
  }
}

// Function to handle payment processing with 3D Secure
async function handlePaymentWith3DS() {
  if (!paymentToken) {
    showMessage(
      "error",
      "Payment token not available. Please re-enter your payment information.",
    );
    return;
  }

  if (!threeDSInstance) {
    showMessage(
      "error",
      "3D Secure system not ready. Please refresh the page.",
    );
    return;
  }

  try {
    showProcessing(true);
    showMessage("info", "Starting 3D Secure authentication...");

    const formData = getFormData();
    const amount = parseFloat(formData.amount || RANDOM_AMOUNT);

    console.log("=== Starting 3DS Authentication ===");
    console.log("Payment Token:", paymentToken);
    if (tokenLookupData) {
      console.log("Using Token Lookup Data:", tokenLookupData);
    }

    // Prepare payment information for 3DS authentication
    const paymentInfo = {
      paymentToken: getPaymentTokenString(),
      currency: formData.currency || "USD",
      amount: amount,
      firstName: formData.first_name || "",
      lastName: formData.last_name || "",
      email: formData.email || "",
      city: formData.city || "",
      postalCode: formData.zip || "",
      country: formData.country || "US",
      phone: formData.phone || "",
      address1: formData.address1 || "",
      address2: formData.address2 || "",
      state: formData.state || "",
      challengeIndicator: "04",
    };

    console.log("Payment Info for 3DS:", paymentInfo);

    // Start 3D Secure authentication
    threeDSInstance.startThreeDSecure(paymentInfo);
  } catch (error) {
    console.error("3DS Error:", error);
    showMessage("error", `Error starting 3D Secure: ${error.message}`);
    showProcessing(false);
  }
}

// Utility functions
function showMessage(type, message) {
  const messagesContainer = document.getElementById("payment-messages");
  messagesContainer.innerHTML = `
    <div class="alert alert-${
      type === "success" ? "success" : "danger"
    } alert-dismissible fade show" role="alert">
      <i class="fas fa-${
        type === "success" ? "check-circle" : "exclamation-triangle"
      } me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

function showProcessing(show) {
  const indicator = document.getElementById("processing-indicator");
  indicator.classList.toggle("d-none", !show);
}

function getFormData() {
  const form = document.getElementById("checkout-form");
  const formData = new FormData(form);
  const data = {};

  for (let [key, value] of formData.entries()) {
    data[key] = value;
  }

  return data;
}

function updateExpressCheckoutAmount() {
  const amountElement = document.getElementById("amount");
  const amount = amountElement.value || RANDOM_AMOUNT;
  return amount;
}

// Display card information from token lookup data
function displayCardInformation(lookupData) {
  const cardInfoContainer = document.getElementById("card-info-display");
  if (!cardInfoContainer) return;

  let cardInfoHtml = "";

  if (lookupData.card && lookupData.card.type) {
    cardInfoHtml = `
      <div class="alert alert-info" role="alert">
        <i class="fas fa-credit-card me-2"></i>
        <strong>Payment Method:</strong> ${lookupData.card.type}
        ${
          lookupData.card.number
            ? ` ending in ${lookupData.card.number.slice(-4)}`
            : ""
        }
        ${lookupData.card.exp ? ` (Exp: ${lookupData.card.exp})` : ""}
      </div>
    `;
  } else if (lookupData.check && lookupData.check.name) {
    cardInfoHtml = `
      <div class="alert alert-info" role="alert">
        <i class="fas fa-university me-2"></i>
        <strong>Payment Method:</strong> Bank Account (${lookupData.check.name})
        ${
          lookupData.check.account
            ? ` ending in ${lookupData.check.account.slice(-4)}`
            : ""
        }
      </div>
    `;
  }

  cardInfoContainer.innerHTML = cardInfoHtml;
}

// Clear displayed card information
function clearCardInformation() {
  const cardInfoContainer = document.getElementById("card-info-display");
  if (cardInfoContainer) {
    cardInfoContainer.innerHTML = "";
  }
}

async function handlePayment(paymentRequestPayload) {
  try {
    const response = await fetch("/api/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentRequestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(
          `Payment failed: ${errorData.error || "Unknown error"}`,
        );
      } catch (parseError) {
        throw new Error(
          `HTTP error! status: ${response.status}, response: ${errorText}`,
        );
      }
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText);

    if (data.success) {
      console.log("Payment successful:", data);
      showMessage(
        "success",
        `Payment successful! Transaction ID: ${data.transactionId || "N/A"}`,
      );
    } else {
      console.error("Payment failed:", data.error);
      showMessage("error", `Payment failed: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Payment processing error:", error);
    showMessage("error", `Payment error: ${error.message}`);
  } finally {
    showProcessing(false);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Get amount input element once and reuse
    const amountInput = document.getElementById("amount");
    const emailInput = document.getElementById("email");
    // Preserve the email value from the HTML default so auto-fill never overwrites it.
    const fixedEmail = emailInput.defaultValue || emailInput.value;

    // Set the random amount in the input field
    amountInput.value = RANDOM_AMOUNT;

    // Set up fill test data button for manual refilling
    const fillTestDataBtn = document.getElementById("fill-test-data");
    fillTestDataBtn.addEventListener("click", () => {
      fillCheckoutForm();
      // Regenerate and set a new random amount when refreshing test data
      const newRandomAmount = generateRandomAmount();
      amountInput.value = newRandomAmount;
      emailInput.value = fixedEmail;
      showMessage(
        "success",
        "Test data refreshed successfully with new random amount!",
      );
    });

    // Auto-fill form with test data on page load (slight delay to ensure modules are loaded)
    setTimeout(() => {
      try {
        fillCheckoutForm();
        amountInput.value = RANDOM_AMOUNT;
        emailInput.value = fixedEmail;
        showMessage("success", "Form auto-filled with test data!");
      } catch (error) {
        console.error("Error auto-filling form:", error);
        showMessage(
          "info",
          "Click 'Refresh Test Data' to fill the form with sample data.",
        );
      }
    }, 100);

    // Monitor amount changes for express checkout
    amountInput.addEventListener("change", updateExpressCheckoutAmount);

    mountWidgets();
    initEnvToggle();
  } catch (error) {
    console.error("Error loading payment widget:", error);
    showMessage(
      "error",
      "Error loading payment widget. Please refresh the page.",
    );
  }
});

function initEnvToggle() {
  const toggle = document.getElementById("envToggle");
  if (!toggle) return;
  toggle.addEventListener("change", () => {
    const env = getEnvName();
    const label = document.getElementById("envLabel");
    if (label) {
      label.textContent = env;
      label.classList.remove("env-sandbox", "env-secure");
      label.classList.add("env-" + env);
    }
    remountWidgets();
  });
}

function remountWidgets() {
  try {
    if (paymentWidget && typeof paymentWidget.destroy === "function") {
      paymentWidget.destroy();
    }
  } catch (e) {
    console.warn("Error destroying payment widget:", e);
  }
  try {
    if (threeDSInstance && typeof threeDSInstance.destroy === "function") {
      threeDSInstance.destroy();
    }
  } catch (e) {
    console.warn("Error destroying 3DS widget:", e);
  }
  paymentWidget = null;
  threeDSInstance = null;
  paymentToken = null;
  tokenLookupData = null;
  clearCardInformation();
  mountWidgets();
  showMessage(
    "info",
    `Switched to ${getEnvName() === "secure" ? "production" : "sandbox"} environment.`,
  );
}

function mountWidgets() {
  // Mount the payment widget (for tokenization only, not direct payment)
  paymentWidget = mountNmiPayments("#payment-container", {
    tokenizationKey: getTokenizationKey(),
    layout: "multiLine",
    paymentMethods: ["card", "ach", "apple-pay", "google-pay"],
    expressCheckoutConfig: {
      amount: RANDOM_AMOUNT,
      currency: "USD",
    },
    appearance: {
      theme: "light",
    },
    // Apple Pay & Google Pay complete here (NOT onPay) in nmi-pay v1.0.2 — the
    // SDK routes wallet tokens to onExpressCheckout via its internal handler.
    // Wallet tokens are already device-authenticated, so we bypass 3DS and post
    // the sale directly. This is what fixes the Apple Pay case from §10: wallets
    // structurally cannot reach the 3DS path anymore.
    onExpressCheckout: async (event) => {
      console.log("=== onExpressCheckout Event - Wallet Payment ===", event);
      const token = event && (event.token != null ? event.token : event);
      if (event && event.lookupData) tokenLookupData = event.lookupData;
      paymentToken = token;
      await handleNonThreeDSPayment("wallet");
    },

    // Capture payment token when payment form is completed
    onChange: (data) => {
      console.log("=== onChange Event - Full Data ===");
      console.log("Complete:", data.complete);
      console.log("Token:", data.token);

      // Handle token lookup data if available
      if (data.lookupData) {
        console.log("=== Token Lookup Data Available ===");
        console.log("Lookup Data:", data.lookupData);

        if (data.lookupData.card) {
          console.table({
            "Card Number (Masked)": data.lookupData.card.number || "N/A",
            BIN: data.lookupData.card.bin || "N/A",
            Expiration: data.lookupData.card.exp || "N/A",
            "Card Type": data.lookupData.card.type || "N/A",
            Hash: data.lookupData.card.hash || "N/A",
          });
        }

        if (data.lookupData.check) {
          console.table({
            "Account Name": data.lookupData.check.name || "N/A",
            "Account Number (Masked)": data.lookupData.check.account || "N/A",
            "ABA Routing": data.lookupData.check.aba || "N/A",
            "Transit Number": data.lookupData.check.transit || "N/A",
            "Institution Number": data.lookupData.check.institution || "N/A",
            Hash: data.lookupData.check.hash || "N/A",
          });
        }

        // Store lookup data for potential use elsewhere
        tokenLookupData = data.lookupData;

        // Display user-friendly card information
        displayCardInformation(data.lookupData);
      }

      if (data.complete && data.token) {
        console.log("✅ Payment data validated - Token captured:", data.token);
        paymentToken = data.token;

        let successMessage =
          "Payment information validated! Use the payment button below to complete your purchase.";
        if (
          data.lookupData &&
          data.lookupData.card &&
          data.lookupData.card.type
        ) {
          successMessage = `${data.lookupData.card.type} payment information validated! Use the payment button below to complete your purchase.`;
        }

        showMessage("success", successMessage);
      } else if (!data.complete) {
        // Clear stored data if form is no longer complete
        paymentToken = null;
        tokenLookupData = null;
        clearCardInformation();
      }
    },

    // onPay fires from the widget's Pay button for card / ACH only — wallets
    // go through onExpressCheckout (see above). In nmi-pay v1.0.2 the handler
    // receives a single { token, lookupData } object, so we normalize that
    // (older builds passed a bare token string; handled defensively).
    //
    // Routing (port guide §10): ACH bypasses 3DS; cards run 3DS only when the
    // card looks enrolled, otherwise post directly.
    onPay: async (event) => {
      console.log("=== onPay Event - Payment Initiated ===", event);

      const isObj = event && typeof event === "object" && !Array.isArray(event);
      paymentToken = isObj ? event.token : event;
      const lookup = (isObj && event.lookupData) || tokenLookupData;
      if (lookup) tokenLookupData = lookup;

      if (lookup && lookup.check) {
        // ACH / e-check is not a card network — 3DS does not apply.
        console.log("ACH / e-check payment - bypassing 3DS");
        await handleNonThreeDSPayment("ach");
      } else if (!isCardEnrolledFor3DS(lookup)) {
        // Card is not enrolled — skip the challenge and post directly.
        console.log("Card not enrolled for 3DS - posting without 3DS");
        await handleNonThreeDSPayment("card");
      } else {
        // Enrolled (or enrollment unknown) card — run the 3DS challenge.
        console.log("Card payment - running 3DS");
        await handlePaymentWith3DS();
      }

      // Resolve the SDK's pay promise as successful; actual approval/decline is
      // surfaced via showMessage from handlePayment (3DS completes async in the
      // modal → onComplete). Returning a string here would mark the widget as
      // failed, which we don't want for the async 3DS path.
      return true;
    },
  });

  // Mount 3D Secure component for handling authentication
  threeDSInstance = mountNmiThreeDSecure("#threeds-container", {
    tokenizationKey: getTokenizationKey(),
    modal: true,

    onComplete: async (result) => {
      console.log("3DS Authentication Complete - Response:", result);
      console.table({
        "Card Holder Auth": result.cardHolderAuth || "N/A",
        CAVV: result.cavv || "N/A",
        "Directory Server ID": result.directoryServerId || "N/A",
        ECI: result.eci || "N/A",
        "3DS Version": result.threeDsVersion || "N/A",
        XID: result.xid || "N/A",
      });

      showMessage("success", "3D Secure authentication completed successfully!");

      const paymentRequestPayload = buildPaymentPayload(result);

      showProcessing(true);
      await handlePayment(paymentRequestPayload);
    },

    onFailure: (error) => {
      console.error("3DS Authentication failed:", error);
      console.table({
        "Error Code": error.code || "N/A",
        "Error Message": error.message || "N/A",
        "Error Type": error.type || "N/A",
      });

      if (error.code === "TRANSACTION_STATUS_U") {
        // Safety net only: enrollment is now checked up front in onPay, so this
        // branch should rarely fire. If it does, the card turned out not to be
        // enrolled after the lookup — continue silently with a standard payment
        // and log a warning rather than alarming the customer.
        console.warn(
          "[3DS] TRANSACTION_STATUS_U after enrollment check — continuing without 3DS (log-only safety net).",
        );
        const paymentRequestPayload = buildPaymentPayload(null);
        showProcessing(true);
        handlePayment(paymentRequestPayload);
      } else {
        showMessage(
          "error",
          "3D Secure authentication failed. Please try again.",
        );
        showProcessing(false);
      }
    },

    onChallenge: () => {
      showProcessing(false);
      showMessage(
        "info",
        "3D Secure challenge in progress. Please complete the verification.",
      );
    },
  });
}
