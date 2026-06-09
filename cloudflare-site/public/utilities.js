$(document).ready(function () {
  fillNavBar();
});

function fillNavBar() {
  const navBar = document.getElementById("mainNavBar");

  if (navBar) {
    navBar.innerHTML = `
        <style>
          .modern-navbar {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%) !important;
            border: none !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            padding: 0;
            margin-bottom: 0;
          }
          
          .modern-navbar .navbar-brand {
            color: #ecf0f1 !important;
            font-weight: 700;
            font-size: 1.4rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            padding: 1rem 1.5rem;
            transition: all 0.3s ease;
          }
          
          .modern-navbar .navbar-brand:hover {
            color: #3498db !important;
            transform: translateY(-1px);
          }

          .hamburger-btn {
            background: none;
            border: 2px solid rgba(236, 240, 241, 0.3);
            border-radius: 8px;
            padding: 8px 10px;
            margin: 0.75rem 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            gap: 5px;
            align-items: center;
            justify-content: center;
          }

          .hamburger-btn:hover {
            border-color: #3498db;
            background: rgba(52, 152, 219, 0.1);
          }

          .hamburger-btn span {
            display: block;
            width: 22px;
            height: 2px;
            background: #ecf0f1;
            border-radius: 2px;
            transition: all 0.3s ease;
          }

          .nav-offcanvas {
            position: fixed;
            top: 0;
            right: -320px;
            width: 300px;
            height: 100vh;
            background: linear-gradient(180deg, #2c3e50 0%, #1a252f 100%);
            box-shadow: -5px 0 25px rgba(0, 0, 0, 0.3);
            z-index: 1050;
            transition: right 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            overflow-y: auto;
          }

          .nav-offcanvas.open {
            right: 0;
          }

          .nav-offcanvas-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(2px);
            z-index: 1040;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }

          .nav-offcanvas-backdrop.open {
            opacity: 1;
            pointer-events: auto;
          }

          .nav-offcanvas-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid rgba(52, 152, 219, 0.2);
          }

          .nav-offcanvas-header h5 {
            color: #ecf0f1;
            margin: 0;
            font-weight: 700;
            font-size: 1.1rem;
          }

          .nav-close-btn {
            background: none;
            border: none;
            color: #bdc3c7;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
            transition: color 0.2s;
          }

          .nav-close-btn:hover {
            color: #e74c3c;
          }

          .nav-offcanvas .nav-list {
            list-style: none;
            padding: 0.75rem 0;
            margin: 0;
          }

          .nav-offcanvas .nav-list li a {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 0.75rem 1.5rem;
            color: #bdc3c7;
            text-decoration: none;
            font-weight: 500;
            font-size: 0.95rem;
            transition: all 0.2s ease;
            border-left: 3px solid transparent;
          }

          .nav-offcanvas .nav-list li a:hover {
            color: #3498db;
            background: rgba(52, 152, 219, 0.08);
            border-left-color: rgba(52, 152, 219, 0.4);
          }

          .nav-offcanvas .nav-list li a.active {
            color: #3498db;
            background: rgba(52, 152, 219, 0.12);
            border-left-color: #3498db;
            font-weight: 600;
          }

          .nav-offcanvas .nav-list li a i {
            width: 20px;
            text-align: center;
            opacity: 0.8;
            font-size: 0.9rem;
          }

          .nav-offcanvas .nav-list li a:hover i {
            opacity: 1;
          }

          .nav-section-label {
            padding: 0.5rem 1.5rem 0.25rem;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #7f8c8d;
            font-weight: 600;
          }

          .nav-divider {
            border-top: 1px solid rgba(52, 152, 219, 0.15);
            margin: 0.5rem 1.25rem;
          }
        </style>

        <nav class="navbar modern-navbar">
            <div class="container-fluid">
                <a class="navbar-brand" href="../index.html">
                    <i class="fas fa-code" style="margin-right: 10px; font-size: 1.2rem;"></i>
                    Jason's .NET Integration
                </a>
                <button class="hamburger-btn" id="navHamburger" aria-label="Open navigation menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </nav>

        <div class="nav-offcanvas-backdrop" id="navBackdrop"></div>
        <div class="nav-offcanvas" id="navOffcanvas">
            <div class="nav-offcanvas-header">
                <h5><i class="fas fa-compass me-2"></i>Navigation</h5>
                <button class="nav-close-btn" id="navCloseBtn">&times;</button>
            </div>
            <div class="nav-section-label">Payments</div>
            <ul class="nav-list">
                <li>
                    <a href="../index.html" data-page="index.html">
                        <i class="fas fa-credit-card"></i>
                        Payment API
                    </a>
                </li>
                <li>
                    <a href="../PaymentComponent/paymentComponent.html" data-page="paymentComponent.html">
                        <i class="fas fa-puzzle-piece"></i>
                        Payment Component
                    </a>
                </li>
                <li>
                    <a href="../CloudApi/cloudPOS.html" data-page="cloudPOS.html">
                        <i class="fas fa-cloud"></i>
                        Cloud Transactions
                    </a>
                </li>
            </ul>
            <div class="nav-divider"></div>
            <div class="nav-section-label">Reporting</div>
            <ul class="nav-list">
                <li>
                    <a href="../TransactionHistory/transactionHistory.html" data-page="transactionHistory.html">
                        <i class="fas fa-receipt"></i>
                        Transaction History
                    </a>
                </li>
                <li>
                    <a href="../QueryApi/queryApi.html" data-page="queryApi.html">
                        <i class="fas fa-database"></i>
                        Query API
                    </a>
                </li>
                <li>
                    <a href="../ayncStatus.html" data-page="ayncStatus.html">
                        <i class="fas fa-sync-alt"></i>
                        Async Status API
                    </a>
                </li>
            </ul>
            <div class="nav-divider"></div>
            <div class="nav-section-label">Security & Tools</div>
            <ul class="nav-list">
                <li>
                    <a href="../3DSBrowser.html" data-page="3DSBrowser.html">
                        <i class="fas fa-shield-alt"></i>
                        3DS Browser
                    </a>
                </li>
                <li>
                    <a href="../.well-known/apple-developer-merchantid-domain-association" data-page="apple-developer-merchantid-domain-association">
                        <i class="fas fa-check-circle"></i>
                        Well-Known Endpoint
                    </a>
                </li>
                <li>
                    <a href="../eKashu.html" data-page="eKashu.html">
                        <i class="fas fa-wallet"></i>
                        eKashu
                    </a>
                </li>
            </ul>
            <div class="nav-divider"></div>
            <div class="nav-section-label">Partner</div>
            <ul class="nav-list">
                <li>
                    <a href="../PartnerApi/partnerApi.html" data-page="partnerApi.html">
                        <i class="fas fa-handshake"></i>
                        Partner API
                    </a>
                </li>
                <li>
                    <a href="../USAePay/usaepay.html" data-page="usaepay.html">
                        <i class="fas fa-university"></i>
                        USAePay
                    </a>
                </li>
            </ul>
            <div class="nav-divider"></div>
            <div class="nav-section-label">Classic API Integrations</div>
            <ul class="nav-list">
                <li>
                    <a href="../InvoiceApi/invoiceApi.html" data-page="invoiceApi.html">
                        <i class="fas fa-file-invoice-dollar"></i>
                        Invoice Management
                    </a>
                </li>
            </ul>
            <div class="nav-divider"></div>
            <div class="nav-section-label">V5 API</div>
            <ul class="nav-list">
                <li>
                    <a href="../V5Api/v5Api.html" data-page="v5Api.html">
                        <i class="fas fa-bolt"></i>
                        V5 Payments API
                    </a>
                </li>
                <li>
                    <a href="../V5Api/v5Collect3dsCheckout.html" data-page="v5Collect3dsCheckout.html">
                        <i class="fas fa-credit-card"></i>
                        V5 Collect + 3DS checkout
                    </a>
                </li>
            </ul>
        </div>`;

    initOffcanvasNav();
    setActiveNavItem();

  } else {
    console.error('Element with ID "mainNavBar" not found.');
  }
}

function initOffcanvasNav() {
  const hamburger = document.getElementById("navHamburger");
  const offcanvas = document.getElementById("navOffcanvas");
  const backdrop = document.getElementById("navBackdrop");
  const closeBtn = document.getElementById("navCloseBtn");

  function openNav() {
    offcanvas.classList.add("open");
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeNav() {
    offcanvas.classList.remove("open");
    backdrop.classList.remove("open");
    document.body.style.overflow = "";
  }

  if (hamburger) hamburger.addEventListener("click", openNav);
  if (closeBtn) closeBtn.addEventListener("click", closeNav);
  if (backdrop) backdrop.addEventListener("click", closeNav);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });
}

function setActiveNavItem() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".nav-offcanvas .nav-list a").forEach((link) => {
    link.classList.remove("active");
  });

  const activeLink = document.querySelector(
    `.nav-offcanvas .nav-list a[data-page="${currentPage}"]`
  );

  if (activeLink) {
    activeLink.classList.add("active");
  } else if (currentPage === "" || currentPage === "main.html" || currentPage === "Main.html") {
    const mainLink = document.querySelector(
      '.nav-offcanvas .nav-list a[data-page="index.html"]'
    );
    if (mainLink) mainLink.classList.add("active");
  }
}
