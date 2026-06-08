# AGENTS.md - MyWebAPI Agent Guidelines

**MyWebAPI** is a .NET 10 Web API demonstrating multiple payment gateway integrations with a full-stack architecture (C# backend + vanilla JavaScript frontend).

## Quick Reference

### Build & Run Commands

```bash
# Run with watch mode (recommended for development)
dotnet watch run

# Build only
dotnet build

# Publish for production
dotnet publish
```

**Defaults:**

- HTTPS: `https://localhost:5125`
- HTTP: `http://localhost:5126`
- Configuration: `appsettings.json` + environment-specific overrides
- Secrets: `.NET User Secrets` (accessed via `Configuration["MyAppSettings:ApiKey"]`)

---

## Architecture Overview

### Backend (C# Controllers)

All controllers follow the **ASP.NET Core MVC pattern** with consistent dependency injection:

```csharp
[ApiController]
[Route("api")]
public class ControllerName : ControllerBase
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ControllerName> _logger;
    private readonly IConfiguration _configuration;

    public ControllerName(HttpClient httpClient, ILogger<ControllerName> logger, IConfiguration config)
    {
        _httpClient = httpClient;
        _logger = logger;
        _configuration = config;
    }
}
```

**Key Services Registered in Startup.cs:**

- `IHttpClientFactory` - Injected into controllers for HTTP requests
- `ILogger<T>` - Structured logging (use `_logger.LogInformation()`, etc.)
- `IConfiguration` - Access secrets & config values
- `IMemoryCache` - In-memory caching
- `ISession` - Session state (20-minute idle timeout)

### Frontend (Static Files in `wwwroot/`)

- **Location:** `/wwwroot/` (served as static content)
- **Pattern:** Each payment integration has dedicated HTML/JS pair
- **NMI npm packages:** `@nmipayments/nmi-pay`, `@nmipayments/nmi-pay-react`, `@nmipayments/nmi-reporting`
- **Testing utilities:** `/wwwroot/test/` contains seed data & factories via Bogus library

---

## Payment Integrations

See [Controllers/README.md](Controllers/README.md) for detailed endpoint documentation.

| Integration                      | Controller                | Frontend               | Key Features                               |
| -------------------------------- | ------------------------- | ---------------------- | ------------------------------------------ |
| **NMI Collect.js**               | `PaymentController.cs`    | `Main.html`, `main.js` | Card tokenization, ACH, Google Pay         |
| **NMI Payment Component**        | `PaymentApiController.cs` | `PaymentComponent/`    | 3D Secure 2.0, multiple payment methods    |
| **Cloud POS (Customer Present)** | `CloudController.cs`      | `CloudApi/cloudPOS.*`  | Device management, async/sync transactions |
| **USAePay**                      | `UsaEPayController.cs`    | `USAePay/`             | SOAP-based integration                     |
| **eKashu**                       | `EKashuController.cs`     | `eKashu.html`          | Alternative payment processor              |
| **NMI Partner API**              | `PartnerController.cs`    | `PartnerApi/`          | V4 API integration                         |
| **Query API**                    | `QueryController.cs`      | `QueryApi/`            | Transaction lookup/reporting               |

Each integration is **independent** — controllers can be modified without affecting others.

---

## Common Development Patterns

### Adding a New Payment Integration

1. **Create Controller** in `Controllers/` following the existing pattern:

   ```csharp
   [ApiController]
   [Route("api/yourintegration")]
   public class YourIntegrationController : ControllerBase { ... }
   ```

2. **Create Frontend** in `wwwroot/YourIntegration/`:
   - `yourintegration.html` (form UI)
   - `yourintegration.js` (client-side logic + API calls)
   - `yourintegration.css` (optional styling)

3. **Handle 3DS Authentication** (if needed):
   - Pass `cardHolderAuth`, `cavv`, `eci`, `xid`, `directoryServerId`, `threeDsVersion` from frontend to backend

4. **Test Data**: Use `/wwwroot/test/factories/` with **Bogus** library for generating test payment data

### API Response Patterns

Controllers typically:

- Log requests: `_logger.LogInformation()`
- Extract JSON: `jsonRequest.GetProperty()` (see `PaymentController.cs`)
- Make outbound HTTP calls via `_httpClient`
- Return success/error with structured JSON

### Session & Caching

- **Sessions**: Accessed via `HttpContext.Session` (20-min timeout)
- **Cache**: Inject `IMemoryCache` and use `CacheKeyGenerator` from `Utilities/` to generate keys from request parameters

---

## Configuration & Secrets

### Environment Files

- `appsettings.json` - Shared settings
- `appsettings.Development.json` - Dev-specific overrides

### Secrets Management

For sensitive API keys (NMI credentials, USAePay tokens, etc.):

```bash
# Add a secret (stored securely, not in repo)
dotnet user-secrets set "MyAppSettings:ApiKey" "your-secret-value"

# Access in code
var apiKey = _configuration["MyAppSettings:ApiKey"];
```

---

## Data Protection & Keys

- **Location:** `keys/` directory
- **Purpose:** ASP.NET Core data protection for session encryption, etc.
- **Auto-managed:** Keys are generated and persisted automatically
- **Do not commit** to version control

---

## Utility Functions

### CacheKeyGenerator

**Location:** `Utilities/CacheKeyGenrator.cs`

```csharp
var key = CacheKeyGenerator.GenerateCacheKey(
    new Dictionary<string, string> {
        { "deviceId", "123" },
        { "type", "sale" }
    }
);
// Result: "deviceId:123_type:sale"
```

### PrettyPrint

**Location:** `Utilities/PrettyPrint.cs` — likely for formatting XML/JSON responses

---

## Testing & Fake Data

- **Bogus Integration**: Used for generating realistic test payment data
- **Location:** `wwwroot/test/` contains:
  - `factories/` — Data factories
  - `devFillers.js` — Form auto-fill utilities
  - `seed.js` — Initial test data

---

## Important Notes

### CORS Configuration

- **Current:** All origins allowed (`AllowAnyOrigin()`) — suitable for development
- **Production:** Restrict to specific frontend domain in `Startup.cs` CORS policy

### Static File Serving

- Configured with `ServeUnknownFileTypes = true` and `DefaultContentType = "text/html"`
- Enables serving HTML files directly without extension

### API Key Management

- API keys are read from `Configuration["MyAppSettings:ApiKey"]` at startup
- Check console output to verify loading: `"My API Key: {ApiKey}"`

---

## File Organization Reference

```
Controllers/              ← C# backend logic (one controller per integration)
wwwroot/                 ← Static frontend (HTML, JS, CSS)
  └─ {Integration}/      ← Folder per major integration
Utilities/               ← Helper classes (caching, formatting)
keys/                    ← Data protection key ring (do not commit)
Properties/              ← launchSettings.json (port configuration)
ServiceReference/        ← SOAP service contracts (USAePay)
Program.cs               ← Entry point
Startup.cs               ← Service registration & middleware setup
appsettings*.json        ← Configuration files
MyWebAPI.http            ← REST Client test file (if using REST Client extension)
```

---

## Integration Spotlight: Cloud POS (Customer-Present)

The **Cloud POS** integration (`CloudController.cs` + `CloudApi/cloudPOS.*`) is the most complex in the codebase. Here's how it works:

### Architecture

```
cloudPOS.html (Form) → cloudPOS.js (Client State Machine)
                     ↓
              /cloud/devices (List POI devices)
              /cloud/{deviceId}/transaction (Process payment)
              /cloud/asyncstatus/{guid} (Poll for results)
```

### Key Features

1. **Device Discovery** (`GET /cloud/devices`)
   - Requires Bearer token authentication
   - Returns list of connected payment terminals
   - Caches results to avoid repeated API calls

2. **Transaction Processing** (POST `/cloud`)
   - **Sync Mode:** Waits for response (blocks UI)
   - **Async Mode:** Returns immediately with `guid`, must poll for status
   - Supports POI device prompts:
     - Tip prompt with preset percentages
     - Signature capture
     - Keyed entry (for fallback scenarios)
     - Custom menu selection

3. **Status Polling** (`GET /cloud/asyncstatus/{guid}`)
   - Only used in async mode
   - Returns: pending, completed, declined, error
   - Frontend implements exponential backoff (1s → 2s → 4s)

### Common Tasks

**Get list of registered devices:**
```csharp
var authorization = "Bearer " + securityKey;
var response = await _httpClient.GetAsync("https://secure.nmi.com/api/v2/devices/list");
```

**Process transaction synchronously:**
```csharp
var nmiRequest = new Dictionary<string, string>
{
    { "type", "sale" },
    { "amount", "10.00" },
    { "poi_device_id", deviceId },
    { "response_method", "synchronous" },
};
```

**Process transaction asynchronously (with tip prompt):**
```csharp
var nmiRequest = new Dictionary<string, string>
{
    { "type", "sale" },
    { "amount", "10.00" },
    { "poi_device_id", deviceId },
    { "response_method", "asynchronous" },
    { "poi_prompt_tip", "true" },
    { "poi_prompt_quicktip_percentages", "15.00,18.00,20.00" },
};
var response = await _httpClient.PostAsync("https://secure.nmi.com/api/v2/transactions", new FormUrlEncodedContent(nmiRequest));
var guid = JsonDocument.Parse(response).RootElement.GetProperty("guid").GetString();
```

### Debugging Cloud POS Issues

- **Device not appearing:** Check Bearer token is valid, device is online
- **Transaction stuck pending:** Increase async polling timeout or switch to sync mode
- **Signature never captured:** Device may be offline or prompt timed out
- **Amount mismatch:** Ensure `poi_device_id` and transaction `type` match device's expected format

See `.debug-3ds-flow` skill for guidance on 3DS issues (used in Cloud POS for card payments).

---

## When Making Changes

- **Backend changes:** Ensure proper logging (`_logger.LogInformation()`)
- **New API endpoints:** Update [Controllers/README.md](Controllers/README.md) with endpoint documentation
- **New dependencies:** Add to `MyWebAPI.csproj` and document in this file
- **Frontend updates:** Keep matching HTML/JS pairs together in `wwwroot/`
- **3DS support:** See `.debug-3ds-flow` skill for auth data debugging

---

## Customization Files

- **[.frontend-instructions.md](.frontend-instructions.md)** — Frontend patterns, Bootstrap form structure, NMI integration details
- **[.create-payment-integration](.create-payment-integration)** — Skill for adding a new payment integration
- **[.debug-3ds-flow](.debug-3ds-flow)** — Skill for troubleshooting 3D Secure authentication

## Related Documentation

- [Controllers/README.md](Controllers/README.md) — Detailed endpoint specifications
- [wwwroot/README.md](wwwroot/README.md) — Frontend module descriptions
- [wwwroot/test/README.md](wwwroot/test/README.md) — Testing utilities
