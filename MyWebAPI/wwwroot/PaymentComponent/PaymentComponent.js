/**
 * Payment Component with 3D Secure Integration
 *
 * This component handles payment form processing with 3D Secure authentication.
 * Essential response data is logged to the console for debugging.
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

// Tokenization keys per environment
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

// Function to handle Google Pay payments (bypass 3DS)
async function handleGooglePayPayment() {
  if (!paymentToken) {
    showMessage(
      "error",
      "Payment token not available. Please re-enter your payment information.",
    );
    return;
  }

  try {
    showProcessing(true);
    showMessage("info", "Processing Google Pay payment...");

    // Get all form data for payment information
    const formData = getFormData();
    const amount = parseFloat(formData.amount || RANDOM_AMOUNT);

    // Prepare payment request payload for Google Pay (no 3DS data needed)
    const paymentRequestPayload = {
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

    // Add lookup data to payload if available
    if (tokenLookupData) {
      paymentRequestPayload.lookupData = tokenLookupData;
      console.log("Including token lookup data in Google Pay payment");
    }

    console.log("Google Pay payment payload:", paymentRequestPayload);

    // Process payment directly without 3DS
    await handlePayment(paymentRequestPayload);
  } catch (error) {
    console.error("Google Pay Error:", error);
    showMessage(
      "error",
      `Error processing Google Pay payment: ${error.message}`,
    );
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

    // Get all form data for payment information
    const formData = getFormData();
    const amount = parseFloat(formData.amount || RANDOM_AMOUNT);

    // Log token information for debugging
    console.log("=== Starting 3DS Authentication ===");
    console.log("Payment Token:", paymentToken);

    // Log lookup data if available
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
    console.log(
      "Payment Info stringified:",
      JSON.stringify(paymentInfo, null, 2),
    );

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

  // Update the widget's express checkout amount if possible
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
      // Set this after fillCheckoutForm to prevent override
      const newRandomAmount = generateRandomAmount();
      amountInput.value = newRandomAmount;
      emailInput.value = fixedEmail;
      showMessage(
        "success",
        "Test data refreshed successfully with new random amount!",
      );
    });

    // Auto-fill form with test data on page load (with slight delay to ensure all modules are loaded)
    setTimeout(() => {
      try {
        fillCheckoutForm();
        // Set our custom random amount after form filling to prevent override
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
      onExpressCheckout: (data) => {
        console.log("Express Checkout Data:", data);
      },

      // Capture payment token when payment form is completed
      onChange: (data) => {
        console.log("=== onChange Event - Full Data ===");
        console.log("Complete:", data.complete);
        console.log("Token:", data.token);
        console.log("Full data object:", data);

        // Handle token lookup data if available
        if (data.lookupData) {
          console.log("=== Token Lookup Data Available ===");
          console.log("Lookup Data:", data.lookupData);

          // Log card information if available
          if (data.lookupData.card) {
            console.log("=== Card Information ===");
            console.table({
              "Card Number (Masked)": data.lookupData.card.number || "N/A",
              BIN: data.lookupData.card.bin || "N/A",
              Expiration: data.lookupData.card.exp || "N/A",
              "Card Type": data.lookupData.card.type || "N/A",
              Hash: data.lookupData.card.hash || "N/A",
            });
          }

          // Log check/ACH information if available
          if (data.lookupData.check) {
            console.log("=== Check/ACH Information ===");
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
          console.log(
            "✅ Payment data validated - Token captured:",
            data.token,
          );
          paymentToken = data.token;

          // Enhanced success message with card type if available
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
          // Clear any displayed card information
          clearCardInformation();
        }
      },

      // Handle all payments (card, express payments, etc.) with 3DS
      onPay: async (token, paymentMethod, paymentData) => {
        console.log("=== onPay Event - Payment Initiated ===");
        console.log("Token received:", token);
        console.log("Payment method:", paymentMethod);
        console.log("Payment data structure:", paymentData);
        console.log(
          "Payment data stringified:",
          JSON.stringify(paymentData, null, 2),
        );

        paymentToken = token;

        // Log stored lookup data
        if (tokenLookupData) {
          console.log("Available Token Lookup Data:", tokenLookupData);
        }

        // Log the complete payment data to check for Google Pay data
        console.log("onPay - Payment token:", paymentToken);
        console.log("onPay - Payment method:", paymentMethod);
        console.log("onPay - Payment data:", paymentData);

        // Check if this is a Google Pay payment by looking for googlepay_payment_data
        let isGooglePay = false;
        if (
          paymentData &&
          paymentData.data &&
          Array.isArray(paymentData.data)
        ) {
          const googlePayData = paymentData.data.find(
            (item) => item.elementId === "googlepay_payment_data",
          );
          if (googlePayData) {
            isGooglePay = true;
            console.log("Google Pay payment detected - bypassing 3DS");
            console.log("Google Pay payment data:", googlePayData.value);
          }
        }

        if (isGooglePay) {
          // Bypass 3DS for Google Pay and process payment directly
          await handleGooglePayPayment();
        } else {
          console.log("Regular card payment - use 3DS");
          // Regular card payment - use 3DS
          await handlePaymentWith3DS();
        }

        return true;
      },
    });

    // Mount 3D Secure component for handling authentication

    threeDSInstance = mountNmiThreeDSecure("#threeds-container", {
      tokenizationKey: getTokenizationKey(),
      modal: true,

      onComplete: async (result) => {
        // Log 3DS response data
        console.log("3DS Authentication Complete - Response:", result);
        console.table({
          "Card Holder Auth": result.cardHolderAuth || "N/A",
          CAVV: result.cavv || "N/A",
          "Directory Server ID": result.directoryServerId || "N/A",
          ECI: result.eci || "N/A",
          "3DS Version": result.threeDsVersion || "N/A",
          XID: result.xid || "N/A",
        });

        showMessage(
          "success",
          "3D Secure authentication completed successfully!",
        );

        // Get all form data for the payment request
        const formData = getFormData();
        const amount = parseFloat(formData.amount || RANDOM_AMOUNT);

        // Prepare the complete payment request payload with 3DS data
        const paymentRequestPayload = {
          paymentToken: getPaymentTokenString(),
          amount: amount,
          currency: formData.currency || "USD",
          nmi_env: getEnvName(),

          // 3D Secure data from authentication (using camelCase field names)
          cardHolderAuth: result.cardHolderAuth || "",
          cavv: result.cavv || "",
          directoryServerId: result.directoryServerId || "",
          eci: result.eci || "",
          threeDsVersion: result.threeDsVersion || "",
          xid: result.xid || "",

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

        // Add lookup data to payload if available (for backend processing/logging)
        if (tokenLookupData) {
          paymentRequestPayload.lookupData = tokenLookupData;
          console.log("Including token lookup data in payment request");
        }

        // Send payment request with 3DS data to server

        showProcessing(true);
        handlePayment(paymentRequestPayload);
        showProcessing(false);
      },

      onFailure: (error) => {
        console.error("3DS Authentication failed:", error);
        console.table({
          "Error Code": error.code || "N/A",
          "Error Message": error.message || "N/A",
          "Error Type": error.type || "N/A",
        });

        if (error.code === "TRANSACTION_STATUS_U") {
          // Reconstruct the payment payload for continuing the transaction
          const formData = getFormData();
          const amount = parseFloat(formData.amount || RANDOM_AMOUNT);

          const paymentRequestPayload = {
            paymentToken: getPaymentTokenString(),
            amount: amount,
            currency: formData.currency || "USD",
            nmi_env: getEnvName(),

            // Customer information
            first_name: formData.first_name || "",
            last_name: formData.last_name || "",
            email: formData.email || "",
            phone: formData.phone || "",
            company: formData.company || "",

            // Billing address
            address1: formData.address1 || "",
            address2: formData.address2 || "",
            city: formData.city || "",
            state: formData.state || "",
            zip: formData.zip || "",
            country: formData.country || "US",

            type: "sale",
          };

          showMessage(
            "info",
            "3D Secure unavailable, continuing with standard payment...",
          );
          showProcessing(true);
          handlePayment(paymentRequestPayload);
        } else {
          showMessage(
            "error",
            "3D Secure authentication failed. Please try again.",
          );
        }

        showProcessing(false);
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
