using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using RestSharp;
using System.Linq.Expressions;
using System.Security.Cryptography;
using System.Text;

namespace MyWebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsaEPayController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly string _baseUrl;

    public UsaEPayController(IConfiguration configuration)
    {
        _configuration = configuration;
        _baseUrl = _configuration["USAePay:BaseUrl"] ?? "https://sandbox.usaepay.com/api/v2/";
    }

    [HttpPost("sale")]
    public IActionResult ProcessSale([FromBody] PaymentRequest request)
    {
        try
        {
            // Generate USAePay authentication
            var authInfo = GenerateUSAePayAuth();

            Console.WriteLine($"DEBUG: About to call USAePay API with command: {request.Command}, amount: {request.Amount}");

            // Create REST request
            var client = new RestClient("https://sandbox.usaepay.com");
            var restRequest = new RestRequest("/api/v2/transactions", Method.Post);

            restRequest.AddHeader("Authorization", $"Basic {authInfo.AuthHeader}");
            restRequest.AddHeader("Content-Type", "application/json");

            // Build transaction data - use payment_key if provided (from Pay.js), otherwise use card details
            object transactionData;

            if (!string.IsNullOrEmpty(request.PaymentKey))
            {
                // Using Pay.js payment_key - card info is tokenized
                Console.WriteLine($"DEBUG: Using payment_key for transaction");
                transactionData = new
                {
                    command = request.Command,
                    amount = request.Amount.ToString("F2"),
                    payment_key = request.PaymentKey,
                    billing = new
                    {
                        name = $"{request.FirstName} {request.LastName}",
                        street = request.Address,
                        city = request.City,
                        state = request.State,
                        zip = request.ZipCode,
                        email = request.Email,
                        phone = request.Phone,
                        company = request.Company,
                        country = request.Country
                    }
                };
            }
            else
            {
                // Using raw card data (legacy)
                Console.WriteLine($"DEBUG: Using raw card data for transaction");
                transactionData = new
                {
                    command = request.Command,
                    amount = request.Amount.ToString("F2"),
                    creditcard = new
                    {
                        cardholder = $"{request.FirstName} {request.LastName}",
                        number = request.CardNumber,
                        expiration = request.ExpirationDate,
                        cvc = request.Cvv,
                        avs_street = request.Address,
                        avs_zip = request.ZipCode
                    },
                    billing = new
                    {
                        name = $"{request.FirstName} {request.LastName}",
                        street = request.Address,
                        city = request.City,
                        state = request.State,
                        zip = request.ZipCode,
                        email = request.Email,
                        phone = request.Phone,
                        company = request.Company,
                        country = request.Country
                    }
                };
            }

            restRequest.AddJsonBody(transactionData);

            Console.WriteLine($"DEBUG: Sending request to USAePay REST API...");
            var response = client.Execute(restRequest);

            Console.WriteLine($"DEBUG: Response Status: {response.StatusCode}");
            Console.WriteLine($"DEBUG: Response Content: {response.Content}");

            // Parse and return REST response
            if (response.IsSuccessful)
            {
                return Ok(new
                {
                    success = true,
                    data = response.Content,
                    statusCode = (int)response.StatusCode,
                    rawResponse = response.Content
                });
            }
            else
            {
                return StatusCode((int)response.StatusCode, new
                {
                    success = false,
                    error = response.ErrorMessage ?? "API request failed",
                    statusCode = (int)response.StatusCode,
                    rawResponse = response.Content
                });
            }



        }
        catch (Exception ex)
        {
            // Log the full exception for debugging
            Console.WriteLine($"USAePay Error: {ex.Message}");
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");

            return StatusCode(500, new
            {
                success = false,
                error = ex.Message,
                details = ex.InnerException?.Message,
                stackTrace = ex.StackTrace
            });
        }
    }

    [HttpGet("query/{transactionKey}")]
    public IActionResult Query(string transactionKey)
    {
        try
        {
            // Validate transaction key
            if (string.IsNullOrEmpty(transactionKey))
            {
                return BadRequest(new { success = false, error = "Transaction key is required" });
            }

            // Reuse the same authentication method
            var authInfo = GenerateUSAePayAuth();

            Console.WriteLine($"DEBUG: Querying transaction: {transactionKey}");

            // Make GET request to USAePay API (not POST)
            var client = new RestClient("https://sandbox.usaepay.com");
            var request = new RestRequest($"/api/v2/transactions/{transactionKey}", Method.Get);
            request.AddHeader("Authorization", $"Basic {authInfo.AuthHeader}");

            Console.WriteLine($"DEBUG: Sending GET request to USAePay for transaction: {transactionKey}");
            var response = client.Execute(request);

            Console.WriteLine($"DEBUG: USAePay Response Status: {response.StatusCode}");
            Console.WriteLine($"DEBUG: USAePay Response Content: {response.Content}");

            if (response.IsSuccessful)
            {
                return Ok(new
                {
                    success = true,
                    data = response.Content,
                    transactionKey = transactionKey,
                    statusCode = (int)response.StatusCode
                });
            }
            else
            {
                return StatusCode((int)response.StatusCode, new
                {
                    success = false,
                    error = response.ErrorMessage ?? "Failed to retrieve transaction",
                    transactionKey = transactionKey,
                    statusCode = (int)response.StatusCode,
                    rawResponse = response.Content
                });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"DEBUG: Exception in Query: {ex.Message}");
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpPost("tokenize")]
    public IActionResult Tokenize([FromBody] PaymentRequest request)
    {
        try
        {
            var authInfo = GenerateUSAePayAuth();
            var client = new RestClient("https://sandbox.usaepay.com");
            var restRequest = new RestRequest("/api/v2/transactions", Method.Post);
            restRequest.AddHeader("Authorization", $"Basic {authInfo.AuthHeader}");
            restRequest.AddHeader("Content-Type", "application/json");

            // Build transaction data dynamically based on what's provided
            var transactionData = new
            {
                command = request.Command,
                amount = (request.Amount > 0 && !request.Command.Contains("save", StringComparison.OrdinalIgnoreCase)) 
                    ? request.Amount.ToString("F2") : null,
                creditcard = new
                {
                    cardholder = !string.IsNullOrEmpty(request.Cardholder) ? request.Cardholder : null,
                    number = request.CardNumber,
                    expiration = request.ExpirationDate,
                    cvc = !string.IsNullOrEmpty(request.Cvv) ? request.Cvv : null,
                    avs_street = !string.IsNullOrEmpty(request.AvsStreet) ? request.AvsStreet : null,
                    avs_zip = !string.IsNullOrEmpty(request.AvsPostalcode) ? request.AvsPostalcode : null
                },
                invoice = !string.IsNullOrEmpty(request.Invoice) ? request.Invoice : null,
                ponum = !string.IsNullOrEmpty(request.OrderId) ? request.OrderId : null,
                description = !string.IsNullOrEmpty(request.Description) ? request.Description : null,
                custom_field1 = !string.IsNullOrEmpty(request.CustomField1) ? request.CustomField1 : null
            };

            restRequest.AddJsonBody(transactionData);

            Console.WriteLine($"DEBUG: Sending request to USAePay REST API...");
            Console.WriteLine($"DEBUG: Request Data: {JsonConvert.SerializeObject(transactionData)}");
            var response = client.Execute(restRequest);

            Console.WriteLine($"DEBUG: Response Status: {response.StatusCode}");
            Console.WriteLine($"DEBUG: Response Content: {response.Content}");

            if (response.IsSuccessful)
            {
                return Ok(new
                {
                    success = true,
                    data = response.Content,
                    statusCode = (int)response.StatusCode
                });
            }
            else
            {
                return StatusCode((int)response.StatusCode, new
                {
                    success = false,
                    error = response.ErrorMessage ?? "Failed to process transaction",
                    statusCode = (int)response.StatusCode,
                    rawResponse = response.Content
                });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"DEBUG: Exception in Tokenize: {ex.Message}");
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpPost("tokenTransaction")]
    public IActionResult TokenTransaction([FromBody] PaymentRequest request)
    {
        try
        {
            var authInfo = GenerateUSAePayAuth();
            var client = new RestClient("https://sandbox.usaepay.com");
            var restRequest = new RestRequest("/api/v2/transactions", Method.Post);
            restRequest.AddHeader("Authorization", $"Basic {authInfo.AuthHeader}");
            restRequest.AddHeader("Content-Type", "application/json");

            // Build transaction data with optional parameters
            var transactionData = new
            {
                command = request.Command,
                amount = request.Amount > 0 ? request.Amount.ToString("F2") : null,
                creditcard = new
                {
                    number = request.Token
                },
                invoice = !string.IsNullOrEmpty(request.Invoice) ? request.Invoice : null,
                ponum = !string.IsNullOrEmpty(request.OrderId) ? request.OrderId : null,
                description = !string.IsNullOrEmpty(request.Description) ? request.Description : null,
                custom_field1 = !string.IsNullOrEmpty(request.CustomField1) ? request.CustomField1 : null
            };

            restRequest.AddJsonBody(transactionData);
            Console.WriteLine($"DEBUG: Sending request to USAePay REST API for token transaction...");
            Console.WriteLine($"DEBUG: Request Data: {JsonConvert.SerializeObject(transactionData)}");
            var response = client.Execute(restRequest);

            if (response.IsSuccessful)
            {
                return Ok(new
                {
                    success = true,
                    data = response.Content,
                    statusCode = (int)response.StatusCode
                });
            }
            else
            {
                return StatusCode((int)response.StatusCode, new
                {
                    success = false,
                    error = response.ErrorMessage ?? "Failed to process token transaction",
                    statusCode = (int)response.StatusCode,
                    rawResponse = response.Content
                });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"DEBUG: Exception in TokenTransaction: {ex.Message}");
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }
    // Parse USAePay's URL-encoded response
    private Dictionary<string, string> ParseResponse(string responseContent)
    {
        var result = new Dictionary<string, string>();

        if (string.IsNullOrEmpty(responseContent))
            return result;

        var parameters = responseContent.Split('&');
        foreach (var parameter in parameters)
        {
            var keyValue = parameter.Split('=', 2);
            if (keyValue.Length == 2)
            {
                var key = Uri.UnescapeDataString(keyValue[0]);
                var value = Uri.UnescapeDataString(keyValue[1]);
                result[key] = value;
            }
        }

        return result;
    }

    // Generate random seed for UMhash
    private string GenerateRandomSeed(int length = 8)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();
        return new string(Enumerable.Repeat(chars, length)
            .Select(s => s[random.Next(s.Length)]).ToArray());
    }

    // Generate UMhash for authentication
    private string GenerateUMHash(string command, string pin, decimal amount, string invoice, string seed)
    {
        var preHashData = $"{command}:{pin}:{amount:F2}:{invoice}:{seed}";

        using (var md5 = MD5.Create())
        {
            var hashBytes = md5.ComputeHash(Encoding.UTF8.GetBytes(preHashData));
            var hashString = Convert.ToHexString(hashBytes).ToLower();
            return $"m/{seed}/{hashString}/n";
        }
    }

    // Generate SHA256 hash for REST API authentication
    private string GenerateSHA256Hash(string input)
    {
        using (var sha256 = SHA256.Create())
        {
            var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(hashBytes).ToLower();
        }
    }

    // Generate USAePay authentication information
    private USAePayAuth GenerateUSAePayAuth()
    {
        // Get credentials from configuration
        var apiKey = _configuration["USAePay:ApiKey"] ?? "_743A1H0np2Sbmz0xe1rE72xM9Zd8862";
        var pin = _configuration["USAePay:Pin"] ?? "9874";

        Console.WriteLine($"DEBUG: Using API Key: {apiKey}");
        Console.WriteLine($"DEBUG: Using PIN: {pin}");
        Console.WriteLine($"DEBUG: Configuration ApiKey: {_configuration["USAePay:ApiKey"]}");
        Console.WriteLine($"DEBUG: Configuration Pin: {_configuration["USAePay:Pin"]}");
        Console.WriteLine($"DEBUG: Using REST API approach");

        // Generate authentication header (s2/seed/hash format)
        var seed = GenerateRandomSeed();
        var preHash = apiKey + seed + pin;
        var hashHex = GenerateSHA256Hash(preHash);
        var apiHash = $"s2/{seed}/{hashHex}";
        var authString = $"{apiKey}:{apiHash}";
        var authBytes = Encoding.UTF8.GetBytes(authString);
        var authHeader = Convert.ToBase64String(authBytes);

        Console.WriteLine($"DEBUG: Generated auth - Seed: {seed}");
        Console.WriteLine($"DEBUG: Auth Header: Basic {authHeader}");

        return new USAePayAuth
        {
            ApiKey = apiKey,
            Pin = pin,
            Seed = seed,
            ApiHash = apiHash,
            AuthHeader = authHeader
        };
    }
}

// Helper class to hold USAePay authentication information
public class USAePayAuth
{
    public string ApiKey { get; set; } = string.Empty;
    public string Pin { get; set; } = string.Empty;
    public string Seed { get; set; } = string.Empty;
    public string ApiHash { get; set; } = string.Empty;
    public string AuthHeader { get; set; } = string.Empty;
}

// Simple request model
public class PaymentRequest
{
    public decimal Amount { get; set; }
    public string CardNumber { get; set; } = string.Empty;
    public string ExpirationDate { get; set; } = string.Empty;
    public string Cvv { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string Command { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public string OrderId { get; set; } = string.Empty;
    public string OrderDescription { get; set; } = string.Empty;
    public string Cardholder { get; set; } = string.Empty;
    public string AvsStreet { get; set; } = string.Empty;
    public string AvsPostalcode { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string PaymentKey { get; set; } = string.Empty;
    public string Invoice { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CustomField1 { get; set; } = string.Empty;
}
