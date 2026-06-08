// USAePay SOAP API JavaScript
document.addEventListener("DOMContentLoaded", function () {
  console.log("SOAP API JavaScript loaded");

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

  initializeCollapsible("soapOptionalHeader", "soapOptionalContent");

  // ==========================================
  // SOAP TRANSACTION
  // ==========================================
  const soapApiForm = document.getElementById("soapApiForm");
  const soapApiBtn = document.getElementById("soapApiBtn");
  const soapApiResultsPanel = document.getElementById("soapApiResultsPanel");

  if (soapApiForm) {
    console.log("SOAP API form found, adding event listener");
    soapApiForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("SOAP API form submitted");

      try {
        soapApiBtn.disabled = true;
        soapApiBtn.textContent = "Processing...";

        const formData = new FormData(soapApiForm);
        const soapApiData = {
          transactionType: formData.get("transactionType"),
          amount: parseFloat(formData.get("amount")),
          cardholder: formData.get("cardholder"),
          cardNumber: formData.get("cardNumber"),
          expiration: formData.get("expiration"),
          cvv: formData.get("cvv"),
          saveCard: document.getElementById("soapSaveCard").checked,
        };

        // Add optional parameters if provided
        const optionalFields = ["invoice", "orderId", "description"];
        optionalFields.forEach((field) => {
          const value = formData.get(field);
          if (value) {
            soapApiData[field] = value;
          }
        });

        console.log("SOAP API data:", soapApiData);

        const response = await fetch("/api/UsaEPaySOAP/run-sale", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(soapApiData),
        });
        const result = await response.json();
        console.log("SOAP API response:", result);

        // Check resultCode: "A" = Approved, "D" = Declined, "E" = Error
        if (result.resultCode === "A") {
          showSoapApiResults(
            "✅ Transaction Approved",
            formatSoapApiResponse(result),
            "success"
          );
        } else if (result.resultCode === "D") {
          showSoapApiResults(
            "❌ Transaction Declined",
            formatSoapApiError(result),
            "error"
          );
        } else {
          showSoapApiResults(
            "⚠️ Transaction Error",
            formatSoapApiError(result),
            "error"
          );
        }
      } catch (error) {
        console.error("SOAP API error:", error);
        showSoapApiResults("Error", `Network error: ${error.message}`, "error");
      } finally {
        soapApiBtn.disabled = false;
        soapApiBtn.textContent = "Run SOAP Transaction";
      }
    });
  }

  function showSoapApiResults(title, content, type) {
    const colors = {
      success: { bg: "#f0fdf4", border: "#22c55e", title: "#166534" },
      error: { bg: "#fef2f2", border: "#ef4444", title: "#991b1b" },
    };
    const c = type === "success" ? colors.success : colors.error;

    soapApiResultsPanel.classList.add("has-results");
    soapApiResultsPanel.innerHTML = `
      <div style="border-left: 4px solid ${c.border}; padding-left: 16px;">
        <h3 style="color: ${c.title}; margin-bottom: 16px; font-size: 18px;">${title}</h3>
        <div>${content}</div>
      </div>
    `;
  }

  function formatSoapApiResponse(result) {
    let html = '<div class="result-details">';

    if (result.result) {
      html += `<div class="result-item">
        <span class="result-label">Status:</span>
        <span class="result-value status-success">${result.result}</span>
      </div>`;
    }

    if (result.transKey) {
      html += `<div class="result-item">
        <span class="result-label">Transaction Key:</span>
        <span class="result-value"><strong>${result.transKey}</strong></span>
      </div>`;
    }

    if (result.refNum) {
      html += `<div class="result-item">
        <span class="result-label">Reference Number:</span>
        <span class="result-value">${result.refNum}</span>
      </div>`;
    }

    if (result.authCode && result.authCode !== "000000") {
      html += `<div class="result-item">
        <span class="result-label">Auth Code:</span>
        <span class="result-value">${result.authCode}</span>
      </div>`;
    }

    if (result.authAmount) {
      html += `<div class="result-item">
        <span class="result-label">Amount:</span>
        <span class="result-value">$${result.authAmount.toFixed(2)}</span>
      </div>`;
    }

    if (result.batchRefNum) {
      html += `<div class="result-item">
        <span class="result-label">Batch Ref:</span>
        <span class="result-value">${result.batchRefNum}</span>
      </div>`;
    }

    if (result.avsResult) {
      html += `<div class="result-item">
        <span class="result-label">AVS Result:</span>
        <span class="result-value">${result.avsResult}</span>
      </div>`;
    }

    if (result.cardCodeResult) {
      html += `<div class="result-item">
        <span class="result-label">CVV Result:</span>
        <span class="result-value">${result.cardCodeResult}</span>
      </div>`;
    }

    if (result.cardLevelResult) {
      html += `<div class="result-item">
        <span class="result-label">Card Level:</span>
        <span class="result-value">${result.cardLevelResult}</span>
      </div>`;
    }

    if (result.cardRef) {
      html += `<div class="result-item" style="background: #fef9c3; padding: 10px; border-left: 4px solid #eab308; margin-top: 8px;">
        <span class="result-label">💾 Card Token Saved:</span>
        <span class="result-value"><strong>${result.cardRef}</strong></span>
      </div>`;
    }

    html += "</div>";
    return html;
  }

  function formatSoapApiError(result) {
    let html = '<div class="result-details">';

    if (result.result) {
      html += `<div class="result-item">
        <span class="result-label">Status:</span>
        <span class="result-value status-error">${result.result}</span>
      </div>`;
    }

    if (result.error && result.error !== "Approved") {
      html += `<div class="result-item">
        <span class="result-label">Error Message:</span>
        <span class="result-value status-error">${result.error}</span>
      </div>`;
    }

    if (result.errorCode && result.errorCode !== "0") {
      html += `<div class="result-item">
        <span class="result-label">Error Code:</span>
        <span class="result-value">${result.errorCode}</span>
      </div>`;
    }

    if (result.transKey) {
      html += `<div class="result-item">
        <span class="result-label">Transaction Key:</span>
        <span class="result-value">${result.transKey}</span>
      </div>`;
    }

    if (result.refNum) {
      html += `<div class="result-item">
        <span class="result-label">Reference Number:</span>
        <span class="result-value">${result.refNum}</span>
      </div>`;
    }

    html += "</div>";
    return html;
  }

  // ==========================================
  // TRANSACTION DETAILS
  // ==========================================
  const detailsTransactionKey = document.getElementById("detailsTransactionKey");
  const detailsButton = document.getElementById("detailsButton");
  const detailsResultsPanel = document.getElementById("detailsResultsPanel");

  if (detailsButton) {
    detailsButton.addEventListener("click", async function () {
      console.log("Details button clicked");
      const transactionKey = detailsTransactionKey.value.trim();

      if (!transactionKey) {
        console.error("Transaction key is required");
        showDetailsResults("Error", "Please enter a transaction key", false);
        return;
      }

      detailsButton.disabled = true;
      detailsButton.textContent = "Loading...";
      showDetailsResults("Loading...", "Retrieving transaction details...", true);

      try {
        console.log("Getting transaction details:", transactionKey);
        const response = await fetch(
          `/api/UsaEPaySOAP/transaction-details/${encodeURIComponent(transactionKey)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("HTTP Error:", response.status, errorData);
          showDetailsResults(
            "Error",
            errorData.error || "Failed to retrieve transaction details",
            false
          );
          return;
        }

        const result = await response.json();
        console.log("Transaction details response:", result);

        showDetailsResults(
          `Transaction Details - ${transactionKey}`,
          formatDetailsResponse(result),
          true
        );
      } catch (error) {
        console.error("Details error:", error);
        showDetailsResults(
          "Network Error",
          `Failed to connect to server: ${error.message}`,
          false
        );
      } finally {
        detailsButton.disabled = false;
        detailsButton.textContent = "Get Transaction Details";
      }
    });

    detailsTransactionKey.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        detailsButton.click();
      }
    });
  }

  function showDetailsResults(title, content, isSuccess) {
    const colors = {
      success: { bg: "#f0fdf4", border: "#22c55e", title: "#166534" },
      error: { bg: "#fef2f2", border: "#ef4444", title: "#991b1b" },
    };
    const c = isSuccess ? colors.success : colors.error;

    detailsResultsPanel.classList.add("has-results");
    detailsResultsPanel.innerHTML = `
      <div style="border-left: 4px solid ${c.border}; padding-left: 16px;">
        <h3 style="color: ${c.title}; margin-bottom: 16px; font-size: 18px;">${title}</h3>
        <div>${content}</div>
      </div>
    `;
  }

  function formatDetailsResponse(result) {
    let html = '<div class="result-details">';

    // Transaction Status
    if (result.status) {
      const statusClass = result.status.toLowerCase().includes('settled') || 
                          result.status.toLowerCase().includes('pending') ? 
                          'status-success' : 'status-error';
      html += `<div class="result-item">
        <span class="result-label">Status:</span>
        <span class="result-value ${statusClass}">${result.status}</span>
      </div>`;
    }

    // Transaction Key
    if (result.key) {
      html += `<div class="result-item">
        <span class="result-label">Transaction Key:</span>
        <span class="result-value"><strong>${result.key}</strong></span>
      </div>`;
    }

    // Reference Number
    if (result.refNum) {
      html += `<div class="result-item">
        <span class="result-label">Reference Number:</span>
        <span class="result-value">${result.refNum}</span>
      </div>`;
    }

    // Amount
    if (result.amount !== undefined && result.amount !== null) {
      html += `<div class="result-item">
        <span class="result-label">Amount:</span>
        <span class="result-value">$${parseFloat(result.amount).toFixed(2)}</span>
      </div>`;
    }

    // Authorization Code
    if (result.authCode) {
      html += `<div class="result-item">
        <span class="result-label">Auth Code:</span>
        <span class="result-value">${result.authCode}</span>
      </div>`;
    }

    // Card Information
    if (result.cardType) {
      html += `<div class="result-item">
        <span class="result-label">Card Type:</span>
        <span class="result-value">${result.cardType}</span>
      </div>`;
    }

    if (result.cardNumber) {
      html += `<div class="result-item">
        <span class="result-label">Card Number:</span>
        <span class="result-value">${result.cardNumber}</span>
      </div>`;
    }

    // Billing Information
    if (result.billingFirstName || result.billingLastName) {
      html += `<div class="section-divider" style="margin: 16px 0;">Billing Information</div>`;
      
      if (result.billingFirstName || result.billingLastName) {
        const fullName = [result.billingFirstName, result.billingLastName].filter(Boolean).join(' ');
        html += `<div class="result-item">
          <span class="result-label">Cardholder:</span>
          <span class="result-value">${fullName}</span>
        </div>`;
      }
    }

    if (result.billingAddress) {
      html += `<div class="result-item">
        <span class="result-label">Address:</span>
        <span class="result-value">${result.billingAddress}</span>
      </div>`;
    }

    if (result.billingCity || result.billingState || result.billingZip) {
      const location = [result.billingCity, result.billingState, result.billingZip].filter(Boolean).join(', ');
      html += `<div class="result-item">
        <span class="result-label">Location:</span>
        <span class="result-value">${location}</span>
      </div>`;
    }

    // AVS and CVV Results
    if (result.avsResult || result.cvv2Result) {
      html += `<div class="section-divider" style="margin: 16px 0;">Verification Results</div>`;
      
      if (result.avsResult) {
        html += `<div class="result-item">
          <span class="result-label">AVS Result:</span>
          <span class="result-value">${result.avsResult}</span>
        </div>`;
      }

      if (result.cvv2Result) {
        html += `<div class="result-item">
          <span class="result-label">CVV2 Result:</span>
          <span class="result-value">${result.cvv2Result}</span>
        </div>`;
      }
    }

    // Transaction Details
    if (result.description || result.invoice || result.orderID) {
      html += `<div class="section-divider" style="margin: 16px 0;">Transaction Details</div>`;
      
      if (result.description) {
        html += `<div class="result-item">
          <span class="result-label">Description:</span>
          <span class="result-value">${result.description}</span>
        </div>`;
      }

      if (result.invoice) {
        html += `<div class="result-item">
          <span class="result-label">Invoice:</span>
          <span class="result-value">${result.invoice}</span>
        </div>`;
      }

      if (result.orderID) {
        html += `<div class="result-item">
          <span class="result-label">Order ID:</span>
          <span class="result-value">${result.orderID}</span>
        </div>`;
      }
    }

    // Timestamps
    if (result.dateTime || result.dateTimeCreated) {
      html += `<div class="section-divider" style="margin: 16px 0;">Timestamps</div>`;
      
      if (result.dateTimeCreated) {
        html += `<div class="result-item">
          <span class="result-label">Created:</span>
          <span class="result-value">${new Date(result.dateTimeCreated).toLocaleString()}</span>
        </div>`;
      }

      if (result.dateTime) {
        html += `<div class="result-item">
          <span class="result-label">Processed:</span>
          <span class="result-value">${new Date(result.dateTime).toLocaleString()}</span>
        </div>`;
      }
    }

    // Raw Response (collapsible)
    html += `
      <details style="margin-top: 16px;">
        <summary style="cursor: pointer; color: #64748b; font-size: 13px; font-weight: 600;">View Raw Response</summary>
        <pre style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; margin-top: 8px;">${JSON.stringify(
          result,
          null,
          2
        )}</pre>
      </details>
    `;

    html += "</div>";
    return html;
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  // Format card number with spaces
  const soapCardNumber = document.getElementById("soapCardNumber");
  if (soapCardNumber) {
    soapCardNumber.addEventListener("input", function (e) {
      let value = e.target.value.replace(/\s/g, "");
      let formatted = value.replace(/(\d{4})(?=\d)/g, "$1 ");
      e.target.value = formatted;
    });
  }
});







