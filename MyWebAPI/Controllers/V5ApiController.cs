using System;
using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MyWebAPI.Controllers
{
    [ApiController]
    [Route("api/v5")]
    public class V5ApiController : ControllerBase
    {
        private readonly IHttpClientFactory _clientFactory;
        private readonly ILogger<V5ApiController> _logger;
        private readonly IConfiguration _configuration;

        public V5ApiController(
            IHttpClientFactory clientFactory,
            ILogger<V5ApiController> logger,
            IConfiguration configuration)
        {
            _clientFactory = clientFactory;
            _logger = logger;
            _configuration = configuration;
        }

        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                service = "NMI V5 API Proxy Controller"
            });
        }

        /// <summary>
        /// Forwards a sale payload to NMI <c>POST /api/v5/payments/sale</c>. Use the <c>Authorization</c> header for the NMI API key.
        /// Optional <c>baseUrl</c> query (e.g. <c>https://sandbox.nmi.com</c>); defaults to <c>https://secure.nmi.com</c>.
        /// </summary>
        [HttpPost("payments/sale")]
        public async Task<IActionResult> PaymentsSale(
            [FromBody] JsonElement body,
            [FromHeader(Name = "Authorization")] string? authorization,
            [FromQuery] string? baseUrl = null)
        {
            var apiKey = NormalizeAuthorizationKey(authorization);
            if (string.IsNullOrEmpty(apiKey))
            {
                return Unauthorized(new
                {
                    success = false,
                    error = "Missing Authorization",
                    message = "NMI API key is required in the Authorization header."
                });
            }

            return await ForwardNmiV5ApiAsync(
                HttpMethod.Post,
                "/v5/payments/sale",
                apiKey,
                baseUrl,
                body,
                defaultHostWhenBaseUrlEmpty: "https://secure.nmi.com");
        }

        /// <summary>
        /// Checkout demo endpoint for <c>wwwroot/V5Api/checkout.html</c>.
        /// Accepts { payment_token, amount } from the browser and runs a V5 sale
        /// server-side using the merchant's private key (Nmi:PrivateKey from config).
        /// The private key is never exposed to the frontend.
        /// </summary>
        [HttpPost("checkout/process-payment")]
        public async Task<IActionResult> CheckoutProcessPayment([FromBody] CheckoutPaymentRequest request)
        {
            _logger.LogInformation(
                "[checkout] /process-payment received token={TokenState} amount={Amount}",
                string.IsNullOrWhiteSpace(request?.PaymentToken) ? "(missing)" : "(present)",
                request?.Amount);

            if (request == null
                || string.IsNullOrWhiteSpace(request.PaymentToken)
                || string.IsNullOrWhiteSpace(request.Amount))
            {
                return BadRequest(new { error = "Missing required fields: payment_token, amount" });
            }

            var privateKey = _configuration["Nmi:PrivateKey"];
            if (string.IsNullOrWhiteSpace(privateKey))
            {
                _logger.LogError("[checkout] Nmi:PrivateKey is not set in configuration");
                return StatusCode(500, new
                {
                    error = "Server misconfigured: Nmi:PrivateKey is not set in appsettings/user-secrets."
                });
            }

            const string endpoint = "https://secure.nmi.com/api/v5/payments/sale";
            var bodyJson = JsonSerializer.Serialize(new
            {
                amount = request.Amount,
                payment_details = new { payment_token = request.PaymentToken }
            });

            _logger.LogInformation("[checkout] -> POST {Endpoint} body={Body}", endpoint, bodyJson);

            try
            {
                var client = _clientFactory.CreateClient();
                var msg = new HttpRequestMessage(HttpMethod.Post, endpoint);
                msg.Headers.TryAddWithoutValidation("Authorization", "Bearer " + privateKey);
                msg.Headers.Add("Accept", "application/json");
                msg.Content = new StringContent(bodyJson, Encoding.UTF8, "application/json");

                var response = await client.SendAsync(msg);
                var responseText = await response.Content.ReadAsStringAsync();

                _logger.LogInformation(
                    "[checkout] <- V5 status={Status} body={Body}",
                    (int)response.StatusCode, responseText);

                // Pass the raw V5 response through with its original status code.
                return new ContentResult
                {
                    StatusCode = (int)response.StatusCode,
                    ContentType = "application/json",
                    Content = string.IsNullOrEmpty(responseText) ? "{}" : responseText
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[checkout] V5 request failed");
                return StatusCode(502, new
                {
                    error = "Upstream V5 request failed",
                    detail = ex.Message
                });
            }
        }

        [HttpPost("proxy")]
        public async Task<IActionResult> Proxy([FromBody] V5ProxyRequest request)
        {
            try
            {
                var httpMethod = request.Method.ToUpperInvariant() switch
                {
                    "GET" => HttpMethod.Get,
                    "POST" => HttpMethod.Post,
                    "PUT" => HttpMethod.Put,
                    "PATCH" => new HttpMethod("PATCH"),
                    "DELETE" => HttpMethod.Delete,
                    _ => throw new ArgumentException($"Unsupported HTTP method: {request.Method}")
                };

                return await ForwardNmiV5ApiAsync(
                    httpMethod,
                    request.Url,
                    request.ApiKey,
                    request.BaseUrl,
                    request.Body,
                    defaultHostWhenBaseUrlEmpty: "https://sandbox.nmi.com");
            }
            catch (ArgumentException argEx)
            {
                return BadRequest(new { success = false, error = argEx.Message });
            }
        }

        private static string? NormalizeAuthorizationKey(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var v = value.Trim();
            if (v.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                v = v["Bearer ".Length..].Trim();
            }

            return string.IsNullOrEmpty(v) ? null : v;
        }

        private async Task<IActionResult> ForwardNmiV5ApiAsync(
            HttpMethod httpMethod,
            string relativeUrl,
            string apiKey,
            string? baseUrl,
            JsonElement? body,
            string defaultHostWhenBaseUrlEmpty)
        {
            try
            {
                var host = string.IsNullOrEmpty(baseUrl)
                    ? defaultHostWhenBaseUrlEmpty
                    : baseUrl.TrimEnd('/');
                var apiEndpoint = $"{host}/api{relativeUrl}";

                _logger.LogInformation("V5 API: {Method} {Endpoint}", httpMethod, apiEndpoint);

                var httpClient = _clientFactory.CreateClient();
                var requestMessage = new HttpRequestMessage(httpMethod, apiEndpoint);

                requestMessage.Headers.Add("Authorization", apiKey);
                requestMessage.Headers.Add("Accept", "application/json");

                if (body.HasValue &&
                    (httpMethod == HttpMethod.Post || httpMethod == HttpMethod.Put || httpMethod.Method == "PATCH"))
                {
                    var jsonContent = JsonSerializer.Serialize(body.Value);
                    requestMessage.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
                    requestMessage.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
                    _logger.LogInformation("V5 API request body: {Body}", jsonContent);
                }

                var response = await httpClient.SendAsync(requestMessage);
                var responseString = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("V5 API response: {StatusCode}", response.StatusCode);

                if (response.IsSuccessStatusCode)
                {
                    try
                    {
                        var jsonResponse = JsonSerializer.Deserialize<object>(responseString);

                        return Ok(new
                        {
                            success = true,
                            statusCode = (int)response.StatusCode,
                            data = jsonResponse,
                            timestamp = DateTime.UtcNow,
                            endpoint = apiEndpoint
                        });
                    }
                    catch (JsonException)
                    {
                        return Ok(new
                        {
                            success = true,
                            statusCode = (int)response.StatusCode,
                            data = responseString,
                            timestamp = DateTime.UtcNow,
                            endpoint = apiEndpoint
                        });
                    }
                }

                return Ok(new
                {
                    success = false,
                    statusCode = (int)response.StatusCode,
                    error = "NMI V5 API request failed",
                    message = responseString,
                    timestamp = DateTime.UtcNow,
                    endpoint = apiEndpoint
                });
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "HTTP error calling NMI V5 API: {Message}", httpEx.Message);
                return StatusCode(502, new
                {
                    success = false,
                    error = "Gateway error",
                    message = "Unable to connect to NMI V5 API",
                    details = httpEx.Message
                });
            }
            catch (TaskCanceledException tcEx)
            {
                _logger.LogError(tcEx, "Timeout calling NMI V5 API: {Message}", tcEx.Message);
                return StatusCode(504, new
                {
                    success = false,
                    error = "Gateway timeout",
                    message = "Request to NMI V5 API timed out",
                    details = tcEx.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing NMI V5 API request: {Message}", ex.Message);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    message = "An error occurred while processing your request",
                    details = ex.Message
                });
            }
        }

        [HttpPost("query-proxy")]
        public async Task<IActionResult> QueryProxy([FromBody] QueryProxyRequest request)
        {
            try
            {
                var host = string.IsNullOrEmpty(request.BaseUrl) ? "https://sandbox.nmi.com" : request.BaseUrl.TrimEnd('/');
                var apiEndpoint = $"{host}/api/query.php";

                _logger.LogInformation("Query Proxy: POST {Endpoint}", apiEndpoint);

                var httpClient = _clientFactory.CreateClient();

                var formData = new Dictionary<string, string>
                {
                    ["security_key"] = request.SecurityKey
                };

                if (request.Parameters != null)
                {
                    foreach (var kvp in request.Parameters)
                    {
                        if (!string.IsNullOrEmpty(kvp.Value))
                        {
                            formData[kvp.Key] = kvp.Value;
                        }
                    }
                }

                var content = new FormUrlEncodedContent(formData);
                var response = await httpClient.PostAsync(apiEndpoint, content);
                var responseString = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("Query Proxy response: {StatusCode}", response.StatusCode);

                return Ok(new
                {
                    success = response.IsSuccessStatusCode,
                    statusCode = (int)response.StatusCode,
                    data = responseString,
                    contentType = response.Content.Headers.ContentType?.MediaType ?? "text/xml",
                    timestamp = DateTime.UtcNow,
                    endpoint = apiEndpoint
                });
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "HTTP error calling NMI Query API: {Message}", httpEx.Message);
                return StatusCode(502, new
                {
                    success = false,
                    error = "Gateway error",
                    message = "Unable to connect to NMI Query API",
                    details = httpEx.Message
                });
            }
            catch (TaskCanceledException tcEx)
            {
                _logger.LogError(tcEx, "Timeout calling NMI Query API: {Message}", tcEx.Message);
                return StatusCode(504, new
                {
                    success = false,
                    error = "Gateway timeout",
                    message = "Request to NMI Query API timed out",
                    details = tcEx.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Query API proxy request: {Message}", ex.Message);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    message = ex.Message
                });
            }
        }
    }

    public class V5ProxyRequest
    {
        [Required]
        [JsonPropertyName("api_key")]
        public string ApiKey { get; set; } = string.Empty;

        [Required]
        [JsonPropertyName("method")]
        public string Method { get; set; } = string.Empty;

        [Required]
        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;

        [JsonPropertyName("body")]
        public JsonElement? Body { get; set; }

        [JsonPropertyName("baseUrl")]
        public string? BaseUrl { get; set; }
    }

    public class CheckoutPaymentRequest
    {
        [JsonPropertyName("payment_token")]
        public string PaymentToken { get; set; } = string.Empty;

        [JsonPropertyName("amount")]
        public string Amount { get; set; } = string.Empty;
    }

    public class QueryProxyRequest
    {
        [Required]
        [JsonPropertyName("security_key")]
        public string SecurityKey { get; set; } = string.Empty;

        [JsonPropertyName("parameters")]
        public Dictionary<string, string>? Parameters { get; set; }

        [JsonPropertyName("baseUrl")]
        public string? BaseUrl { get; set; }
    }
}
