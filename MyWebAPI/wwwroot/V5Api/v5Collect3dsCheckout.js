(function () {
  "use strict";

  const COLLECT_SCRIPT_ID = "nmi-collect-js-dynamic";
  const LOG_PREFIX = "[V5 Collect+3DS]";

  let gatewayInstance = null;
  let collectScriptLoaded = false;
  /** Per-pay context for Collect callback (mirrors main.js token flow, extended for 3DS). */
  let paySession = null;
  let paySessionTimer = null;

  $("envProduction").addEventListener("change", function () {
    if ($("envProduction").checked) {
      logStep("Environment switched to PRODUCTION");
      $("publicKey").value = "z4ZWYx-QWAv8X-D8X4d5-5NZpD3";
      $("gatewayPublicKey").value =
        "checkout_public_EenmRhEbNd48J5r9m2v54jgdDQ5eSX72";
      $("v5ApiKey").value = "FaDMr6C75FG3WK76CR77R2A55cq9QG6J";
    } else {
      logStep("Environment switched to SANDBOX");
      $("publicKey").value = "Mm3Pt3-e6BCRA-329Frx-Ct5T9m";
      $("gatewayPublicKey").value = "Mm3Pt3-e6BCRA-329Frx-Ct5T9m";
      $("v5ApiKey").value = "Kes9dc87682hQHn6JSTTs44uyvz66c56";
    }
  });

  function logStep(step, detail) {
    if (detail !== undefined) {
      console.log(LOG_PREFIX, step, detail);
    } else {
      console.log(LOG_PREFIX, step);
    }
  }

  function $(id) {
    return document.getElementById(id);
  }

  function getV5BaseUrl() {
    return $("envProduction").checked
      ? "https://secure.nmi.com"
      : "https://sandbox.nmi.com";
  }

  function getCollectJsUrl() {
    return $("envProduction").checked
      ? "https://secure.nmi.com/token/Collect.js"
      : "https://sandbox.nmi.com/token/Collect.js";
  }

  function setInitStatus(msg, isError) {
    const el = $("initStatus");
    el.textContent = msg;
    el.className =
      "form-text mt-2 " + (isError ? "text-danger" : "text-success");
  }

  function setResult(text, isError) {
    const pre = $("resultOut");
    pre.textContent = text;
    pre.className = "small mb-0 " + (isError ? "text-danger" : "");
    $("btnCopy").disabled = !text || text === "—";
    window.__lastResultText = text;
  }

  /** Gateway.js amount: minor units (e.g. USD cents). */
  function amountToMinorUnits(amountStr, currency) {
    const n = parseFloat(String(amountStr).replace(/,/g, ""));
    if (isNaN(n) || n < 0) return null;
    const cur = (currency || "USD").toUpperCase();
    const zeroDecimal = new Set([
      "BIF",
      "CLP",
      "DJF",
      "GNF",
      "ISK",
      "JPY",
      "KMF",
      "KRW",
      "PYG",
      "RWF",
      "UGX",
      "VND",
      "VUV",
      "XAF",
      "XOF",
      "XPF",
    ]);
    const threeDecimal = new Set([
      "BHD",
      "IQD",
      "JOD",
      "KWD",
      "LYD",
      "OMR",
      "TND",
    ]);
    if (zeroDecimal.has(cur)) return String(Math.round(n));
    if (threeDecimal.has(cur)) return String(Math.round(n * 1000));
    return String(Math.round(n * 100));
  }

  function readBillingForThreeDS() {
    const state = ($("state").value || "").trim().toUpperCase().slice(0, 2);
    return {
      firstName: ($("firstName").value || "").trim(),
      lastName: ($("lastName").value || "").trim(),
      email: ($("email").value || "").trim(),
      phone: ($("phone").value || "").trim(),
      address1: ($("address1").value || "").trim(),
      city: ($("city").value || "").trim(),
      state: state,
      country: ($("country").value || "").trim().toUpperCase().slice(0, 2),
      postalCode: ($("postalCode").value || "").trim(),
    };
  }

  function buildBillingAddressNested() {
    const b = readBillingForThreeDS();
    const o = {};
    if (b.firstName) o.first_name = b.firstName;
    if (b.lastName) o.last_name = b.lastName;
    if (b.email) o.email = b.email;
    if (b.phone) o.phone = b.phone;
    if (b.address1) o.address1 = b.address1;
    if (b.city) o.city = b.city;
    if (b.state) o.state = b.state;
    if (b.country) o.country = b.country;
    if (b.postalCode) o.zip = b.postalCode;
    return Object.keys(o).length ? o : null;
  }

  function buildCardholderAuth(e) {
    const o = {};
    if (e.cardHolderAuth != null && String(e.cardHolderAuth).trim() !== "") {
      o.status = String(e.cardHolderAuth).trim();
    }
    if (e.cavv != null && String(e.cavv).trim() !== "")
      o.cavv = String(e.cavv).trim();
    if (e.xid != null && String(e.xid).trim() !== "")
      o.xid = String(e.xid).trim();
    // if (e.eci != null && String(e.eci).trim() !== '') o.eci = String(e.eci).trim();
    if (e.threeDsVersion != null && String(e.threeDsVersion).trim() !== "") {
      o.three_ds_version = String(e.threeDsVersion).trim();
    }
    if (
      e.directoryServerId != null &&
      String(e.directoryServerId).trim() !== ""
    ) {
      o.directory_server_id = String(e.directoryServerId).trim();
    }
    return o;
  }

  function removeCollectScript() {
    const existing = document.getElementById(COLLECT_SCRIPT_ID);
    if (existing) existing.remove();
  }

  function loadCollectScript(publicKey) {
    return new Promise(function (resolve, reject) {
      logStep("Init: removing any previous Collect.js script");
      removeCollectScript();
      collectScriptLoaded = false;
      gatewayInstance = null;

      const s = document.createElement("script");
      s.id = COLLECT_SCRIPT_ID;
      s.async = true;
      s.src = getCollectJsUrl();
      const currency = ($("currency").value || "USD").trim();
      const country = ($("country").value || "US").trim();
      const amountMajor = ($("amount").value || "1.00").trim();
      const priceAttr = /^\d+(\.\d{1,2})?$/.test(amountMajor)
        ? amountMajor
        : "1.00";

      // Card-only Collect.js (no ACH / Google Pay field targets).
      s.setAttribute("data-tokenization-key", publicKey.trim());
      s.setAttribute("data-variant", "inline");
      s.setAttribute(
        "data-fields-available-callback",
        "(function(){ console.log('[V5 Collect+3DS] Collect.js has added fields to the form'); })()",
      );
      s.setAttribute(
        "data-validation-callback",
        '(function (field, status, message) { var msg = field + (status ? " is OK: " : " is invalid: ") + message; console.log("[V5 Collect+3DS] validation:", msg); })',
      );
      s.setAttribute("data-field-ccnumber-title", "Card Number");
      s.setAttribute("data-field-ccnumber-placeholder", "0000 0000 0000 0000");
      s.setAttribute("data-field-ccnumber-enable-card-brand-previews", "true");
      s.setAttribute("data-field-ccexp-title", "Expiration Date");
      s.setAttribute("data-field-ccexp-placeholder", "00 / 00");
      s.setAttribute("data-field-cvv-display", "required");
      s.setAttribute("data-field-cvv-title", "CVV Code");
      s.setAttribute("data-field-cvv-placeholder", "***");
      s.setAttribute("data-price", priceAttr);
      s.setAttribute("data-currency", currency);
      s.setAttribute("data-country", country);
      s.setAttribute("data-style-sniffer", "true");

      s.onload = function () {
        logStep("Init: Collect.js script onload fired");
        collectScriptLoaded = typeof window.CollectJS !== "undefined";
        logStep("Init: typeof CollectJS", typeof window.CollectJS);
        if (!collectScriptLoaded) {
          logStep("Init: FAILED — CollectJS missing after script load");
          reject(new Error("Collect.js loaded but CollectJS is not defined."));
          return;
        }
        logStep("Init: Collect.js ready");
        resolve();
      };
      s.onerror = function () {
        logStep("Init: Collect.js script onerror", getCollectJsUrl());
        reject(
          new Error("Failed to load Collect.js from " + getCollectJsUrl()),
        );
      };
      logStep("Init: appending Collect.js script", {
        url: getCollectJsUrl(),
        sandbox: !document.getElementById("envProduction").checked,
      });
      document.body.appendChild(s);
    });
  }

  /** Same idea as main.js configureCollectJS: one configure after Collect is present; pay uses startPaymentRequest only. */
  function registerCollectCallback() {
    if (typeof window.CollectJS === "undefined") {
      logStep("Init: registerCollectCallback skipped — CollectJS missing");
      return;
    }
    window.CollectJS.configure({
      callback: function (response) {
        handleCollectPayCallback(response);
      },
    });
    logStep(
      "Init: CollectJS.configure({ callback }) registered (main.js pattern)",
    );
  }

  function handleCollectPayCallback(response) {
    if (paySessionTimer) {
      clearTimeout(paySessionTimer);
      paySessionTimer = null;
    }
    const s = paySession;
    paySession = null;

    logStep("Pay: CollectJS callback fired", {
      hasResponse: !!response,
      hasToken: !!(response && response.token),
      responseKeys:
        response && typeof response === "object" ? Object.keys(response) : [],
      hadPaySession: !!s,
    });

    if (!s) {
      logStep(
        "Pay: Collect callback with no paySession — click Pay to start a session (same as idle main.js)",
      );
      return;
    }

    if (!response || !response.token) {
      logStep(
        "Pay: Collect callback without token (validation failed or user cancelled?)",
        response,
      );
      setResult("Collect.js did not return a payment token.", true);
      $("btnPay").disabled = false;
      return;
    }

    const paymentToken = response.token;
    const billing = s.billing;
    logStep(
      "Pay: payment token received (length only)",
      String(paymentToken).length,
    );
    setResult("Token received. Running 3DS…", false);

    const threeDSOpts = {
      paymentToken: paymentToken,
      currency: ($("currency").value || "USD").trim().toUpperCase(),
      // amount: s.minor,
      amount: "10.00",
      email: billing.email,
      phone: billing.phone,
      city: billing.city,
      state: billing.state,
      address1: billing.address1,
      country: billing.country,
      firstName: billing.firstName,
      lastName: billing.lastName,
      postalCode: billing.postalCode,
    };

    const proc = $("processorId").value.trim();
    if (proc) threeDSOpts.processor = proc;

    logStep("3DS: createUI()", {
      currency: threeDSOpts.currency,
      amountMinor: threeDSOpts.amount,
    });
    const ui = s.threeDS.createUI(threeDSOpts);

    ui.on("challenge", function () {
      logStep("3DS: challenge event");
      setResult(
        "3DS challenge displayed. Complete authentication in the frame above.",
        false,
      );
    });

    ui.on("failure", function (e) {
      logStep("3DS: failure event", e);
      const mount = $("threeDSMountPoint");
      if (mount) mount.innerHTML = "";
      setResult("3DS failure:\n" + JSON.stringify(e, null, 2), true);
      $("btnPay").disabled = false;
    });

    ui.on("complete", function (e) {
      logStep(
        "3DS: complete event",
        e && typeof e === "object" ? Object.keys(e) : e,
      );
      // Tear down the 3DS challenge iframe so the Result panel below is visible
      const mount = $("threeDSMountPoint");
      if (mount) mount.innerHTML = "";
      if (e && e.cardHolderInfo) {
        setResult(
          "Issuer message (show to customer; do not send to API):\n" +
            String(e.cardHolderInfo) +
            "\n\nSubmitting V5 sale…",
          false,
        );
      } else {
        setResult("3DS complete. Submitting V5 sale…", false);
      }

      postV5Sale(paymentToken, e || {})
        .then(function (data) {
          setResult(
            JSON.stringify(data, null, 2),
            !data || data.success === false,
          );
        })
        .catch(function (err) {
          setResult(
            "Request error:\n" +
              (err && err.message ? err.message : String(err)),
            true,
          );
        })
        .finally(function () {
          $("btnPay").disabled = false;
        });
    });

    $("threeDSMountPoint").innerHTML = "";
    logStep("3DS: ui.start(#threeDSMountPoint)");
    ui.start("#threeDSMountPoint");
  }

  /**
   * NMI Gateway.js — https://docs.nmi.com/docs/gatewayjs
   * Step 3 in docs: Gateway.create(public API key with Checkout permissions)
   */
  function initGateway(gatewayCheckoutPublicKey) {
    if (typeof window.Gateway === "undefined") {
      logStep("Init: FAILED — Gateway global missing");
      throw new Error("Gateway.js is not loaded.");
    }
    const key = gatewayCheckoutPublicKey.trim();
    logStep("Init: Gateway.create(gatewayCheckoutPublicKey)", {
      keyLength: key.length,
    });
    gatewayInstance = window.Gateway.create(key);
    gatewayInstance.on("error", function (err) {
      logStep("Gateway error event", err);
      setResult("Gateway.js error:\n" + JSON.stringify(err, null, 2), true);
      $("btnPay").disabled = false;
    });
    logStep("Init: Gateway.js ready (error listener attached)");
  }

  async function postV5Sale(paymentToken, threeDsEvent) {
    logStep("V5: postV5Sale start", {
      tokenLength: paymentToken ? String(paymentToken).length : 0,
      threeDsKeys:
        threeDsEvent && typeof threeDsEvent === "object"
          ? Object.keys(threeDsEvent)
          : [],
    });
    const apiKey = $("v5ApiKey").value.trim();
    if (!apiKey) throw new Error("Enter your V5 API key.");

    const amountStr = $("amount").value.trim();
    const amt = parseFloat(amountStr.replace(/,/g, ""));
    if (isNaN(amt) || amt <= 0) throw new Error("Enter a valid amount.");

    const currency = ($("currency").value || "USD").trim().toUpperCase();
    const body = {
      amount: amt.toFixed(2),
      currency: currency,
      industry: "ecommerce",
      payment_details: {
        payment_token: paymentToken,
      },
    };

    const billing = buildBillingAddressNested();
    if (billing) body.billing_address = billing;

    const proc = $("processorId").value.trim();
    if (proc) body.processor_id = proc;

    const ca = buildCardholderAuth(threeDsEvent);
    if (Object.keys(ca).length) body.cardholder_auth = ca;

    const payload = {
      api_key: apiKey,
      method: "POST",
      url: "/v5/payments/sale",
      baseUrl: getV5BaseUrl(),
      body: body,
    };

    const res = await fetch("/api/v5/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(function () {
      return { parseError: true, text: res.statusText };
    });
    logStep("V5: proxy response", {
      httpOk: res.ok,
      status: res.status,
      success: json && json.success,
    });
    return json;
  }

  function onInitClick() {
    logStep("Button: Load Collect.js fields clicked");
    const pk = $("publicKey").value.trim();
    const gk = $("gatewayPublicKey").value.trim();
    if (!pk) {
      setInitStatus("Enter your Collect.js public tokenization key.", true);
      return;
    }
    if (!gk) {
      setInitStatus(
        "Enter your Gateway.js public Checkout key (Merchant Portal → Security Keys, Checkout permissions).",
        true,
      );
      return;
    }

    $("btnInitFields").disabled = true;
    setInitStatus("Loading Collect.js…", false);

    loadCollectScript(pk)
      .then(function () {
        initGateway(gk);
        registerCollectCallback();
        collectScriptLoaded = true;
        $("btnPay").disabled = false;
        $("publicKey").disabled = true;
        $("gatewayPublicKey").disabled = true;
        $("envProduction").disabled = true;
        setInitStatus(
          "Collect.js and Gateway.js are ready. Enter card data, then click Pay.",
          false,
        );
        logStep("Init: complete — ready for Pay");
      })
      .catch(function (err) {
        logStep("Init: error", err && err.message ? err.message : err);
        setInitStatus(err.message || String(err), true);
        $("btnPay").disabled = true;
      })
      .finally(function () {
        $("btnInitFields").disabled = false;
      });
  }

  function onPayClick() {
    logStep("Button: Pay clicked");
    logStep("State check", {
      collectScriptLoaded: collectScriptLoaded,
      collectJsType: typeof window.CollectJS,
      gatewayReady: !!gatewayInstance,
    });

    if (!collectScriptLoaded || typeof window.CollectJS === "undefined") {
      logStep("Pay aborted: Collect.js not loaded");
      setResult("Load Collect.js fields first.", true);
      return;
    }
    if (!gatewayInstance) {
      logStep("Pay aborted: Gateway not initialized");
      setResult("Gateway is not initialized.", true);
      return;
    }
    if (!$("v5ApiKey").value.trim()) {
      logStep("Pay aborted: missing V5 API key");
      setResult("Enter your V5 API key.", true);
      return;
    }

    const minor = amountToMinorUnits($("amount").value, $("currency").value);
    if (minor === null) {
      logStep("Pay aborted: invalid amount");
      setResult("Invalid amount.", true);
      return;
    }

    const b = readBillingForThreeDS();
    if (!b.firstName || !b.lastName) {
      logStep("Pay aborted: missing cardholder name");
      setResult("First and last name are required for 3DS.", true);
      return;
    }

    logStep("Pay: amount minor units for 3DS", {
      minor: minor,
      currency: ($("currency").value || "USD").trim().toUpperCase(),
    });

    $("btnPay").disabled = true;
    setResult("Waiting for Collect.js…", false);

    logStep("Pay: step 1/3 — get3DSecure(), set paySession");
    const threeDS = gatewayInstance.get3DSecure();

    paySession = { minor: minor, billing: b, threeDS: threeDS };
    if (paySessionTimer) clearTimeout(paySessionTimer);
    paySessionTimer = setTimeout(function () {
      if (paySession) {
        logStep(
          "Pay: timeout (30s) — Collect.js callback never ran (invalid fields or Collect not wired)",
        );
        paySession = null;
        paySessionTimer = null;
        setResult(
          "Timed out waiting for Collect.js (30s). Fill card number, expiry, and CVV; check console for validation lines.",
          true,
        );
        $("btnPay").disabled = false;
      }
    }, 30000);

    try {
      logStep(
        "Pay: step 2/3 — CollectJS.startPaymentRequest() (callback registered at init, like main.js)",
      );
      window.CollectJS.startPaymentRequest();
      logStep(
        "Pay: step 3/3 — startPaymentRequest() returned; waiting for Collect callback",
      );
    } catch (err) {
      logStep("Pay: startPaymentRequest threw", err);
      setResult(
        "Collect.js error:\n" +
          (err && err.message ? err.message : String(err)),
        true,
      );
      $("btnPay").disabled = false;
    }
  }

  function onCopyClick() {
    const t = window.__lastResultText;
    if (!t) return;
    navigator.clipboard.writeText(t).catch(function () {});
  }

  document.addEventListener("DOMContentLoaded", function () {
    logStep("Page: DOMContentLoaded", {
      gatewayJs: typeof window.Gateway,
      collectJsYet: typeof window.CollectJS,
    });
    $("btnInitFields").addEventListener("click", onInitClick);
    $("btnPay").addEventListener("click", onPayClick);
    $("btnCopy").addEventListener("click", onCopyClick);
  });
})();
