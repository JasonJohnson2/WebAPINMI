/**
 * Cloud POS System JavaScript
 * Handles device management, transaction processing, and UI interactions
 * for the Customer Present Cloud API integration
 */

class CloudPOSSystem {
  constructor() {
    console.log("CloudPOSSystem constructor called");
    this.securityKey = "";
    this.selectedDevice = null;
    this.devices = [];
    this.transactionHistory = [];
    this.isConfigured = false;
    this.pollingInterval = null;
    this.currentAsyncTransactionId = null;
    this.currentAsyncStatusGuid = null;
    this.currentAsyncFormData = null; // Store original form data for async transactions
    this.deviceRefreshInterval = null; // Store the device refresh interval ID
    this.isRefreshingDevices = false; // Flag to prevent multiple simultaneous refreshes
    this.autoRefreshEnabled = false; // Auto-refresh disabled by default

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadNavbar();
    this.generateOrderId();
    this.loadFromLocalStorage();
  }

  bindEvents() {
    // Security configuration
    $("#securityForm").on("submit", (e) => this.handleSecurityConfig(e));
    $("#toggleKey").on("click", () => this.togglePasswordVisibility());

    // Device management
    $("#refreshDevices").on("click", () => this.refreshDevices());
    $("#autoRefreshToggle").on("change", (e) =>
      this.toggleAutoRefresh(e.target.checked)
    );

    // Transaction processing
    $("#transactionForm").on("submit", (e) => this.handleTransaction(e));
    $("#clearForm").on("click", () => this.clearTransactionForm());
    $("#checkStatus").on("click", () => this.checkAsyncStatus());

    // History and refresh
    $("#refreshTransactions").on("click", () => this.loadTransactionHistory());

    // Modal events
    $("#selectDeviceBtn").on("click", () => this.selectDeviceFromModal());

    // Form changes
    $('input[name="processingMode"]').on("change", () =>
      this.updateProcessingMode()
    );
    $("#selectedDevice").on("change", () => this.onDeviceSelectionChange());

    // POI Device Prompts events
    $("#enablePoiPrompts").on("change", (e) =>
      this.togglePoiPrompts(e.target.checked)
    );
    $("#configurePoiPrompts").on("click", () =>
      this.showPoiPromptsConfiguration()
    );
    $("#poi_prompt_tip").on("change", (e) =>
      this.handleTipPromptChange(e.target.checked)
    );
    $('input[name="tipType"]').on("change", (e) =>
      this.handleTipTypeChange(e.target.value)
    );
    $("#poi_enable_keyed").on("change", (e) =>
      this.handleKeyedEnableChange(e.target.checked)
    );
    $("#poi_require_keyed").on("change", (e) =>
      this.handleKeyedRequireChange(e.target.checked)
    );
    $("#clearPoiPrompts").on("click", () => this.clearPoiPrompts());
    $("#presetBasicTip").on("click", () => this.setBasicTipPreset());
    $("#presetAdvancedPrompts").on("click", () =>
      this.setAdvancedPromptsPreset()
    );

    // Auto-refresh devices every 30 seconds when configured
    // Clear any existing interval first
    if (this.deviceRefreshInterval) {
      clearInterval(this.deviceRefreshInterval);
    }

    this.deviceRefreshInterval = setInterval(() => {
      if (
        this.isConfigured &&
        !this.isRefreshingDevices &&
        this.autoRefreshEnabled
      ) {
        console.log("Auto-refresh triggering device refresh");
        this.refreshDevices(true); // Silent refresh
      }
    }, 30000);
  }

  async loadNavbar() {
    try {
      const response = await fetch("navbar.html");
      const navbarHtml = await response.text();
      $("#mainNavBar").html(navbarHtml);
    } catch (error) {
      console.warn("Could not load navbar:", error);
    }
  }

  generateOrderId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    $("#orderid").val(`CloudPOS-${timestamp}-${random}`);
  }

  loadFromLocalStorage() {
    const savedKey = localStorage.getItem("cloudPOS_securityKey");
    const savedDevice = localStorage.getItem("cloudPOS_selectedDevice");
    const savedAutoRefresh = localStorage.getItem("cloudPOS_autoRefresh");

    if (savedKey) {
      $("#securityKey").val(savedKey);
      this.securityKey = savedKey;
      this.isConfigured = true;
      this.updateConfigStatus(
        "success",
        "Security key loaded from previous session"
      );
      this.refreshDevices();
    }

    if (savedDevice) {
      this.selectedDevice = JSON.parse(savedDevice);
    }

    // Load auto-refresh preference (defaults to false)
    this.autoRefreshEnabled = savedAutoRefresh === "true";
    $("#autoRefreshToggle").prop("checked", this.autoRefreshEnabled);

    // Initialize the UI label based on the loaded preference
    this.toggleAutoRefresh(this.autoRefreshEnabled);
  }

  saveToLocalStorage() {
    if (this.securityKey) {
      localStorage.setItem("cloudPOS_securityKey", this.securityKey);
    }
    if (this.selectedDevice) {
      localStorage.setItem(
        "cloudPOS_selectedDevice",
        JSON.stringify(this.selectedDevice)
      );
    }
    // Save auto-refresh preference
    localStorage.setItem(
      "cloudPOS_autoRefresh",
      this.autoRefreshEnabled.toString()
    );
  }

  togglePasswordVisibility() {
    const keyField = $("#securityKey");
    const toggleBtn = $("#toggleKey i");

    if (keyField.attr("type") === "password") {
      keyField.attr("type", "text");
      toggleBtn.removeClass("fa-eye").addClass("fa-eye-slash");
    } else {
      keyField.attr("type", "password");
      toggleBtn.removeClass("fa-eye-slash").addClass("fa-eye");
    }
  }

  async handleSecurityConfig(e) {
    e.preventDefault();

    const keyValue = $("#securityKey").val().trim();
    if (!keyValue) {
      this.updateConfigStatus("error", "Please enter a security key");
      return;
    }

    this.updateConfigStatus("info", "Validating security key...");
    $("#configureBtn")
      .prop("disabled", true)
      .html('<i class="fas fa-spinner fa-spin"></i> Configuring...');

    try {
      // Test the security key by attempting to discover devices
      const isValid = await this.validateSecurityKey(keyValue);

      if (isValid) {
        this.securityKey = keyValue;
        this.isConfigured = true;
        this.saveToLocalStorage();
        this.updateConfigStatus(
          "success",
          "Security key configured successfully"
        );
        await this.refreshDevices();
        this.enableTransactionForm();
      } else {
        this.updateConfigStatus(
          "error",
          "Invalid security key or network error"
        );
        this.isConfigured = false;
      }
    } catch (error) {
      console.error("Configuration error:", error);
      this.updateConfigStatus("error", "Failed to configure: " + error.message);
      this.isConfigured = false;
    } finally {
      $("#configureBtn")
        .prop("disabled", false)
        .html('<i class="fas fa-cog"></i> Configure');
    }
  }

  async validateSecurityKey(key) {
    try {
      // Create a test request to validate the security key
      const testData = {
        type: "device_status",
        security_key: key,
        response_method: "sync",
      };

      const response = await this.makeCloudAPIRequest(testData);
      return response && !response.includes("authentication failed");
    } catch (error) {
      console.error("Security key validation failed:", error);
      return false;
    }
  }

  updateConfigStatus(type, message) {
    const statusDiv = $("#configStatus");
    const iconMap = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle",
    };

    const html = `
            <div class="status-message status-${type} fade-in">
                <i class="fas ${iconMap[type]} me-2"></i>
                ${message}
            </div>
        `;

    statusDiv.html(html);
    setTimeout(() => statusDiv.find(".status-message").addClass("fade-in"), 10);
  }

  async refreshDevices(silent = false) {
    if (!this.isConfigured) return;

    // Prevent multiple simultaneous refresh calls
    if (this.isRefreshingDevices) {
      console.log("Device refresh already in progress, skipping...");
      return;
    }

    this.isRefreshingDevices = true;

    if (!silent) {
      $("#refreshDevices").html('<i class="fas fa-spinner fa-spin"></i>');
    }

    try {
      const devices = await this.discoverDevices();
      console.log(`Discovered ${devices.length} devices:`, devices);
      this.devices = devices;
      this.renderDeviceList();
      this.updateDeviceDropdown();
    } catch (error) {
      console.error("Failed to refresh devices:", error);
      if (!silent) {
        this.showError("Failed to refresh devices: " + error.message);
      }
    } finally {
      this.isRefreshingDevices = false;
      $("#refreshDevices").html('<i class="fas fa-sync-alt"></i>');
    }
  }

  toggleAutoRefresh(enabled) {
    console.log(`Auto-refresh ${enabled ? "enabled" : "disabled"}`);
    this.autoRefreshEnabled = enabled;

    // Save preference to localStorage
    localStorage.setItem("cloudPOS_autoRefresh", enabled.toString());

    // Update UI feedback
    const toggle = $("#autoRefreshToggle");
    const label = $("label[for='autoRefreshToggle']");

    if (enabled) {
      label.text("Auto-refresh (ON)");
      toggle.attr(
        "title",
        "Auto-refresh enabled - devices will refresh every 30 seconds"
      );
    } else {
      label.text("Auto-refresh (OFF)");
      toggle.attr(
        "title",
        "Auto-refresh disabled - click refresh button to update devices manually"
      );
    }
  }

  async discoverDevices() {
    try {
      // Call the real NMI device list API
      const response = await this.makeDeviceListAPIRequest();

      console.log("Raw API response:", response);
      console.log("Response type:", typeof response);
      console.log("Has poiDevices:", response && response.poiDevices);
      console.log(
        "poiDevices is array:",
        response && Array.isArray(response.poiDevices)
      );

      if (
        response &&
        response.poiDevices &&
        Array.isArray(response.poiDevices)
      ) {
        console.log(`Found ${response.poiDevices.length} devices from NMI API`);

        // Filter devices to only include those with registrationStatus = 'registered'
        console.log(
          "Before filtering - all devices:",
          response.poiDevices.map((d) => ({
            id: d.deviceId,
            nickname: d.deviceNickname,
            registrationStatus: d.registrationStatus,
          }))
        );

        const registeredDevices = response.poiDevices.filter(
          (device) =>
            device.registrationStatus &&
            device.registrationStatus.toLowerCase() === "registered"
        );

        console.log(
          "After filtering - registered devices:",
          registeredDevices.map((d) => ({
            id: d.deviceId,
            nickname: d.deviceNickname,
            registrationStatus: d.registrationStatus,
          }))
        );

        console.log(
          `Filtered to ${registeredDevices.length} registered devices`
        );

        // Parse real device response from NMI API
        return registeredDevices.map((device) => ({
          id: device.deviceId,
          name: device.deviceNickname || `${device.make} ${device.model}`,
          type: `${device.make} ${device.model}`,
          status: this.mapDeviceStatus(device.registrationStatus),
          location: "Unknown Location",
          capabilities: this.parseCapabilities([]),
          lastSeen:
            device.lastTransactionDate ||
            device.dateRegistered ||
            new Date().toISOString(),
          serialNumber: device.serialNumber,
          merchantId: "Unknown",
          make: device.make,
          model: device.model,
          registrationStatus: device.registrationStatus,
          dateRegistered: device.dateRegistered,
          dateDeregistered: device.dateDeregistered,
        }));
      }

      // No devices returned from API - return empty array instead of mock data
      console.log("No devices returned from API");
      return [];
    } catch (error) {
      console.error("Device discovery failed:", error);
      // Return empty array instead of mock devices when API fails
      return [];
    }
  }

  async makeDeviceListAPIRequest() {
    try {
      // Use the backend proxy endpoint to avoid CORS issues
      const response = await fetch(`/cloud/devices`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + this.securityKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonResponse = await response.json();
      console.log("JSON parsed response:", jsonResponse);
      return jsonResponse;
    } catch (error) {
      console.error("Device API call failed:", error);
      throw error;
    }
  }

  mapDeviceStatus(status) {
    if (!status) return "unknown";

    const statusMap = {
      active: "online",
      inactive: "offline",
      online: "online",
      offline: "offline",
      busy: "busy",
      processing: "busy",
      available: "online",
      unavailable: "offline",
      registered: "registered",
      deregistered: "offline",
    };

    return statusMap[status.toLowerCase()] || "unknown";
  }

  parseCapabilities(capabilities) {
    if (!capabilities) return ["contactless", "chip", "swipe"];

    if (typeof capabilities === "string") {
      return capabilities.split(",").map((cap) => cap.trim().toLowerCase());
    }

    if (Array.isArray(capabilities)) {
      return capabilities.map((cap) => cap.toLowerCase());
    }

    return ["contactless", "chip", "swipe"];
  }

  getMockDevices() {
    return [
      {
        id: "device_001",
        name: "Terminal #1 (Lane/3600)",
        type: "Lane/3600",
        status: "online",
        location: "Front Counter",
        serialNumber: "SN-001234",
        capabilities: ["contactless", "chip", "swipe", "pin"],
        lastSeen: new Date().toISOString(),
      },
      {
        id: "device_002",
        name: "Terminal #2 (Self/Series)",
        type: "Self/Series",
        status: "online",
        location: "Self-Service Kiosk",
        serialNumber: "SN-002345",
        capabilities: ["contactless", "chip", "swipe"],
        lastSeen: new Date(Date.now() - 60000).toISOString(),
      },
      {
        id: "device_003",
        name: "Mobile Device #1",
        type: "VP3350",
        status: "busy",
        location: "Mobile Station",
        serialNumber: "SN-003456",
        capabilities: ["contactless", "chip", "swipe", "pin"],
        lastSeen: new Date(Date.now() - 30000).toISOString(),
      },
    ];
  }

  renderDeviceList() {
    const container = $("#devicesList");
    console.log("renderDeviceList called with devices:", this.devices);
    console.log("devices.length:", this.devices.length);
    console.log(
      "Device registration statuses:",
      this.devices.map((d) => ({
        id: d.id,
        name: d.name,
        registrationStatus: d.registrationStatus,
      }))
    );

    if (this.devices.length === 0) {
      console.log("No devices to render, showing 'No devices found' message");
      container.html(`
                <div class="text-muted text-center py-3">
                    <i class="fas fa-search fa-2x mb-2"></i>
                    <p>No devices found</p>
                </div>
            `);
      return;
    }

    const devicesHtml = this.devices
      .map(
        (device) => `
            <div class="device-item ${
              this.selectedDevice?.id === device.id ? "selected" : ""
            }" 
                 data-device-id="${
                   device.id
                 }" onclick="cloudPOS.selectDevice('${device.id}')">
                <div class="device-name">${device.name}</div>
                <div class="device-info">
                    <span>
                        Serial Number: ${device.serialNumber || "Unknown"}
                    </span>
                    <span class="device-status ${device.status}">${
          device.status
        }</span>
                </div>
                <div class="device-capabilities mt-1">
                    ${device.capabilities
                      .map(
                        (cap) => `
                        <span class="badge bg-light text-dark me-1">${cap}</span>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `
      )
      .join("");

    container.html(devicesHtml);
  }

  updateDeviceDropdown() {
    const select = $("#selectedDevice");
    select.empty().append('<option value="">Select a device...</option>');

    console.log(
      "updateDeviceDropdown called with devices:",
      this.devices.map((d) => ({
        id: d.id,
        name: d.name,
        registrationStatus: d.registrationStatus,
      }))
    );

    this.devices.forEach((device) => {
      const option = `<option value="${device.id}" ${
        device.status === "offline" ? "disabled" : ""
      }>
                ${device.name} (${device.status})
            </option>`;
      select.append(option);
    });

    if (this.selectedDevice) {
      select.val(this.selectedDevice.id);
    }

    select.prop("disabled", this.devices.length === 0);
    this.updateTransactionButtonState();

    // Also populate standalone device dropdown
    this.updateStandaloneDeviceDropdown();
  }

  updateStandaloneDeviceDropdown() {
    const select = $("#standaloneDevice");
    if (select.length === 0) return; // Element doesn't exist

    select.empty().append('<option value="">Select a device...</option>');

    this.devices.forEach((device) => {
      const option = `<option value="${device.id}" ${
        device.status === "offline" ? "disabled" : ""
      }>
                ${device.name} (${device.status})
            </option>`;
      select.append(option);
    });

    select.prop("disabled", this.devices.length === 0);
  }

  selectDevice(deviceId) {
    const device = this.devices.find((d) => d.id === deviceId);
    if (!device || device.status === "offline") return;

    this.selectedDevice = device;
    this.saveToLocalStorage();
    this.renderDeviceList();
    this.updateDeviceDropdown();
    this.updateTransactionButtonState();

    // Show device details in modal
    this.showDeviceDetails(device);
  }

  showDeviceDetails(device) {
    const modalBody = $("#deviceModalBody");
    const lastSeen = new Date(device.lastSeen).toLocaleString();

    const html = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Device Information</h6>
                    <p><strong>Name:</strong> ${device.name}</p>
                    <p><strong>Type:</strong> ${device.type}</p>
                    <p><strong>Serial number:</strong> ${
                      device.serialNumber || "Unknown"
                    }</p>
                    <p><strong>Status:</strong> 
                        <span class="device-status ${device.status}">${
      device.status
    }</span>
                    </p>
                </div>
                <div class="col-md-6">
                    <h6>Capabilities</h6>
                    <div class="mb-3">
                        ${device.capabilities
                          .map(
                            (cap) => `
                            <span class="badge bg-primary me-1 mb-1">${cap}</span>
                        `
                          )
                          .join("")}
                    </div>
                    <p><small class="text-muted">Last seen: ${lastSeen}</small></p>
                </div>
            </div>
        `;

    modalBody.html(html);

    const modal = new bootstrap.Modal(document.getElementById("deviceModal"));
    modal.show();
  }

  selectDeviceFromModal() {
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("deviceModal")
    );
    modal.hide();
  }

  onDeviceSelectionChange() {
    const deviceId = $("#selectedDevice").val();
    if (deviceId) {
      const device = this.devices.find((d) => d.id === deviceId);
      if (device) {
        this.selectedDevice = device;
        this.saveToLocalStorage();
        this.renderDeviceList();
      }
    }
    this.updateTransactionButtonState();
  }

  enableTransactionForm() {
    $("#selectedDevice").prop("disabled", false);
    this.updateTransactionButtonState();
  }

  updateTransactionButtonState() {
    const hasDevice =
      this.selectedDevice && this.selectedDevice.status !== "offline";
    const hasAmount = parseFloat($("#amount").val()) > 0;
    const isConfigured = this.isConfigured;

    $("#processTransaction").prop(
      "disabled",
      !(hasDevice && hasAmount && isConfigured)
    );
  }

  updateProcessingMode() {
    const isAsync = $("#asynchronous").is(":checked");
    const statusCard = $("#statusCard");

    if (isAsync) {
      statusCard
        .find(".card-header h5")
        .html('<i class="fas fa-clock"></i> Asynchronous Transaction Status');
    } else {
      statusCard
        .find(".card-header h5")
        .html('<i class="fas fa-info-circle"></i> Transaction Status');
    }
  }

  async handleTransaction(e) {
    e.preventDefault();

    if (!this.selectedDevice) {
      this.showError("Please select a device first");
      return;
    }

    const formData = this.getTransactionFormData();
    if (!this.validateTransactionData(formData)) {
      return;
    }

    this.showTransactionStatus("info", "Initiating transaction...", true);
    $("#processTransaction")
      .prop("disabled", true)
      .html('<i class="fas fa-spinner fa-spin"></i> Processing...');

    try {
      const result = await this.processTransaction(formData);
      this.handleTransactionResult(result, formData);
    } catch (error) {
      console.error("Transaction error:", error);
      this.showTransactionStatus(
        "error",
        "Transaction failed: " + error.message
      );
    } finally {
      $("#processTransaction")
        .prop("disabled", false)
        .html('<i class="fas fa-play"></i> Process Transaction');
    }
  }

  getTransactionFormData() {
    const formData = {
      poi_device_id: this.selectedDevice.id, // NMI Customer-Present Cloud API requires poi_device_id
      type: $("#transactionType").val(),
      amount: $("#amount").val(),
      currency: $("#currency").val(),
      orderid: $("#orderid").val(),
      ponumber: $("#ponumber").val(),
      security_key: this.securityKey,
      response_method:
        $('input[name="processingMode"]:checked').val() === "asynchronous"
          ? "asynchronous"
          : "synchronous",
    };

    // Add POI Device Prompts if enabled
    if ($("#enablePoiPrompts").is(":checked")) {
      const poiPrompts = this.getPoiPromptsData();
      Object.assign(formData, poiPrompts);
    }

    return formData;
  }

  validateTransactionData(data) {
    if (!data.amount || parseFloat(data.amount) <= 0) {
      this.showError("Please enter a valid amount");
      return false;
    }

    if (!data.orderid) {
      this.showError("Order ID is required");
      return false;
    }

    if (!data.poi_device_id) {
      this.showError(
        "Device ID is required for Customer-Present Cloud transactions"
      );
      return false;
    }

    // Validate that the poi_device_id matches the selected device
    if (!this.selectedDevice || this.selectedDevice.id !== data.poi_device_id) {
      this.showError("Selected device ID does not match transaction data");
      return false;
    }

    // Validate POI Device Prompts if enabled
    if ($("#enablePoiPrompts").is(":checked")) {
      const poiPrompts = this.getPoiPromptsData();
      const poiErrors = this.validatePoiPromptsData(poiPrompts);

      if (poiErrors.length > 0) {
        this.showError(
          "POI Device Prompts validation failed: " + poiErrors.join(", ")
        );
        return false;
      }
    }

    return true;
  }

  async processTransaction(data) {
    // Add the device-specific parameters based on the selected device
    const deviceParams = this.getDeviceSpecificParams(data.payment_method);
    const transactionData = { ...data, ...deviceParams };

    console.log("Processing transaction with data:", transactionData);
    console.log("poi_device_id:", transactionData.poi_device_id);
    console.log("Selected device:", this.selectedDevice);

    const response = await this.makeCloudAPIRequest(transactionData);
    return this.parseTransactionResponse(response);
  }

  getDeviceSpecificParams(paymentMethod) {
    // Return device-specific parameters based on the payment method
    const params = {};

    return params;
  }

  async makeCloudAPIRequest(data) {
    const response = await fetch("/cloud", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  }

  async makeAsyncStatusRequest(
    asyncStatusGuid,
    responseMethod = "asynchronous"
  ) {
    // Use the backend proxy endpoint to avoid CORS issues
    let url = `/cloud/asyncstatus/${asyncStatusGuid}`;

    // Add query parameter if responseMethod is provided and not "asynchronous"
    if (responseMethod !== "asynchronous") {
      url += `?responseMethod=${responseMethod}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.securityKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  parseTransactionResponse(response) {
    // Parse the response from the payment gateway
    // This is a simplified parser - actual implementation would be more robust
    const lines = response.split("\n");
    const result = {};

    lines.forEach((line) => {
      const [key, value] = line.split(":").map((s) => s?.trim());
      if (key && value) {
        result[key.toLowerCase()] = value;
      }
    });

    console.log("Parsed transaction response:", result);
    return result;
  }

  handleTransactionResult(result, formData) {
    const isAsync = formData.response_method === "asynchronous";

    if (isAsync) {
      this.handleAsyncTransaction(result, formData);
      // Don't add to history yet - wait for interaction to complete
    } else {
      this.handleSyncTransaction(result, formData);
      // Add sync transactions to history immediately
      this.addToTransactionHistory(formData, result);
    }

    this.generateOrderId(); // Generate new order ID for next transaction
  }

  handleSyncTransaction(result, formData) {
    const response = result.response || "unknown";
    const authcode =
      result.authcode ||
      result.auth_code ||
      result.approval_code ||
      result.approval ||
      "";
    const transactionid =
      result.transactionid || result.transaction_id || result.id || "";

    let statusType, message;

    console.log("Handling sync transaction:", {
      response,
      authcode,
      transactionid,
      result,
    });

    if (response === "1" || response.toLowerCase() === "approved") {
      statusType = "success";
      message = `Transaction Approved!<br>
                      Auth Code: ${authcode}<br>
                      Transaction ID: ${transactionid}`;
    } else {
      statusType = "error";
      message = `Transaction Declined<br>
                      Response: ${response}<br>
                      ${result.responsetext || result.response_text || ""}`;
    }

    this.showTransactionStatus(statusType, message);
  }

  handleAsyncTransaction(result, formData) {
    this.currentAsyncTransactionId = result.transactionid || result.orderid;
    this.currentAsyncStatusGuid = result.async_status_guid;
    this.currentAsyncFormData = formData; // Store original form data for history when complete

    if (!this.currentAsyncStatusGuid) {
      this.showTransactionStatus(
        "error",
        "No async status GUID received. Cannot poll for status."
      );
      return;
    }

    this.showTransactionStatus(
      "info",
      `Asynchronous transaction initiated.<br>
             Transaction ID: ${this.currentAsyncTransactionId}<br>
             Async Status GUID: ${this.currentAsyncStatusGuid}<br>
             Please wait for device completion...`,
      false,
      true
    );

    // Start polling for status
    this.startAsyncStatusPolling();
  }

  startAsyncStatusPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    $("#asyncStatus").show();

    this.pollingInterval = setInterval(() => {
      this.checkAsyncStatus();
    }, 3000); // Poll every 3 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
        $("#asyncStatus").hide();
        this.showTransactionStatus(
          "warning",
          "Transaction status check timeout. Please check manually."
        );
      }
    }, 300000);
  }

  async checkAsyncStatus() {
    if (!this.currentAsyncStatusGuid) return;

    try {
      const result = await this.makeAsyncStatusRequest(
        this.currentAsyncStatusGuid
      );

      console.log("Async status check result:", result);

      // Check if interaction is complete based on asyncStatus field
      if (result.asyncStatus === "interactionComplete") {
        // Transaction completed
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
        $("#asyncStatus").hide();

        console.log("Interaction complete, stopping polling");

        // Convert JSON response to the format expected by handleSyncTransaction
        // The async response has a nested 'transaction' object with different field names
        const transaction = result.transaction || {};

        const formattedResult = {
          // Map async response fields to sync format
          response: this.mapAsyncApprovalToResponse(
            transaction.approval,
            transaction.success
          ),
          transactionid: transaction.id || this.currentAsyncTransactionId,
          orderid: transaction.orderid || this.currentAsyncTransactionId,
          response_code: transaction.response_code,
          authcode: transaction.authcode || transaction.approval_code,
          responsetext: transaction.responsetext || transaction.condition,
          // Include original async response data
          ...result,
          // Include transaction data at root level for compatibility
          ...transaction,
        };

        console.log(
          "Formatted async result for sync handling:",
          formattedResult
        );

        // Handle the completed transaction
        this.handleSyncTransaction(formattedResult, {
          processing_mode: "async",
        });

        // Now add to transaction history since interaction is complete
        // Use the stored original form data
        if (this.currentAsyncFormData) {
          this.addToTransactionHistory(
            this.currentAsyncFormData,
            formattedResult
          );
        }

        // Clear the stored async data
        this.currentAsyncTransactionId = null;
        this.currentAsyncStatusGuid = null;
        this.currentAsyncFormData = null;
      } else {
        console.log(
          `Async status: ${
            result.asyncStatus || result.status
          }, continuing to poll...`
        );
      }
    } catch (error) {
      console.error("Async status check failed:", error);
      // Continue polling on error, unless it's an authentication error
      if (error.message.includes("401") || error.message.includes("403")) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
        $("#asyncStatus").hide();
        this.showTransactionStatus(
          "error",
          "Authentication failed during status check. Please verify your API key."
        );
      }
    }
  }

  mapAsyncApprovalToResponse(approval, success) {
    // Map async response fields to sync transaction response codes
    console.log("Mapping async approval:", { approval, success });

    if (success === true && approval === "approved") {
      return "1"; // Approved
    } else if (approval === "declined" || success === false) {
      return "2"; // Declined
    } else if (approval === "pending" || approval === "review") {
      return "3"; // Error/Review
    } else {
      // Default based on success flag
      return success === true ? "1" : "2";
    }
  }

  showTransactionStatus(type, message, loading = false, showAsync = false) {
    const statusCard = $("#statusCard");
    const statusDiv = $("#transactionStatus");
    const asyncDiv = $("#asyncStatus");

    const iconMap = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle",
    };

    const loadingSpinner = loading
      ? '<div class="spinner-border spinner-border-sm me-2" role="status"></div>'
      : "";

    // Format message for better display of long content
    const formattedMessage = this.formatStatusMessage(message);

    // Add copy button for long messages
    const copyButton =
      message.length > 100
        ? `<button class="btn btn-sm btn-outline-secondary mt-2" onclick="cloudPOS.copyToClipboard('${message.replace(
            /'/g,
            "\\'"
          )}')">
           <i class="fas fa-copy"></i> Copy Response
         </button>`
        : "";

    const html = `
            <div class="status-message status-${type} fade-in">
                <div class="d-flex align-items-start">
                    ${loadingSpinner}
                    <i class="fas ${iconMap[type]} me-2 mt-1"></i>
                    <div class="flex-grow-1">
                        ${formattedMessage}
                        ${copyButton}
                    </div>
                </div>
            </div>
        `;

    statusDiv.html(html);

    if (showAsync) {
      asyncDiv.show();
    } else {
      asyncDiv.hide();
    }

    statusCard.show().addClass("slide-up");
  }

  formatStatusMessage(message) {
    // If message contains key-value pairs (like API responses), format them nicely
    if (typeof message === "string" && message.includes(":")) {
      // Split by common delimiters and format as key-value pairs
      const lines = message
        .split(/\n|,(?=\s*\w+:)/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length > 1) {
        return lines
          .map((line) => {
            if (line.includes(":")) {
              const [key, ...valueParts] = line.split(":");
              const value = valueParts.join(":").trim();
              return `<strong>${key.trim()}:</strong> ${value}`;
            }
            return line;
          })
          .join("<br>");
      }
    }

    // For regular messages, just escape HTML and preserve line breaks
    return message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }

  copyToClipboard(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Show temporary success message
        const originalButton = event.target.closest("button");
        const originalHTML = originalButton.innerHTML;
        originalButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
        originalButton.classList.remove("btn-outline-secondary");
        originalButton.classList.add("btn-success");

        setTimeout(() => {
          originalButton.innerHTML = originalHTML;
          originalButton.classList.remove("btn-success");
          originalButton.classList.add("btn-outline-secondary");
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy to clipboard:", err);
      });
  }

  addToTransactionHistory(formData, result) {
    // Try different possible field names for transaction ID
    const transactionId =
      result.transactionid || result.transaction_id || result.id || "";

    const transaction = {
      timestamp: new Date().toISOString(),
      orderid: formData.orderid,
      type: formData.type,
      amount: formData.amount,
      currency: formData.currency,
      device: this.selectedDevice.name,
      status: this.getTransactionStatus(result),
      transactionid: transactionId,
      authcode: result.authcode || result.auth_code || "",
      response: result.response || "",
    };

    console.log("Adding transaction to history:", transaction);
    this.transactionHistory.unshift(transaction);

    // Keep only last 50 transactions
    if (this.transactionHistory.length > 50) {
      this.transactionHistory = this.transactionHistory.slice(0, 50);
    }

    this.updateTransactionHistoryTable();
  }

  getTransactionStatus(result) {
    const response = result.response || "";

    if (response === "1" || response.toLowerCase() === "approved") {
      return "approved";
    } else if (response === "2" || response.toLowerCase() === "declined") {
      return "declined";
    } else if (response.toLowerCase() === "pending") {
      return "pending";
    } else {
      return "processing";
    }
  }

  updateTransactionHistoryTable() {
    const tbody = $("#transactionTableBody");

    if (this.transactionHistory.length === 0) {
      tbody.html(
        '<tr><td colspan="6" class="text-center text-muted">No transactions yet</td></tr>'
      );
      return;
    }

    const rows = this.transactionHistory
      .slice(0, 10)
      .map((tx) => {
        const time = new Date(tx.timestamp).toLocaleTimeString();
        const amount = `${tx.currency} ${parseFloat(tx.amount).toFixed(2)}`;

        return `
                <tr onclick="cloudPOS.showTransactionDetails('${
                  tx.transactionid || tx.orderid
                }')">
                    <td>${time}</td>
                    <td>${tx.orderid}</td>
                    <td>${tx.type}</td>
                    <td>${amount}</td>
                    <td><span class="status-badge ${tx.status}">${
          tx.status
        }</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); cloudPOS.showTransactionDetails('${
                          tx.transactionid || tx.orderid
                        }')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
      })
      .join("");

    tbody.html(rows);
  }

  showTransactionDetails(transactionId) {
    console.log("Looking for transaction with ID:", transactionId);
    console.log(
      "Available transactions:",
      this.transactionHistory.map((tx) => ({
        orderid: tx.orderid,
        transactionid: tx.transactionid,
      }))
    );

    // Handle both string and number comparisons for transaction IDs
    const transaction = this.transactionHistory.find(
      (tx) =>
        tx.transactionid == transactionId ||
        tx.transactionid === transactionId ||
        tx.orderid == transactionId ||
        tx.orderid === transactionId
    );

    if (!transaction) {
      console.log("Transaction not found for ID:", transactionId);
      return;
    }

    console.log("Found transaction:", transaction);
    const modalBody = $("#transactionModalBody");
    const time = new Date(transaction.timestamp).toLocaleString();

    const html = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Transaction Details</h6>
                    <p><strong>Order ID:</strong> ${transaction.orderid}</p>
                    <p><strong>Transaction ID:</strong> ${
                      transaction.transactionid || "N/A"
                    }</p>
                    <p><strong>Type:</strong> ${transaction.type}</p>
                    <p><strong>Amount:</strong> ${
                      transaction.currency
                    } ${parseFloat(transaction.amount).toFixed(2)}</p>
                    <p><strong>Status:</strong> <span class="status-badge ${
                      transaction.status
                    }">${transaction.status}</span></p>
                </div>
                <div class="col-md-6">
                    <h6>Processing Details</h6>
                    <p><strong>Device:</strong> ${transaction.device}</p>
                    <p><strong>Auth Code:</strong> ${
                      transaction.authcode || "N/A"
                    }</p>
                    <p><strong>Response:</strong> ${
                      transaction.response || "N/A"
                    }</p>
                    <p><strong>Timestamp:</strong> ${time}</p>
                </div>
            </div>
        `;

    modalBody.html(html);

    const modal = new bootstrap.Modal(
      document.getElementById("transactionModal")
    );
    modal.show();
  }

  loadTransactionHistory() {
    // In a real application, this would load from the server
    this.updateTransactionHistoryTable();
  }

  clearTransactionForm() {
    $("#transactionForm")[0].reset();
    $("#synchronous").prop("checked", true);
    $("#contactless").prop("checked", true);
    this.generateOrderId();
    this.updateTransactionButtonState();
    $("#statusCard").hide();

    // Clear POI Device Prompts if enabled
    if ($("#enablePoiPrompts").is(":checked")) {
      this.clearPoiPrompts();
      $("#poiPromptsCard").hide();
      $("#enablePoiPrompts").prop("checked", false);
      $("#configurePoiPrompts").prop("disabled", true);
    }
  }

  showError(message) {
    const alert = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-circle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

    // Show at top of page
    $("body").prepend(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      $(".alert").alert("close");
    }, 5000);
  }

  // POI Device Prompts Methods

  togglePoiPrompts(enabled) {
    const configureBtn = $("#configurePoiPrompts");
    const poiCard = $("#poiPromptsCard");

    configureBtn.prop("disabled", !enabled);

    if (!enabled) {
      poiCard.hide();
      this.clearPoiPrompts();
    }
  }

  showPoiPromptsConfiguration() {
    const poiCard = $("#poiPromptsCard");

    if (poiCard.is(":visible")) {
      poiCard.slideUp();
    } else {
      poiCard.slideDown();
    }
  }

  handleTipPromptChange(enabled) {
    const tipOptionsRow = $("#tipOptionsRow");
    const tipAmountInput = $("#tipAmountsInput");
    const tipPercentageInput = $("#tipPercentagesInput");

    if (enabled) {
      tipOptionsRow.show();
      // Check if a tip type is already selected
      const selectedTipType = $('input[name="tipType"]:checked').val();
      if (selectedTipType) {
        this.handleTipTypeChange(selectedTipType);
      }
    } else {
      tipOptionsRow.hide();
      tipAmountInput.hide();
      tipPercentageInput.hide();
      $('input[name="tipType"]').prop("checked", false);
      $("#poi_prompt_quicktip_amounts").val("");
      $("#poi_prompt_quicktip_percentages").val("");
    }
  }

  handleTipTypeChange(tipType) {
    const tipAmountInput = $("#tipAmountsInput");
    const tipPercentageInput = $("#tipPercentagesInput");

    if (tipType === "amounts") {
      tipAmountInput.show();
      tipPercentageInput.hide();
      $("#poi_prompt_quicktip_percentages").val("");
    } else if (tipType === "percentages") {
      tipAmountInput.hide();
      tipPercentageInput.show();
      $("#poi_prompt_quicktip_amounts").val("");
    }
  }

  handleKeyedEnableChange(enabled) {
    const keyedTypeSelect = $("#poi_keyed_type");
    const cvvCheckbox = $("#poi_prompt_cvv");
    const requireKeyedCheckbox = $("#poi_require_keyed");

    keyedTypeSelect.prop("disabled", !enabled);
    cvvCheckbox.prop("disabled", !enabled);

    if (enabled) {
      cvvCheckbox.prop("checked", true); // Default to enabled
      // Cannot have both enable and require keyed enabled
      if (requireKeyedCheckbox.is(":checked")) {
        requireKeyedCheckbox.prop("checked", false);
      }
    } else {
      cvvCheckbox.prop("checked", false);
      keyedTypeSelect.val("cnp"); // Reset to default
    }
  }

  handleKeyedRequireChange(enabled) {
    const enableKeyedCheckbox = $("#poi_enable_keyed");
    const keyedTypeSelect = $("#poi_keyed_type");
    const cvvCheckbox = $("#poi_prompt_cvv");

    if (enabled) {
      // Cannot have both enable and require keyed enabled
      if (enableKeyedCheckbox.is(":checked")) {
        enableKeyedCheckbox.prop("checked", false);
        keyedTypeSelect.prop("disabled", false);
        cvvCheckbox.prop("disabled", false);
      } else {
        keyedTypeSelect.prop("disabled", false);
        cvvCheckbox.prop("disabled", false);
      }
      cvvCheckbox.prop("checked", true); // Default to enabled
    } else {
      keyedTypeSelect.prop("disabled", true);
      cvvCheckbox.prop("disabled", true);
      cvvCheckbox.prop("checked", false);
      keyedTypeSelect.val("cnp"); // Reset to default
    }
  }

  clearPoiPrompts() {
    // Clear all POI Device Prompts inputs
    $("#tip").val("");
    $("#poi_prompt_tip").prop("checked", false);
    $('input[name="tipType"]').prop("checked", false);
    $("#poi_prompt_quicktip_amounts").val("");
    $("#poi_prompt_quicktip_percentages").val("");
    $("#poi_enable_keyed").prop("checked", false);
    $("#poi_require_keyed").prop("checked", false);
    $("#poi_keyed_type").val("cnp").prop("disabled", true);
    $("#poi_prompt_cvv").prop("checked", false).prop("disabled", true);
    $("#poi_prompt_zip").prop("checked", false);
    $("#poi_prompt_amount_confirmation").prop("checked", false);
    $("#poi_prompt_signature").prop("checked", true); // Default to enabled
    $("#poi_automatic_fall_forward").prop("checked", true); // Default to enabled
    $("#poi_enable_void").prop("checked", false);
    $("#poi_request").val("");

    // Hide conditional elements
    $("#tipOptionsRow").hide();
    $("#tipAmountsInput").hide();
    $("#tipPercentagesInput").hide();
  }

  setBasicTipPreset() {
    // Clear first
    this.clearPoiPrompts();

    // Enable tip prompting with percentage options
    $("#poi_prompt_tip").prop("checked", true);
    $("#tipPercentages").prop("checked", true);
    $("#poi_prompt_quicktip_percentages").val("15.00,18.00,20.00");

    // Trigger UI updates
    this.handleTipPromptChange(true);
    this.handleTipTypeChange("percentages");
  }

  setAdvancedPromptsPreset() {
    // Clear first
    this.clearPoiPrompts();

    // Enable tip prompting
    $("#poi_prompt_tip").prop("checked", true);
    $("#tipPercentages").prop("checked", true);
    $("#poi_prompt_quicktip_percentages").val("15.00,18.00,20.00,22.00");

    // Enable confirmations
    $("#poi_prompt_amount_confirmation").prop("checked", true);
    $("#poi_prompt_zip").prop("checked", true);

    // Enable advanced features
    $("#poi_enable_keyed").prop("checked", true);

    // Trigger UI updates
    this.handleTipPromptChange(true);
    this.handleTipTypeChange("percentages");
    this.handleKeyedEnableChange(true);
  }

  getPoiPromptsData() {
    const poiData = {};

    // Tip amount
    const tipAmount = $("#tip").val();
    if (tipAmount && parseFloat(tipAmount) > 0) {
      poiData.tip = tipAmount;
    }

    // Tip prompting
    if ($("#poi_prompt_tip").is(":checked")) {
      poiData.poi_prompt_tip = "true";

      // Quick tip options
      const selectedTipType = $('input[name="tipType"]:checked').val();
      if (selectedTipType === "amounts") {
        const amounts = $("#poi_prompt_quicktip_amounts").val().trim();
        if (amounts) {
          poiData.poi_prompt_quicktip_amounts = amounts;
        }
      } else if (selectedTipType === "percentages") {
        const percentages = $("#poi_prompt_quicktip_percentages").val().trim();
        if (percentages) {
          poiData.poi_prompt_quicktip_percentages = percentages;
        }
      }
    }

    // Keyed entry options
    if ($("#poi_enable_keyed").is(":checked")) {
      poiData.poi_enable_keyed = "true";
      poiData.poi_keyed_type = $("#poi_keyed_type").val();

      if ($("#poi_prompt_cvv").is(":checked")) {
        poiData.poi_prompt_cvv = "true";
      }
    }

    if ($("#poi_require_keyed").is(":checked")) {
      poiData.poi_require_keyed = "true";
      poiData.poi_keyed_type = $("#poi_keyed_type").val();

      if ($("#poi_prompt_cvv").is(":checked")) {
        poiData.poi_prompt_cvv = "true";
      }
    }

    // Address and confirmation prompts
    if ($("#poi_prompt_zip").is(":checked")) {
      poiData.poi_prompt_zip = "true";
    }

    if ($("#poi_prompt_amount_confirmation").is(":checked")) {
      poiData.poi_prompt_amount_confirmation = "true";
    }

    if ($("#poi_prompt_signature").is(":checked")) {
      poiData.poi_prompt_signature = "true";
    } else {
      poiData.poi_prompt_signature = "false";
    }

    // Advanced device options
    if ($("#poi_automatic_fall_forward").is(":checked")) {
      poiData.poi_automatic_fall_forward = "true";
    } else {
      poiData.poi_automatic_fall_forward = "false";
    }

    if ($("#poi_enable_void").is(":checked")) {
      poiData.poi_enable_void = "true";
    }

    // Device request
    const poiRequest = $("#poi_request").val();
    if (poiRequest) {
      poiData.poi_request = poiRequest;
    }

    return poiData;
  }

  validatePoiPromptsData(poiData) {
    const errors = [];

    // Validate tip amounts format
    if (poiData.poi_prompt_quicktip_amounts) {
      const amounts = poiData.poi_prompt_quicktip_amounts.split(",");
      if (amounts.length > 4) {
        errors.push("Quick tip amounts cannot exceed 4 options");
      }

      for (const amount of amounts) {
        if (isNaN(parseFloat(amount.trim()))) {
          errors.push("Quick tip amounts must be valid numbers");
          break;
        }
      }
    }

    // Validate tip percentages format
    if (poiData.poi_prompt_quicktip_percentages) {
      const percentages = poiData.poi_prompt_quicktip_percentages.split(",");
      if (percentages.length > 4) {
        errors.push("Quick tip percentages cannot exceed 4 options");
      }

      for (const percentage of percentages) {
        const pct = parseFloat(percentage.trim());
        if (isNaN(pct) || pct < 0 || pct > 100) {
          errors.push(
            "Quick tip percentages must be valid numbers between 0 and 100"
          );
          break;
        }
      }
    }

    // Validate that both enable and require keyed are not set
    if (
      poiData.poi_enable_keyed === "true" &&
      poiData.poi_require_keyed === "true"
    ) {
      errors.push(
        "Cannot enable both 'enable keyed' and 'require keyed' options"
      );
    }

    // Validate that quick tip options require tip prompting to be enabled
    if (
      (poiData.poi_prompt_quicktip_amounts ||
        poiData.poi_prompt_quicktip_percentages) &&
      poiData.poi_prompt_tip !== "true"
    ) {
      errors.push("Quick tip options require tip prompting to be enabled");
    }

    // Validate that both tip amounts and percentages are not set
    if (
      poiData.poi_prompt_quicktip_amounts &&
      poiData.poi_prompt_quicktip_percentages
    ) {
      errors.push("Cannot specify both quick tip amounts and percentages");
    }

    return errors;
  }

  // Standalone Device Input Methods

  updateStandaloneFormState() {
    const deviceSelected = $("#standaloneDevice").val();
    const inputType = $("#standaloneInputType").val();
    const processButton = $("#processStandaloneInput");

    // Enable process button only if device is selected
    processButton.prop("disabled", !deviceSelected);

    // Show/hide conditional fields based on input type
    this.showStandaloneConditionalFields(inputType);
  }

  showStandaloneConditionalFields(inputType) {
    const amountRow = $("#standaloneAmountRow");
    const tipCard = $("#standaloneTipCard");

    // Hide all conditional fields first
    amountRow.hide();
    tipCard.hide();

    // Show relevant fields based on input type
    switch (inputType) {
      case "signature":
        // No additional fields needed
        break;
      case "yesno":
        // No additional fields needed
        break;
      case "menuselection":
        // No additional fields needed (options handled in prompt text)
        break;
      default:
        break;
    }
  }

  async processStandaloneInput() {
    const deviceId = $("#standaloneDevice").val();
    const inputType = $("#standaloneInputType").val();
    const promptText = $("#standalonePromptText").val();

    if (!deviceId) {
      this.showError("Please select a device");
      return;
    }

    this.showStandaloneStatus("Starting standalone device input...");

    try {
      let response;

      switch (inputType) {
        case "signature":
          response = await this.startSignatureCapture(deviceId, promptText);
          break;
        case "yesno":
          response = await this.startYesNoPrompt(deviceId, promptText);
          break;
        case "menuselection":
          response = await this.startMenuSelection(deviceId, promptText);
          break;
        default:
          throw new Error("Unsupported input type: " + inputType);
      }

      if (response.async_status_guid) {
        this.currentStandaloneGuid = response.async_status_guid;
        this.showStandaloneStatus(
          "Input started successfully. Status: " + response.status
        );
        this.enableStandaloneStatusButtons(true);

        // Start polling for status updates
        this.startStandaloneStatusPolling();
      } else {
        throw new Error("No async status GUID received");
      }
    } catch (error) {
      console.error("Standalone input error:", error);
      this.showError(`Error starting standalone input: ${error.message}`);
    }
  }

  async startSignatureCapture(deviceId, header) {
    const url = `/cloud/devices/sign/${deviceId}${
      header ? `?header=${encodeURIComponent(header)}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + this.securityKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async startYesNoPrompt(deviceId, header, message) {
    let url = `/cloud/devices/yesno/${deviceId}`;
    const params = [];

    if (header) params.push(`header=${encodeURIComponent(header)}`);
    if (message) params.push(`message=${encodeURIComponent(message)}`);

    if (params.length > 0) {
      url += "?" + params.join("&");
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + this.securityKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async startMenuSelection(deviceId, header) {
    // Parse options from prompt text (expects comma-separated values)
    const options =
      $("#standalonePromptText")
        .val()
        ?.split(",")
        .map((opt) => opt.trim())
        .filter((opt) => opt.length > 0) || [];

    if (options.length < 2 || options.length > 20) {
      throw new Error(
        "Menu selection requires between 2 and 20 options (comma-separated)"
      );
    }

    const requestBody = {
      header: header || "Select Option",
      options: options,
    };

    const response = await fetch(`/cloud/devices/menuselection/${deviceId}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + this.securityKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  showStandaloneStatus(message) {
    $("#standaloneInputStatus").html(`
      <div class="alert alert-info">
        <i class="fas fa-spinner fa-spin"></i> ${message}
      </div>
    `);
    $("#standaloneStatusCard").show();
  }

  enableStandaloneStatusButtons(enabled) {
    $("#cancelStandaloneInput, #checkStandaloneStatus").prop(
      "disabled",
      !enabled
    );
  }

  startStandaloneStatusPolling() {
    if (this.standalonePollingInterval) {
      clearInterval(this.standalonePollingInterval);
    }

    this.standalonePollingInterval = setInterval(() => {
      this.checkStandaloneStatus(false);
    }, 2000); // Poll every 2 seconds
  }

  stopStandaloneStatusPolling() {
    if (this.standalonePollingInterval) {
      clearInterval(this.standalonePollingInterval);
      this.standalonePollingInterval = null;
    }
  }

  async checkStandaloneStatus(manual = true) {
    if (!this.currentStandaloneGuid) {
      if (manual) {
        this.showError("No active standalone input to check");
      }
      return;
    }

    try {
      const response = await fetch(
        `/cloud/asyncdevicestatus/${this.currentStandaloneGuid}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: "Bearer " + this.securityKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status === "complete" || result.status === "completed") {
        this.stopStandaloneStatusPolling();
        this.showStandaloneResults(result);
        this.enableStandaloneStatusButtons(false);
        this.currentStandaloneGuid = null;
      } else if (result.status === "failed" || result.status === "cancelled") {
        this.stopStandaloneStatusPolling();
        this.showStandaloneStatus(
          `Input ${result.status}: ${result.response || "Unknown error"}`
        );
        this.enableStandaloneStatusButtons(false);
        this.currentStandaloneGuid = null;
      } else {
        // Still in progress
        this.showStandaloneStatus(`Status: ${result.status}`);
      }
    } catch (error) {
      console.error("Status check error:", error);
      if (manual) {
        this.showError(`Error checking status: ${error.message}`);
      }
    }
  }

  async cancelStandaloneInput() {
    if (!this.currentStandaloneGuid) {
      this.showError("No active standalone input to cancel");
      return;
    }

    // For now, just stop polling and reset state
    // Note: The NMI API doesn't provide a cancel endpoint for these async operations
    this.stopStandaloneStatusPolling();
    this.enableStandaloneStatusButtons(false);
    this.showStandaloneStatus("Input cancelled by user");
    this.currentStandaloneGuid = null;

    this.showStandaloneStatus("Standalone input cancelled");
  }

  showStandaloneResults(result) {
    let resultsHtml = `
      <div class="alert alert-success">
        <h6><i class="fas fa-check-circle"></i> Input Completed Successfully</h6>
        <strong>Status:</strong> ${result.status}<br>
    `;

    // Add result-specific data
    if (result.signature_data) {
      resultsHtml += `<strong>Signature:</strong> Captured<br>`;
    }

    if (result.customer_response !== undefined) {
      resultsHtml += `<strong>Customer Response:</strong> ${result.customer_response}<br>`;
    }

    if (result.selected_option !== undefined) {
      resultsHtml += `<strong>Selected Option:</strong> ${result.selected_option}<br>`;
    }

    resultsHtml += `</div>`;

    $("#standaloneResults").html(resultsHtml);
    $("#standaloneResultsCard").show();

    // Also update the status card
    $("#standaloneInputStatus").html(`
      <div class="alert alert-success">
        <i class="fas fa-check-circle"></i> Input completed successfully
      </div>
    `);
  }

  clearStandaloneForm() {
    // Reset form fields
    $("#standaloneForm")[0].reset();

    // Hide conditional sections
    $("#standaloneAmountRow, #standaloneTipCard").hide();

    // Hide status and results
    $("#standaloneStatusCard, #standaloneResultsCard").hide();

    // Reset state
    this.stopStandaloneStatusPolling();
    this.enableStandaloneStatusButtons(false);
    this.currentStandaloneGuid = null;

    // Update form state
    this.updateStandaloneFormState();

    this.showStandaloneStatus("Standalone form cleared");
  }
}

// Initialize the Cloud POS system when window is fully loaded
let cloudPOS;

// Only initialize when the window is fully loaded (not just DOM ready)
window.addEventListener("load", function () {
  // Check if we're actually on the cloud POS page by looking for key elements
  if (
    document.getElementById("securityForm") ||
    document.querySelector(".cloud-pos-container")
  ) {
    cloudPOS = new CloudPOSSystem();

    // Bind amount input to update button state
    $("#amount").on("input", () => cloudPOS.updateTransactionButtonState());

    // Bind standalone form events
    $("#standaloneForm").on("submit", (e) => {
      e.preventDefault();
      cloudPOS.processStandaloneInput();
    });

    $("#clearStandaloneForm").on("click", () => cloudPOS.clearStandaloneForm());
    $("#cancelStandaloneInput").on("click", () =>
      cloudPOS.cancelStandaloneInput()
    );
    $("#checkStandaloneStatus").on("click", () =>
      cloudPOS.checkStandaloneStatus()
    );

    // Update standalone form state when device or input type changes
    $("#standaloneDevice, #standaloneInputType").on("change", () => {
      cloudPOS.updateStandaloneFormState();
    });

    // Export for global access
    window.cloudPOS = cloudPOS;
  }
});
