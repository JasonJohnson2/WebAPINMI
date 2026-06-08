import "https://esm.sh/@nmipayments/nmi-reporting@latest";

const API_KEY = "v4_secret_56rDaH4sx6Xr2xwFvXy2g3gMm5rVuD97";
const REPORTING_SERVICE_URL = "https://embed-reporting.iriscrm.com/api/v1";

const eventLog = document.getElementById("eventLog");
const statusBadge = document.getElementById("connectionStatus");
const container = document.getElementById("transaction-reporting-container");

function logEvent(type, message) {
  const time = new Date().toLocaleTimeString("en-US", { hour12: false });
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `<span class="log-time">${time}</span><span class="log-type">${type}</span>${message}`;
  eventLog.appendChild(entry);
  eventLog.scrollTop = eventLog.scrollHeight;
}

function setStatus(state, text) {
  statusBadge.className = `status-badge ${state}`;
  statusBadge.innerHTML = `<i class="fas fa-circle" style="font-size: 0.5rem"></i> ${text}`;
}

async function fetchSessionId(merchantId, environment) {
  logEvent("SESSION", "Requesting session token...");
  setStatus("loading", "Connecting...");

  const response = await fetch("/api/reporting/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: API_KEY,
      merchant_id: merchantId,
      environment: environment,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.message || response.statusText;
    logEvent("ERROR", `Session failed: ${msg}`);
    setStatus("disconnected", "Session Failed");
    throw new Error(msg);
  }

  const data = await response.json();
  logEvent("SESSION", `Token received, expires at ${new Date(data.expiresAt).toLocaleTimeString()}`);
  setStatus("connected", "Connected");

  return {
    sessionToken: data.sessionToken,
    expiresAt: data.expiresAt,
  };
}

function initWidget(merchantId, environment, pageSize, useDemoData) {
  container.innerHTML = "";

  const widget = document.createElement("nmi-transaction-reporting");

  widget.fetchSessionId = () => fetchSessionId(merchantId, environment);
  widget.reportingServiceUrl = REPORTING_SERVICE_URL;
  widget.pagination = { pageSize: parseInt(pageSize), currentPage: 1 };

  if (useDemoData) {
    widget.demoSet = "gateway";
    logEvent("INFO", "Using demo data set (gateway)");
    setStatus("connected", "Demo Mode");
  }

  widget.onTransactionsLoaded = (transactions) => {
    logEvent("DATA", `Loaded ${transactions.length} transactions`);
  };

  widget.onError = (error) => {
    logEvent("ERROR", `${error.type}: ${error.message}`);
    setStatus("disconnected", "Error");
  };

  widget.onRowClick = (transaction) => {
    logEvent("CLICK", `Row clicked: ${transaction.id} — $${transaction.amount}`);
  };

  widget.onFilterChange = (filters) => {
    logEvent("FILTER", `Filters changed: ${JSON.stringify(filters)}`);
  };

  widget.onSortChange = (sort) => {
    logEvent("SORT", `Sort: ${sort.field} ${sort.direction}`);
  };

  widget.onPaginationChange = (pagination) => {
    logEvent("PAGE", `Page ${pagination.currentPage} of ${pagination.lastPage} (${pagination.totalCount} total)`);
  };

  widget.onExport = (data) => {
    logEvent("EXPORT", `Export ready: ${data.format} — ${data.fileSize}`);
  };

  container.appendChild(widget);
  logEvent("INFO", "Transaction reporting widget mounted");
}

document.getElementById("configForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const merchantId = document.getElementById("merchantId").value.trim();
  const environment = document.getElementById("environment").value;
  const pageSize = document.getElementById("pageSize").value;
  const useDemoData = document.getElementById("useDemoData").checked;

  if (!merchantId && !useDemoData) {
    logEvent("ERROR", "Merchant ID is required when not using demo data");
    return;
  }

  logEvent("INFO", `Initializing widget — Merchant: ${merchantId || "N/A"}, Env: ${environment}, PageSize: ${pageSize}`);
  initWidget(merchantId, environment, pageSize, useDemoData);
});
