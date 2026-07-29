// Server-side code (C#/.NET Core)
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

[ApiController]
[Route("api")]
public class PaymentController : ControllerBase
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PaymentController> _logger;

    public PaymentController(HttpClient httpClient, ILogger<PaymentController> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    [HttpPost("pay")]
    public async Task<IActionResult> ProcessPayment([FromBody] JsonElement jsonRequest)
    {
        try
        {
            _logger.LogInformation("Processing payment");
            _logger.LogInformation("Raw JSON Request: {JsonRequest}", jsonRequest);

            // Extract values from JSON manually to avoid binding issues
            string? paymentToken = null;
            decimal amountValue = 0;
            string? currency = null;

            // Customer information fields
            string? firstName = null;
            string? lastName = null;
            string? email = null;
            string? phone = null;
            string? company = null;

            // Billing address fields
            string? address1 = null;
            string? address2 = null;
            string? city = null;
            string? state = null;
            string? zip = null;
            string? country = null;

            try
            {
                paymentToken = jsonRequest.GetProperty("paymentToken").GetString();
                amountValue = jsonRequest.GetProperty("amount").GetDecimal();

                // Optional fields
                if (jsonRequest.TryGetProperty("currency", out var currencyProp))
                    currency = currencyProp.GetString();

                // Customer information
                if (jsonRequest.TryGetProperty("first_name", out var firstNameProp))
                    firstName = firstNameProp.GetString();
                if (jsonRequest.TryGetProperty("last_name", out var lastNameProp))
                    lastName = lastNameProp.GetString();
                if (jsonRequest.TryGetProperty("email", out var emailProp))
                    email = emailProp.GetString();
                if (jsonRequest.TryGetProperty("phone", out var phoneProp))
                    phone = phoneProp.GetString();
                if (jsonRequest.TryGetProperty("company", out var companyProp))
                    company = companyProp.GetString();

                // Billing address
                if (jsonRequest.TryGetProperty("address1", out var address1Prop))
                    address1 = address1Prop.GetString();
                if (jsonRequest.TryGetProperty("address2", out var address2Prop))
                    address2 = address2Prop.GetString();
                if (jsonRequest.TryGetProperty("city", out var cityProp))
                    city = cityProp.GetString();
                if (jsonRequest.TryGetProperty("state", out var stateProp))
                    state = stateProp.GetString();
                if (jsonRequest.TryGetProperty("zip", out var zipProp))
                    zip = zipProp.GetString();
                if (jsonRequest.TryGetProperty("country", out var countryProp))
                    country = countryProp.GetString();
            }
            catch (KeyNotFoundException)
            {
                return BadRequest(new { success = false, error = "Required fields 'paymentToken' and 'amount' are missing" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, error = $"Invalid data format: {ex.Message}" });
            }

            if (string.IsNullOrEmpty(paymentToken))
            {
                return BadRequest(new { success = false, error = "Payment token is required" });
            }

            if (amountValue <= 0)
            {
                return BadRequest(new { success = false, error = "Amount must be greater than zero" });
            }


            // Convert to Dictionary for NMI API
            var nmiRequest = new Dictionary<string, string>
            {
                ["payment_token"] = paymentToken,
                ["amount"] = amountValue.ToString("F2"),
                ["type"] = "sale"
            };

            // Add customer information if provided
            if (!string.IsNullOrEmpty(firstName))
                nmiRequest["first_name"] = firstName;
            if (!string.IsNullOrEmpty(lastName))
                nmiRequest["last_name"] = lastName;
            if (!string.IsNullOrEmpty(email))
                nmiRequest["email"] = email;
            if (!string.IsNullOrEmpty(phone))
                nmiRequest["phone"] = phone;
            if (!string.IsNullOrEmpty(company))
                nmiRequest["company"] = company;

            // Add billing address if provided
            if (!string.IsNullOrEmpty(address1))
                nmiRequest["address1"] = address1;
            if (!string.IsNullOrEmpty(address2))
                nmiRequest["address2"] = address2;
            if (!string.IsNullOrEmpty(city))
                nmiRequest["city"] = city;
            if (!string.IsNullOrEmpty(state))
                nmiRequest["state"] = state;
            if (!string.IsNullOrEmpty(zip))
                nmiRequest["zip"] = zip;
            if (!string.IsNullOrEmpty(country))
                nmiRequest["country"] = country;

            // Add currency if provided
            if (!string.IsNullOrEmpty(currency))
                nmiRequest["currency"] = currency;

            // Check if this transaction includes 3DS authentication data
            // 3DS is applied automatically by the NMI widget when required by the card/issuer
            bool is3DSTransaction = false;

            // Add optional 3DS fields if present (check if they exist in JSON)
            if (jsonRequest.TryGetProperty("cardHolderAuth", out var cardHolderAuth))
            {
                var cardHolderAuthValue = cardHolderAuth.GetString();
                if (!string.IsNullOrEmpty(cardHolderAuthValue))
                {
                    nmiRequest["cardholder_auth"] = cardHolderAuthValue;
                    is3DSTransaction = true;
                }
            }

            if (jsonRequest.TryGetProperty("cavv", out var cavv))
            {
                var cavvValue = cavv.GetString();
                if (!string.IsNullOrEmpty(cavvValue))
                {
                    nmiRequest["cavv"] = cavvValue;
                    is3DSTransaction = true;
                }
            }

            if (jsonRequest.TryGetProperty("eci", out var eci))
            {
                string? eciValue = null;
                if (eci.ValueKind == JsonValueKind.String)
                {
                    eciValue = eci.GetString();
                }
                else if (eci.ValueKind == JsonValueKind.Number)
                {
                    eciValue = eci.GetInt32().ToString();
                }

                if (!string.IsNullOrEmpty(eciValue))
                {
                    nmiRequest["eci"] = eciValue;
                    is3DSTransaction = true;
                }
            }

            if (jsonRequest.TryGetProperty("directoryServerId", out var directoryServerId))
            {
                var directoryServerIdValue = directoryServerId.GetString();
                if (!string.IsNullOrEmpty(directoryServerIdValue))
                {
                    nmiRequest["directory_server_id"] = directoryServerIdValue;
                    is3DSTransaction = true;
                }
            }

            if (jsonRequest.TryGetProperty("threeDsVersion", out var threeDsVersion))
            {
                var threeDsVersionValue = threeDsVersion.GetString();
                if (!string.IsNullOrEmpty(threeDsVersionValue))
                {
                    nmiRequest["three_ds_version"] = threeDsVersionValue;
                    is3DSTransaction = true;
                }
            }

            if (jsonRequest.TryGetProperty("xid", out var xid))
            {
                var xidValue = xid.GetString();
                if (!string.IsNullOrEmpty(xidValue))
                {
                    nmiRequest["xid"] = xidValue;
                    is3DSTransaction = true;
                }
            }

            // Determine environment from request (defaults to sandbox)
            var env = "sandbox";
            if (jsonRequest.TryGetProperty("nmi_env", out var nmiEnvProp))
            {
                var nmiEnvValue = nmiEnvProp.GetString();
                if (string.Equals(nmiEnvValue, "secure", StringComparison.OrdinalIgnoreCase))
                {
                    env = "secure";
                }
            }

            // Select security key + gateway URL based on environment.
            // The security key must match the tokenization-key environment used on the client,
            // otherwise NMI rejects with "Sandbox accounts must use sandbox.nmi.com".
            const string SandboxSecurityKey = "Kes9dc87682hQHn6JSTTs44uyvz66c56";
            const string SecureSecurityKey = "dWE6997j8s3rEwK75a4d53t6gZgJUEev";
            nmiRequest["security_key"] = env == "secure" ? SecureSecurityKey : SandboxSecurityKey;

            var nmiTransactUrl = env == "secure"
                ? "https://secure.nmi.com/api/transact.php"
                : "https://sandbox.nmi.com/api/transact.php";

            if (is3DSTransaction)
            {
                _logger.LogInformation("Processing transaction with 3D Secure authentication data");
            }
            else
            {
                _logger.LogInformation("Processing standard transaction (3DS was not required)");
            }

            // Log the NMI request for debugging
            _logger.LogInformation("NMI Request parameters (env={Env}): {NmiRequest}", env, string.Join(", ", nmiRequest.Select(kvp => $"{kvp.Key}={kvp.Value}")));

            var content = new FormUrlEncodedContent(nmiRequest);

            _logger.LogInformation("Calling NMI API at: {NmiUrl}", nmiTransactUrl);
            var response = await _httpClient.PostAsync(nmiTransactUrl, content);

            var responseString = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("NMI API Response: {ResponseString}", responseString);

            // Parse response (query string format)
            var responseData = ParseQueryString(responseString);

            // Check for successful response (response code 1)
            if (responseData.TryGetValue("response", out var responseCode) && responseCode == "1")
            {
                return Ok(new
                {
                    success = true,
                    transactionId = responseData.GetValueOrDefault("transactionid")
                });
            }
            else
            {
                return Ok(new
                {
                    success = false,
                    error = responseData.GetValueOrDefault("responsetext", "Unknown error")
                });
            }
        }
        catch (Exception error)
        {
            _logger.LogError(error, "Payment processing error: {ErrorMessage}", error.Message);
            _logger.LogError("Error details: {ErrorDetails}", error.ToString());

            return StatusCode(500, new
            {
                success = false,
                error = $"Payment processing error: {error.Message}",
                details = error.ToString() // Include full error details for debugging
            });
        }
    }

    private static Dictionary<string, string> ParseQueryString(string queryString)
    {
        var result = new Dictionary<string, string>();

        if (!string.IsNullOrEmpty(queryString))
        {
            var pairs = queryString.Split('&');
            foreach (var pair in pairs)
            {
                var parts = pair.Split('=', 2);
                if (parts.Length == 2)
                {
                    result[parts[0]] = parts[1];
                }
            }
        }

        return result;
    }

    public class PaymentRequest
    {
        [Required]
        [JsonPropertyName("paymentToken")]
        public string PaymentToken { get; set; } = string.Empty;

        [Required]
        [JsonPropertyName("amount")]
        public decimal Amount { get; set; }

        [JsonPropertyName("currency")]
        public string? Currency { get; set; }

        // Customer Information (NMI field names)
        [JsonPropertyName("first_name")]
        public string? FirstName { get; set; }

        [JsonPropertyName("last_name")]
        public string? LastName { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("phone")]
        public string? Phone { get; set; }

        [JsonPropertyName("company")]
        public string? Company { get; set; }

        // Billing Address (NMI field names)
        [JsonPropertyName("address1")]
        public string? Address1 { get; set; }

        [JsonPropertyName("address2")]
        public string? Address2 { get; set; }

        [JsonPropertyName("city")]
        public string? City { get; set; }

        [JsonPropertyName("state")]
        public string? State { get; set; }

        [JsonPropertyName("zip")]
        public string? Zip { get; set; }

        [JsonPropertyName("country")]
        public string? Country { get; set; }

        // 3DS Fields
        [JsonPropertyName("cardHolderAuth")]
        public string? CardHolderAuth { get; set; }

        [JsonPropertyName("cavv")]
        public string? Cavv { get; set; }

        [JsonPropertyName("directoryServerId")]
        public string? DirectoryServerId { get; set; }

        [JsonPropertyName("eci")]
        public string? Eci { get; set; }

        [JsonPropertyName("threeDsVersion")]
        public string? ThreeDsVersion { get; set; }

        [JsonPropertyName("xid")]
        public string? Xid { get; set; }
    }
}