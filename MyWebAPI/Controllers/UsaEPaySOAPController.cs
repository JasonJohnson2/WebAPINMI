using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using USAePay;

namespace MyWebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsaEPaySOAPController : ControllerBase
    {
        private readonly ILogger<UsaEPaySOAPController> _logger;
        private readonly string _sourceKey = "_743A1H0np2Sbmz0xe1rE72xM9Zd8862";
        private readonly string _pin = "9874";

        public UsaEPaySOAPController(ILogger<UsaEPaySOAPController> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Builds the security token required for USAePay SOAP API calls
        /// </summary>
        private ueSecurityToken BuildSecurityToken(string? clientIp = null)
        {
            var token = new ueSecurityToken
            {
                SourceKey = _sourceKey,
                ClientIP = clientIp ?? "127.0.0.1"
            };

            var hash = new ueHash
            {
                Type = "md5",
                Seed = Guid.NewGuid().ToString()
            };

            string prehashValue = string.Concat(token.SourceKey, hash.Seed, _pin);
            hash.HashValue = GenerateHash(prehashValue);

            token.PinHash = hash;

            return token;
        }

        /// <summary>
        /// Generates MD5 hash for the security token
        /// </summary>
        private static string GenerateHash(string input)
        {
            byte[] data = MD5.HashData(Encoding.Default.GetBytes(input));

            StringBuilder sBuilder = new StringBuilder();
            for (int i = 0; i < data.Length; i++)
            {
                sBuilder.Append(data[i].ToString("x2"));
            }

            return sBuilder.ToString();
        }

        /// <summary>
        /// Creates the SOAP client with proper binding
        /// </summary>
        private static ueSoapServerPortTypeClient CreateClient()
        {
            // Use the default endpoint from the generated code
            return new ueSoapServerPortTypeClient();
        }

        // Example endpoint - Get System Info
        [HttpGet("system-info")]
        public async Task<IActionResult> GetSystemInfo()
        {
            try
            {
                var client = CreateClient();
                var token = BuildSecurityToken(HttpContext.Connection.RemoteIpAddress?.ToString());

                var result = await client.getSystemInfoAsync(token);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Example endpoint - Run a Sale
        [HttpPost("run-sale")]
        public async Task<IActionResult> RunSale([FromBody] SaleRequest request)
        {
            try
            {
                // Log incoming request
                _logger.LogInformation("=== SOAP API RunSale Request ===");
                _logger.LogInformation("Incoming Request: {Request}", JsonSerializer.Serialize(request));
                _logger.LogInformation("Amount: {Amount}", request.Amount);
                _logger.LogInformation("CardNumber: {CardNumber}", request.CardNumber);
                _logger.LogInformation("Expiration: {Expiration}", request.Expiration);
                _logger.LogInformation("CVV: {CVV}", request.CVV ?? "null");

                var client = CreateClient();
                var token = BuildSecurityToken(HttpContext.Connection.RemoteIpAddress?.ToString());

                var transactionRequest = new TransactionRequestObject
                {
                    Details = new TransactionDetail
                    {
                        Amount = request.Amount,
                        Description = request.Description ?? "Sale",
                        AmountSpecified = true
                    },
                    CreditCardData = new CreditCardData
                    {
                        CardNumber = request.CardNumber,
                        CardExpiration = request.Expiration,
                        CardCode = request.CVV
                    },
                    SaveCard = request.SaveCard,
                    SaveCardSpecified = true
                };

                // Log transaction request object
                _logger.LogInformation("=== Transaction Request Object ===");
                _logger.LogInformation("Amount: {Amount}", transactionRequest.Details?.Amount);
                _logger.LogInformation("AmountSpecified: {AmountSpecified}", transactionRequest.Details?.AmountSpecified);
                _logger.LogInformation("Description: {Description}", transactionRequest.Details?.Description);
                _logger.LogInformation("CardNumber: {CardNumber}", transactionRequest.CreditCardData?.CardNumber);
                _logger.LogInformation("CardExpiration: {CardExpiration}", transactionRequest.CreditCardData?.CardExpiration);
                _logger.LogInformation("CardCode: {CardCode}", transactionRequest.CreditCardData?.CardCode ?? "null");
                _logger.LogInformation("SaveCard: {SaveCard}", transactionRequest.SaveCard);
                _logger.LogInformation("SaveCardSpecified: {SaveCardSpecified}", transactionRequest.SaveCardSpecified);

                var result = await client.runSaleAsync(token, transactionRequest);

                // Log result
                _logger.LogInformation("=== SOAP API Response ===");
                _logger.LogInformation("Result: {Result}", JsonSerializer.Serialize(result));

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error running SOAP sale transaction");
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        // Get Transaction Details
        [HttpGet("transaction-details/{transactionKey}")]
        public async Task<IActionResult> GetTransactionDetails(string transactionKey)
        {
            try
            {
                _logger.LogInformation("=== SOAP API GetTransactionDetails Request ===");
                _logger.LogInformation("Transaction Key: {TransactionKey}", transactionKey);

                var client = CreateClient();
                var token = BuildSecurityToken(HttpContext.Connection.RemoteIpAddress?.ToString());

                // Call the getTransaction SOAP method
                var result = await client.getTransactionAsync(token, transactionKey);

                _logger.LogInformation("=== SOAP API GetTransactionDetails Response ===");
                _logger.LogInformation("Result: {Result}", JsonSerializer.Serialize(result));

                // Return the transaction details
                return Ok(new
                {
                    key = result.Response?.TransKey,
                    refNum = result.Response?.RefNum,
                    status = result.Status,
                    amount = result.Details?.Amount,
                    authCode = result.Response?.AuthCode,
                    avsResult = result.Response?.AvsResult,
                    cvv2Result = result.Response?.CardCodeResult,
                    cardType = result.CreditCardData?.CardType,
                    cardNumber = result.CreditCardData?.CardNumber,
                    description = result.Details?.Description,
                    invoice = result.Details?.Invoice,
                    orderID = result.Details?.OrderID,
                    dateTime = result.DateTime,
                    dateTimeCreated = result.DateTime,
                    billingFirstName = result.BillingAddress?.FirstName,
                    billingLastName = result.BillingAddress?.LastName,
                    billingAddress = result.BillingAddress?.Street,
                    billingCity = result.BillingAddress?.City,
                    billingState = result.BillingAddress?.State,
                    billingZip = result.BillingAddress?.Zip
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting transaction details");
                return StatusCode(500, new { error = ex.Message, details = ex.StackTrace });
            }
        }
    }

    // Request DTOs
    public class SaleRequest
    {
        public double Amount { get; set; }
        public string CardNumber { get; set; } = string.Empty;
        public string Expiration { get; set; } = string.Empty;
        public string? CVV { get; set; }
        public string? Description { get; set; }
        public bool SaveCard { get; set; }
    }
}