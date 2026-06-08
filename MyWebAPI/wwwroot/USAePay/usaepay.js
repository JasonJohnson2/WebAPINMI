// USAePay Test Workbench - Enhanced Version
// Public Key _87C57lh91v9qL4MWvLtnjTzS078YPko2FVRoe1i9X
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM Content Loaded - Initializing USAePay Test Workbench");

  // ==========================================
  // PAY JS INITIALIZATION
  // ==========================================
  let client = null;
  let paymentCard = null;
  
  try {
    const publicKey = "_87C57lh91v9qL4MWvLtnjTzS078YPko2FVRoe1i9X";
    
    if (typeof usaepay !== 'undefined') {
      client = new usaepay.Client(publicKey);
      paymentCard = client.createPaymentCardEntry();

      // Generate and render the payment card entry into the container
      paymentCard.generateHTML();
      paymentCard.addHTML("paymentCardContainer");

      // Listen for errors so that you can display error messages
      paymentCard.addEventListener("error", (errorMessage) => {
        let errorContainer = document.getElementById("paymentCardErrorContainer");
        if (errorContainer) {
          errorContainer.textContent = errorMessage;
        }
      });
      
      console.log("PayJS initialized successfully");
    } else {
      console.warn("PayJS library not loaded - PayJS transaction form will not work");
    }
  } catch (error) {
    console.error("Error initializing PayJS:", error);
    console.log("PayJS transactions will not be available, but other forms should work");
  }

  // ==========================================
  // TAB NAVIGATION
  // ==========================================
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;

      // Update button states
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Update panel visibility
      tabPanels.forEach((panel) => {
        panel.classList.remove("active");
        if (panel.id === tabId) {
          panel.classList.add("active");
        }
      });
    });
  });

  // ==========================================
  // COLLAPSIBLE SECTIONS
  // ==========================================
  function initializeCollapsible(headerId, contentId) {
    const header = document.getElementById(headerId);
    const content = document.getElementById(contentId);

    if (header && content) {
      header.addEventListener("click", () => {
        header.classList.toggle("active");
        content.classList.toggle("active");
      });
    }
  }

  initializeCollapsible("restOptionalHeader", "restOptionalContent");
  initializeCollapsible("paymentOptionalHeader", "paymentOptionalContent");

  // ==========================================
  // REST API SECTION
  // ==========================================
  const restApiForm = document.getElementById("restApiForm");
  const restCommand = document.getElementById("restCommand");
  const restAmountGroup = document.getElementById("restAmountGroup");
  const restAmount = document.getElementById("restAmount");
  const restApiBtn = document.getElementById("restApiBtn");
  const restApiResultsPanel = document.getElementById("restApiResultsPanel");

  // Verify form exists
  if (!restApiForm) {
    console.error("REST API form not found!");
    return;
  }

  console.log("REST API form initialized successfully");

  // Show/hide amount field based on command
  restCommand.addEventListener("change", function () {
    if (this.value === "cc:save") {
      restAmountGroup.style.display = "none";
      restAmount.removeAttribute("required");
    } else {
      restAmountGroup.style.display = "block";
      restAmount.setAttribute("required", "required");
    }
  });

  restApiForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("REST API form submitted - preventDefault called");

    showRestApiResults("Loading...", "Processing request...", "loading");

    const formData = new FormData(restApiForm);
    const command = formData.get("command");

    const paymentData = {
      command: command,
      cardNumber: formData.get("number"),
      expirationDate: formData.get("expiration"),
      cvc: formData.get("cvc"),
      cardholder: formData.get("cardholder"),
      avsStreet: formData.get("avs_street"),
      avsPostalcode: formData.get("avs_postalcode"),
    };

    // Add amount if not cc:save
    if (command !== "cc:save") {
      paymentData.amount = parseFloat(formData.get("amount"));
    }

    // Add optional parameters if filled
    const optionalFields = ["invoice", "orderId", "description", "custom_field1"];
    optionalFields.forEach((field) => {
      const value = formData.get(field);
      if (value) {
        paymentData[field] = value;
      }
    });

    console.log("REST API payment data:", paymentData);

    try {
      const endpoint = command === "cc:save" ? "/api/UsaEPay/tokenize" : "/api/UsaEPay/tokenTransaction";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();
      console.log("REST API response:", result);

      if (result.success) {
        showRestApiResults(
          "Transaction Successful",
          formatRestApiResponse(result),
          "success"
        );
      } else {
        showRestApiResults(
          "Transaction Failed",
          formatRestApiError(result),
          "error"
        );
      }
    } catch (error) {
      console.error("REST API error:", error);
      showRestApiResults("Error", `Network error: ${error.message}`, "error");
    }
  });

  function showRestApiResults(title, content, status) {
    const colors = {
      success: { bg: "#f0fdf4", border: "#22c55e", title: "#166534" },
      error: { bg: "#fef2f2", border: "#ef4444", title: "#991b1b" },
      loading: { bg: "#f8fafc", border: "#3b82f6", title: "#1e40af" },
    };
    const c = colors[status] || colors.loading;

    restApiResultsPanel.classList.add("has-results");
    restApiResultsPanel.innerHTML = `
      <div style="border-left: 4px solid ${c.border}; padding-left: 16px;">
        <h3 style="color: ${c.title}; margin-bottom: 16px; font-size: 18px;">${title}</h3>
        <div>${content}</div>
      </div>
    `;
  }

  function formatRestApiResponse(result) {
    let html = "";

    if (result.data) {
      const data =
        typeof result.data === "string" ? JSON.parse(result.data) : result.data;

      const keyFields = [
        { label: "Token/Card Ref", key: ["UMcardRef", "cardRef", "token"] },
        { label: "Transaction ID", key: ["UMrefNum", "refNum", "transactionId"] },
        { label: "Status", key: ["UMstatus", "status", "result"] },
        { label: "Card Type", key: ["UMcardType", "cardType"] },
        { label: "Masked Card", key: ["UMmaskedCardNum", "maskedCardNum"] },
        { label: "Authorization", key: ["UMauthCode", "authCode"] },
        { label: "Amount", key: ["UMamount", "amount"] },
        { label: "AVS Result", key: ["UMavsResult", "avsResult"] },
        { label: "CVV Result", key: ["UMcvv2Result", "cvvResult"] },
      ];

      keyFields.forEach(({ label, key }) => {
        const value = key.map((k) => data[k]).find((v) => v);
        if (value) {
          html += `<div class="result-item"><span class="result-label">${label}:</span><span class="result-value">${value}</span></div>`;
        }
      });

      html += `
        <details style="margin-top: 16px;">
          <summary style="cursor: pointer; color: #64748b; font-size: 13px;">View Raw Response</summary>
          <pre style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; margin-top: 8px;">${JSON.stringify(
            data,
            null,
            2
          )}</pre>
        </details>
      `;
    }

    return html || "<p>No data returned</p>";
  }

  function formatRestApiError(result) {
    return `
      <div class="result-item">
        <span class="result-label">Error:</span>
        <span class="result-value" style="color: #dc2626;">${
          result.error || "Unknown error"
        }</span>
      </div>
      ${
        result.rawResponse
          ? `<pre style="background: #fef2f2; padding: 12px; border-radius: 6px; font-size: 12px; margin-top: 12px;">${result.rawResponse}</pre>`
          : ""
      }
    `;
  }

  // ==========================================
  // TOKEN TRANSACTION
  // ==========================================
  const tokenTransactionForm = document.getElementById("tokenTransactionForm");
  const tokenField = document.getElementById("tokenField");
  const tokenTransactionBtn = document.getElementById("tokenTransactionBtn");
  const tokenTransactionResults = document.getElementById(
    "tokenTransactionResults"
  );

  if (tokenTransactionForm) {
    tokenTransactionForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Token transaction form submitted - preventDefault called");

    const formData = new FormData(tokenTransactionForm);
    const paymentData = {
      command: formData.get("command"),
      amount: parseFloat(formData.get("amount")),
      token: formData.get("token"),
    };

    console.log("Token transaction data:", paymentData);
    tokenTransactionBtn.disabled = true;
    tokenTransactionBtn.textContent = "Processing...";

    try {
      const response = await fetch(`/api/UsaEPay/tokenTransaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });
      const result = await response.json();
      console.log("Token transaction response:", result);

      if (result.success) {
        showTokenTransactionResults(
          "Token Transaction Successful",
          formatTokenTransactionResponse(result),
          "success"
        );
      } else {
        showTokenTransactionResults(
          "Token Transaction Failed",
          formatTokenTransactionError(result),
          "error"
        );
      }
    } catch (error) {
      console.error("Token transaction error:", error);
      showTokenTransactionResults(
        "Error",
        `Network error: ${error.message}`,
        "error"
      );
    } finally {
      tokenTransactionBtn.disabled = false;
      tokenTransactionBtn.textContent = "Process Transaction with Token";
    }
    });
  } else {
    console.error("Token transaction form not found!");
  }

  function showTokenTransactionResults(title, content, status) {
    const colors = {
      success: { bg: "#f0fdf4", border: "#22c55e", title: "#166534" },
      error: { bg: "#fef2f2", border: "#ef4444", title: "#991b1b" },
      loading: { bg: "#fffbeb", border: "#f59e0b", title: "#92400e" },
    };
    const c = colors[status] || colors.loading;

    tokenTransactionResults.innerHTML = `
      <div style="border-left: 4px solid ${c.border}; padding-left: 12px; background: ${c.bg}; padding: 12px; border-radius: 0 8px 8px 0; margin-top: 16px;">
        <h4 style="color: ${c.title}; margin-bottom: 8px; font-size: 14px;">${title}</h4>
        <div style="font-size: 13px;">${content}</div>
      </div>
    `;
  }

  function formatTokenTransactionResponse(result) {
    let html = "";

    if (result.data) {
      const data =
        typeof result.data === "string" ? JSON.parse(result.data) : result.data;

      const keyFields = [
        {
          label: "Transaction ID",
          key: ["UMrefNum", "refNum", "transactionId"],
        },
        { label: "Status", key: ["UMstatus", "status", "result"] },
        { label: "Authorization", key: ["UMauthCode", "authCode"] },
        { label: "Amount", key: ["UMamount", "amount"] },
        { label: "Card Type", key: ["UMcardType", "cardType", "type"] },
        {
          label: "Masked Card",
          key: ["UMmaskedCardNum", "maskedCardNum", "card"],
        },
        { label: "AVS Result", key: ["UMavsResult", "avsResult"] },
        { label: "CVV Result", key: ["UMcvv2Result", "cvvResult"] },
      ];

      keyFields.forEach(({ label, key }) => {
        const value = key.map((k) => data[k]).find((v) => v);
        if (value) {
          html += `<div class="result-item"><span class="result-label">${label}:</span><span class="result-value">${value}</span></div>`;
        }
      });

      html += `
        <details style="margin-top: 12px;">
          <summary style="cursor: pointer; color: #64748b; font-size: 12px;">View Raw Response</summary>
          <pre style="background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 11px; overflow-x: auto; margin-top: 6px;">${JSON.stringify(
            data,
            null,
            2
          )}</pre>
        </details>
      `;
    }

    return html || "<p>No data returned</p>";
  }

  function formatTokenTransactionError(result) {
    return `
      <div class="result-item">
        <span class="result-label">Error:</span>
        <span class="result-value" style="color: #dc2626;">${
          result.error || "Transaction failed"
        }</span>
      </div>
      ${
        result.rawResponse
          ? `<pre style="background: #fef2f2; padding: 10px; border-radius: 6px; font-size: 11px; margin-top: 8px;">${result.rawResponse}</pre>`
          : ""
      }
    `;
  }

  // ==========================================
  // PAYJS TRANSACTION PROCESSING
  // ==========================================
  const paymentForm = document.getElementById("paymentForm");
  const submitBtn = document.getElementById("submitBtn");
  const transactionResultsPanel = document.getElementById(
    "transactionResultsPanel"
  );

  if (!paymentForm) {
    console.error("Payment form not found!");
    return;
  }

  console.log("PayJS form initialized successfully");

  paymentForm.addEventListener("submit", function (e) {
    e.preventDefault();
    e.stopPropagation();

    console.log("PayJS form submitted - preventDefault called");
    
    // Check if PayJS was initialized
    if (!client || !paymentCard) {
      let errorContainer = document.getElementById("paymentCardErrorContainer");
      if (errorContainer) {
        errorContainer.textContent = "PayJS library not loaded. Please refresh the page.";
      }
      console.error("PayJS not initialized - cannot process payment");
      return;
    }
    
    setLoading(true);

    // Clear any previous errors
    let errorContainer = document.getElementById("paymentCardErrorContainer");
    errorContainer.textContent = "";

    // Create a payment key from the Pay.js card entry
    client
      .getPaymentKey(paymentCard)
      .then((result) => {
        if (result.error) {
          errorContainer.textContent = result.error.message;
          setLoading(false);
        } else {
          console.log("Payment key generated:", result);
          tokenHandler(result);
        }
      })
      .catch((err) => {
        console.error("Error getting payment key:", err);
        errorContainer.textContent =
          "Failed to process card. Please try again.";
        setLoading(false);
      });
  });

  async function tokenHandler(paymentKey) {
    try {
      console.log("Processing payment with payment key...");

      const formData = new FormData(paymentForm);
      const paymentData = {
        paymentKey: paymentKey,
        command: formData.get("command") || "sale",
        amount: parseFloat(formData.get("amount")),
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        email: formData.get("email"),
        address: formData.get("address"),
        city: formData.get("city"),
        state: formData.get("state"),
        zipCode: formData.get("zipCode"),
        phone: formData.get("phone") || "",
        company: formData.get("company") || "",
        country: "US",
        currency: "USD",
      };

      // Add optional parameters if provided
      const optionalFields = ["invoice", "orderId", "orderDescription"];
      optionalFields.forEach((field) => {
        const value = formData.get(field);
        if (value) {
          paymentData[field] = value;
        }
      });

      // Add auto-generated order ID if not provided
      if (!paymentData.orderId) {
        paymentData.orderId = `ORDER-${Date.now()}`;
      }
      if (!paymentData.orderDescription) {
        paymentData.orderDescription = "Online Payment";
      }

      console.log("Payment data:", paymentData);

      const response = await fetch("/api/UsaEPay/sale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();
      showResults(result);
    } catch (error) {
      console.error("Error:", error);
      showError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function setLoading(loading) {
    if (loading) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing...";
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = "Process Payment";
    }
  }

  function showResults(result) {
    if (result.success) {
      showTransactionResults(
        "Payment Successful",
        formatTransactionResponse(result),
        true
      );
    } else {
      showTransactionResults(
        "Payment Failed",
        formatTransactionError(result),
        false
      );
    }
  }

  function showError(message) {
    showTransactionResults(
      "Error",
      `<div class="result-item">
        <span class="result-label">Error Message:</span>
        <span class="result-value status-error">${message}</span>
      </div>`,
      false
    );
  }

  function showTransactionResults(title, content, isSuccess) {
    const colors = {
      success: { bg: "#f0fdf4", border: "#22c55e", title: "#166534" },
      error: { bg: "#fef2f2", border: "#ef4444", title: "#991b1b" },
    };
    const c = isSuccess ? colors.success : colors.error;

    transactionResultsPanel.classList.add("has-results");
    transactionResultsPanel.innerHTML = `
      <div style="border-left: 4px solid ${c.border}; padding-left: 16px;">
        <h3 style="color: ${c.title}; margin-bottom: 16px; font-size: 18px;">${title}</h3>
        <div>${content}</div>
      </div>
    `;
  }

  function formatTransactionResponse(result) {
    let html = "";

    html += `
      <div class="result-item">
        <span class="result-label">Status:</span>
        <span class="result-value status-success">Success</span>
      </div>
    `;

    if (result.statusCode) {
      html += `
        <div class="result-item">
          <span class="result-label">HTTP Status:</span>
          <span class="result-value">${result.statusCode}</span>
        </div>
      `;
    }

    if (result.data) {
      try {
        const transactionData =
          typeof result.data === "string"
            ? JSON.parse(result.data)
            : result.data;

        const keyFields = {
          "Transaction ID":
            transactionData.UMrefNum ||
            transactionData.refNum ||
            transactionData.transactionId,
          Amount: transactionData.amount || transactionData.UMamount,
          "Card Last 4": transactionData.UMcard || transactionData.card,
          Authorization: transactionData.UMauthCode || transactionData.authCode,
          "AVS Result":
            transactionData.UMavsResult || transactionData.avsResult,
          "CVV Result":
            transactionData.UMcvv2Result || transactionData.cvvResult,
        };

        for (const [label, value] of Object.entries(keyFields)) {
          if (value) {
            html += `
              <div class="result-item">
                <span class="result-label">${label}:</span>
                <span class="result-value">${value}</span>
              </div>
            `;
          }
        }

        if (result.rawResponse || result.data) {
          html += `
            <div style="margin-top: 1rem;">
              <details>
                <summary style="cursor: pointer; font-weight: 600; margin-bottom: 0.5rem;">View Raw Response</summary>
                <pre style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; margin-top: 8px;">${
                  result.rawResponse || JSON.stringify(transactionData, null, 2)
                }</pre>
              </details>
            </div>
          `;
        }
      } catch (e) {
        html += `
          <div class="result-item">
            <span class="result-label">Response:</span>
            <span class="result-value">See raw response below</span>
          </div>
          <pre style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; margin-top: 8px;">${result.data}</pre>
        `;
      }
    }

    return html;
  }

  function formatTransactionError(result) {
    let html = `
      <div class="result-item">
        <span class="result-label">Status:</span>
        <span class="result-value status-error">Failed</span>
      </div>
    `;

    if (result.statusCode) {
      html += `
        <div class="result-item">
          <span class="result-label">HTTP Status:</span>
          <span class="result-value">${result.statusCode}</span>
        </div>
      `;
    }

    const errorMsg = result.data?.UMerror || result.error || "Payment failed";
    html += `
      <div class="result-item">
        <span class="result-label">Error Message:</span>
        <span class="result-value status-error">${errorMsg}</span>
      </div>
    `;

    if (result.details) {
      html += `
        <div class="result-item">
          <span class="result-label">Details:</span>
          <span class="result-value">${result.details}</span>
        </div>
      `;
    }

    if (result.rawResponse) {
      html += `
        <div style="margin-top: 1rem;">
          <div class="result-label" style="display: block; margin-bottom: 0.5rem;">Raw Response:</div>
          <pre style="background: #fef2f2; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto;">${result.rawResponse}</pre>
        </div>
      `;
    }

    return html;
  }

  // ==========================================
  // QUERY TRANSACTION
  // ==========================================
  const queryField = document.getElementById("queryField");
  const queryButton = document.getElementById("queryButton");
  const queryResultsPanel = document.getElementById("queryResultsPanel");

  queryButton.addEventListener("click", async function () {
    console.log("Query button clicked");
    const transactionKey = queryField.value.trim();

    if (!transactionKey) {
      console.error("Transaction key is required");
      showQueryResults("Error", "Please enter a transaction key", false);
      return;
    }

    showQueryResults("Loading...", "Querying transaction...", true);

    try {
      console.log("Querying transaction:", transactionKey);
      const response = await fetch(`/api/UsaEPay/query/${transactionKey}`);

      if (!response.ok) {
        console.error("HTTP Error:", response.status, response.statusText);
      }

      const result = await response.json();
      console.log("Query response:", result);

      if (result.success) {
        showQueryResults(
          `Transaction Found - ${transactionKey}`,
          formatQueryResponse(result),
          true
        );
      } else {
        showQueryResults(
          `Query Failed - ${transactionKey}`,
          formatErrorResponse(result),
          false
        );
      }
    } catch (error) {
      console.error("Query error:", error);
      showQueryResults(
        "Network Error",
        `Failed to connect to server: ${error.message}`,
        false
      );
    }
  });

  queryField.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      queryButton.click();
    }
  });

  function showQueryResults(title, content, isSuccess) {
    const colors = {
      success: { bg: "#f0fdf4", border: "#22c55e", title: "#166534" },
      error: { bg: "#fef2f2", border: "#ef4444", title: "#991b1b" },
    };
    const c = isSuccess ? colors.success : colors.error;

    queryResultsPanel.classList.add("has-results");
    queryResultsPanel.innerHTML = `
      <div style="border-left: 4px solid ${c.border}; padding-left: 16px;">
        <h3 style="color: ${c.title}; margin-bottom: 16px; font-size: 18px;">${title}</h3>
        <div>${content}</div>
      </div>
    `;
  }

  function formatQueryResponse(result) {
    let html = `
      <div class="result-item">
        <span class="result-label">Status Code:</span>
        <span class="result-value">${result.statusCode}</span>
      </div>
      <div class="result-item">
        <span class="result-label">Transaction Key:</span>
        <span class="result-value">${result.transactionKey}</span>
      </div>
    `;

    if (result.data) {
      try {
        const transactionData =
          typeof result.data === "string"
            ? JSON.parse(result.data)
            : result.data;

        html += `<div style="margin: 1rem 0; font-weight: 600;">Transaction Details:</div>`;

        if (typeof transactionData === "object") {
          for (const [key, value] of Object.entries(transactionData)) {
            html += `
              <div class="result-item">
                <span class="result-label">${key}:</span>
                <span class="result-value">${value}</span>
              </div>
            `;
          }
        } else {
          html += `<pre style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto;">${transactionData}</pre>`;
        }
      } catch (e) {
        html += `
          <div style="margin: 1rem 0; font-weight: 600;">Raw Response:</div>
          <pre style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto;">${result.data}</pre>
        `;
      }
    }

    return html;
  }

  function formatErrorResponse(result) {
    let html = `
      <div class="result-item">
        <span class="result-label">Error:</span>
        <span class="result-value status-error">${result.error}</span>
      </div>
      <div class="result-item">
        <span class="result-label">Status Code:</span>
        <span class="result-value">${result.statusCode}</span>
      </div>
    `;

    if (result.rawResponse) {
      html += `
        <div style="margin: 1rem 0; font-weight: 600;">Raw Response:</div>
        <pre style="background: #fef2f2; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto;">${result.rawResponse}</pre>
      `;
    }

    return html;
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  
  // Format card number with spaces (REST API section)
  const restCardNumber = document.getElementById("restCardNumber");
  if (restCardNumber) {
    restCardNumber.addEventListener("input", function (e) {
      let value = e.target.value.replace(/\s/g, "");
      let formatted = value.replace(/(\d{4})(?=\d)/g, "$1 ");
      e.target.value = formatted;
    });
  }
});
