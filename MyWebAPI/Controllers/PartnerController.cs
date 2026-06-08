using System;
using System.Collections.Generic;
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
    [Route("api/partner")]
    public class PartnerController : ControllerBase
    {
        private readonly IHttpClientFactory _clientFactory;
        private readonly ILogger<PartnerController> _logger;
        private readonly IConfiguration _configuration;

        public PartnerController(
            IHttpClientFactory clientFactory,
            ILogger<PartnerController> logger,
            IConfiguration configuration)
        {
            _clientFactory = clientFactory;
            _logger = logger;
            _configuration = configuration;
        }

        [HttpPost("transaction-data")]
        public async Task<IActionResult> GetTransactionData([FromBody] TransactionDataRequest request)
        {
            try
            {
                _logger.LogInformation("Processing NMI V4 API request for transaction data");
                _logger.LogInformation("Request parameters: {Request}", JsonSerializer.Serialize(request));


                // Create HTTP client
                var httpClient = _clientFactory.CreateClient();

                // Prepare JSON data according to V4 API specification
                var requestBody = new Dictionary<string, object>
                {
                    // maxResults is required (string type per API spec)
                    ["maxResults"] = "100"
                };

                // Add merchantId if provided (singular field)
                if (!string.IsNullOrEmpty(request.MerchantId))
                {
                    requestBody["merchantId"] = request.MerchantId;
                }

                // Add transactionIds as array if provided (V4 API expects array)
                if (!string.IsNullOrEmpty(request.TransactionId))
                {
                    requestBody["transactionIds"] = new[] { request.TransactionId };
                }

                // Add date object with start/end if provided (nested object per API spec)
                if (request.StartDate.HasValue || request.EndDate.HasValue)
                {
                    var dateObj = new Dictionary<string, string>();
                    if (request.StartDate.HasValue)
                    {
                        // Use ISO 8601 format with timezone offset like "2005-08-15T15:52:01+00:00"
                        dateObj["start"] = request.StartDate.Value.ToString("yyyy-MM-ddTHH:mm:ssK");
                    }
                    if (request.EndDate.HasValue)
                    {
                        // Use ISO 8601 format with timezone offset like "2005-08-15T15:52:01+00:00"  
                        dateObj["end"] = request.EndDate.Value.ToString("yyyy-MM-ddTHH:mm:ssK");
                    }

                    requestBody["date"] = dateObj;
                }

                // Add statuses as array if provided (V4 API expects array)
                if (!string.IsNullOrEmpty(request.TransactionStatus))
                {
                    requestBody["statuses"] = new[] { request.TransactionStatus };
                }

                // Add amount object with min/max if provided (nested object per API spec)  
                if (request.MinAmount.HasValue || request.MaxAmount.HasValue)
                {
                    var amountObj = new Dictionary<string, object>();
                    if (request.MinAmount.HasValue)
                        amountObj["min"] = request.MinAmount.Value;
                    if (request.MaxAmount.HasValue)
                        amountObj["max"] = request.MaxAmount.Value;

                    requestBody["amount"] = amountObj;
                }

                // Log the request parameters
                _logger.LogInformation("NMI V4 API Request parameters: {RequestBody}", JsonSerializer.Serialize(requestBody));

                // Prepare JSON content - exactly like working example
                var jsonContent = JsonSerializer.Serialize(requestBody);
                _logger.LogInformation("=== DETAILED REQUEST LOG ===");
                _logger.LogInformation("Raw JSON being sent: {JsonContent}", jsonContent);
                _logger.LogInformation("JSON Length: {Length} bytes", jsonContent.Length);
                _logger.LogInformation("API Key (first 10 chars): {ApiKeyPrefix}...", request.ApiKey.Length > 10 ? request.ApiKey.Substring(0, 10) : request.ApiKey);

                // Create HTTP request message for explicit control over headers
                var host = string.IsNullOrEmpty(request.BaseUrl) ? "https://sandbox.nmi.com" : request.BaseUrl.TrimEnd('/');
                var apiEndpoint = $"{host}/api/v4/transactions/reports";
                var requestMessage = new HttpRequestMessage(HttpMethod.Post, apiEndpoint);

                // Set content with explicit JSON media type
                requestMessage.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                // Set headers EXACTLY like working RestClient example
                requestMessage.Headers.Add("Authorization", request.ApiKey);

                // Explicitly set Content-Type like working RestClient example
                requestMessage.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");

                _logger.LogInformation("Calling NMI V4 API at: {Endpoint}", apiEndpoint);
                _logger.LogInformation("Request Headers:");
                foreach (var header in requestMessage.Headers)
                {
                    _logger.LogInformation("  {HeaderName}: {HeaderValue}", header.Key, string.Join(", ", header.Value));
                }
                _logger.LogInformation("Content Headers:");
                if (requestMessage.Content?.Headers != null)
                {
                    foreach (var header in requestMessage.Content.Headers)
                    {
                        _logger.LogInformation("  {HeaderName}: {HeaderValue}", header.Key, string.Join(", ", header.Value));
                    }
                }

                var response = await httpClient.SendAsync(requestMessage);
                var responseString = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("NMI V4 API Response Status: {StatusCode}", response.StatusCode);
                _logger.LogInformation("NMI V4 API Response: {Response}", responseString);

                // Check if request was successful
                if (response.IsSuccessStatusCode)
                {
                    try
                    {
                        // Try to parse as JSON
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
                        // If not JSON, return as string
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
                else
                {
                    return Ok(new
                    {
                        success = false,
                        statusCode = (int)response.StatusCode,
                        error = "NMI API request failed",
                        message = responseString,
                        timestamp = DateTime.UtcNow,
                        endpoint = apiEndpoint
                    });
                }
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "HTTP error calling NMI V4 API: {Message}", httpEx.Message);
                return StatusCode(502, new
                {
                    success = false,
                    error = "Gateway error",
                    message = "Unable to connect to NMI API",
                    details = httpEx.Message
                });
            }
            catch (TaskCanceledException tcEx)
            {
                _logger.LogError(tcEx, "Timeout calling NMI V4 API: {Message}", tcEx.Message);
                return StatusCode(504, new
                {
                    success = false,
                    error = "Gateway timeout",
                    message = "Request to NMI API timed out",
                    details = tcEx.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing NMI V4 API request: {Message}", ex.Message);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    message = "An error occurred while processing your request",
                    details = ex.Message
                });
            }
        }

        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                service = "NMI Partner API Controller"
            });
        }

        [HttpPost("debug-request")]
        public IActionResult DebugRequest([FromBody] TransactionDataRequest request)
        {
            try
            {
                // Show exactly what we would send to NMI - SAME format as actual request
                var requestBody = new Dictionary<string, object>
                {
                    ["maxResults"] = "100"
                };

                if (!string.IsNullOrEmpty(request.MerchantId))
                    requestBody["merchantId"] = request.MerchantId;

                if (!string.IsNullOrEmpty(request.TransactionId))
                    requestBody["transactionIds"] = new[] { request.TransactionId };

                if (request.StartDate.HasValue || request.EndDate.HasValue)
                {
                    var dateObj = new Dictionary<string, string>();
                    if (request.StartDate.HasValue)
                        dateObj["start"] = request.StartDate.Value.ToString("yyyy-MM-ddTHH:mm:ssK");
                    if (request.EndDate.HasValue)
                        dateObj["end"] = request.EndDate.Value.ToString("yyyy-MM-ddTHH:mm:ssK");

                    requestBody["date"] = dateObj;
                }

                if (!string.IsNullOrEmpty(request.TransactionStatus))
                    requestBody["statuses"] = new[] { request.TransactionStatus };

                if (request.MinAmount.HasValue || request.MaxAmount.HasValue)
                {
                    var amountObj = new Dictionary<string, object>();
                    if (request.MinAmount.HasValue)
                        amountObj["min"] = request.MinAmount.Value;
                    if (request.MaxAmount.HasValue)
                        amountObj["max"] = request.MaxAmount.Value;

                    requestBody["amount"] = amountObj;
                }

                var jsonContent = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions { WriteIndented = true });
                var debugHost = string.IsNullOrEmpty(request.BaseUrl) ? "https://sandbox.nmi.com" : request.BaseUrl.TrimEnd('/');

                return Ok(new
                {
                    success = true,
                    message = "Debug info - this is what would be sent to NMI V4 API",
                    endpoint = $"{debugHost}/api/v4/transactions/reports",
                    headers = new
                    {
                        Authorization = "***REDACTED***",
                        Accept = "application/json",
                        ContentType = "application/json"
                    },
                    requestBody = requestBody,
                    jsonContent = jsonContent,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    success = false,
                    error = "Debug request failed",
                    details = ex.Message
                });
            }
        }

        [HttpPost("generic-request")]
        public async Task<IActionResult> GenericRequest([FromBody] GenericApiRequest request)
        {
            try
            {
                _logger.LogInformation("Processing generic NMI V4 API request for endpoint: {Endpoint}", request.Endpoint);

                // Map endpoint to NMI V4 API URL and get any path-param fields to strip from the body
                var (url, httpMethod, excludeFields) = MapEndpointToUrl(request.Endpoint, request.Method, request.Data, request.BaseUrl);

                if (string.IsNullOrEmpty(url))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid endpoint",
                        message = $"Endpoint '{request.Endpoint}' is not supported"
                    });
                }

                _logger.LogInformation("Calling NMI V4 API at: {Url} with method: {Method}", url, httpMethod);

                // Create HTTP client
                var httpClient = _clientFactory.CreateClient();

                // Create request message
                var requestMessage = new HttpRequestMessage(httpMethod, url);

                // Set Authorization header
                requestMessage.Headers.Add("Authorization", request.ApiKey);

                // Set Accept header for JSON responses
                requestMessage.Headers.Add("Accept", "application/json");

                // Add body for POST, PUT, PATCH requests
                if (httpMethod != HttpMethod.Get)
                {
                    string jsonContent = "{}";

                    if (request.Data != null)
                    {
                        if (excludeFields != null && excludeFields.Length > 0)
                        {
                            var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(request.Data.Value.GetRawText());
                            if (dict != null)
                            {
                                foreach (var field in excludeFields)
                                    dict.Remove(field);
                                jsonContent = JsonSerializer.Serialize(dict);
                            }
                        }
                        else
                        {
                            jsonContent = JsonSerializer.Serialize(request.Data);
                        }
                    }

                    requestMessage.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
                    requestMessage.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");

                    _logger.LogInformation("Request body: {Body}", jsonContent);
                }

                // Send request
                var response = await httpClient.SendAsync(requestMessage);
                var responseString = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("NMI V4 API Response Status: {StatusCode}", response.StatusCode);
                _logger.LogInformation("NMI V4 API Response: {Response}", responseString);

                // Check if request was successful
                if (response.IsSuccessStatusCode)
                {
                    try
                    {
                        // Try to parse as JSON
                        var jsonResponse = JsonSerializer.Deserialize<object>(responseString);

                        return Ok(new
                        {
                            success = true,
                            statusCode = (int)response.StatusCode,
                            data = jsonResponse,
                            timestamp = DateTime.UtcNow,
                            endpoint = url
                        });
                    }
                    catch (JsonException)
                    {
                        // If not JSON, return as string
                        return Ok(new
                        {
                            success = true,
                            statusCode = (int)response.StatusCode,
                            data = responseString,
                            timestamp = DateTime.UtcNow,
                            endpoint = url
                        });
                    }
                }
                else
                {
                    return Ok(new
                    {
                        success = false,
                        statusCode = (int)response.StatusCode,
                        error = "NMI API request failed",
                        message = responseString,
                        timestamp = DateTime.UtcNow,
                        endpoint = url
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing generic NMI V4 API request: {Message}", ex.Message);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    message = "An error occurred while processing your request",
                    details = ex.Message
                });
            }
        }

        private (string Url, HttpMethod Method, string[]? ExcludeFields) MapEndpointToUrl(string endpoint, string method, JsonElement? data, string? baseHost = null)
        {
            var host = string.IsNullOrEmpty(baseHost) ? "https://sandbox.nmi.com" : baseHost.TrimEnd('/');
            var baseUrl = $"{host}/api/v4";

            switch (endpoint)
            {
                case "card-type-lookup":
                    return ($"{baseUrl}/card_type", HttpMethod.Post, null);

                case "create-merchant":
                    return ($"{baseUrl}/merchants", HttpMethod.Post, null);

                case "get-merchant-list":
                    return ($"{baseUrl}/merchants/reports", HttpMethod.Post, null);

                case "get-merchant-info":
                    var merchantId = data?.GetProperty("merchantId").GetString() ?? "";
                    return ($"{baseUrl}/merchants/{merchantId}", HttpMethod.Get, null);

                case "get-apple-pay":
                    var gatewayIdForApplePay = data?.GetProperty("gatewayId").GetString() ?? "";
                    return ($"{baseUrl}/merchants/{gatewayIdForApplePay}/apple_pay", HttpMethod.Get, null);

                case "update-merchant":
                    var gatewayIdForUpdate = data?.GetProperty("gatewayId").GetString() ?? "";
                    return ($"{baseUrl}/merchants/{gatewayIdForUpdate}", new HttpMethod("PATCH"), new[] { "gatewayId" });

                case "get-agreement-text":
                    var merchantIdForAgreement = data?.GetProperty("merchantId").GetString() ?? "";
                    return ($"{baseUrl}/merchants/{merchantIdForAgreement}/agreement_text", HttpMethod.Get, null);

                case "get-security-keys":
                    var gatewayId = data?.GetProperty("gatewayId").GetString() ?? "";
                    return ($"{baseUrl}/{gatewayId}/security_keys", HttpMethod.Get, null);

                case "add-security-key":
                    var merchantIdForKey = data?.GetProperty("merchantId").GetString() ?? "";
                    return ($"{baseUrl}/merchants/{merchantIdForKey}/security_keys", HttpMethod.Post, new[] { "merchantId" });

                case "get-processor-report":
                    return ($"{baseUrl}/processors/reports", HttpMethod.Post, null);

                case "add-processor":
                    return ($"{baseUrl}/processors", HttpMethod.Post, null);

                case "update-processor":
                    var processorId = data?.GetProperty("processorId").GetString() ?? "";
                    return ($"{baseUrl}/processors/{processorId}", new HttpMethod("PATCH"), new[] { "processorId" });

                case "get-processor-config":
                    var serviceId = data?.GetProperty("serviceId").GetString() ?? "";
                    return ($"{baseUrl}/services/{serviceId}/config", HttpMethod.Get, null);
                    
                case "get-available-services":
                    return ($"{baseUrl}/services/search", HttpMethod.Post, null);

                case "get-user-info":
                    return ($"{baseUrl}/users/search", HttpMethod.Post, null);

                case "txt2pay":
                    return ($"{baseUrl}/authvia/conversations", HttpMethod.Post, null);

                case "get-products":
                    return ($"{baseUrl}/products", HttpMethod.Get, null);

                default:
                    return (string.Empty, HttpMethod.Get, null);
            }
        }
    }

    public class GenericApiRequest
    {
        [Required]
        [JsonPropertyName("api_key")]
        public string ApiKey { get; set; } = string.Empty;

        [Required]
        [JsonPropertyName("endpoint")]
        public string Endpoint { get; set; } = string.Empty;

        [Required]
        [JsonPropertyName("method")]
        public string Method { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public JsonElement? Data { get; set; }

        [JsonPropertyName("baseUrl")]
        public string? BaseUrl { get; set; }
    }

    public class TransactionDataRequest
    {
        [Required]
        [JsonPropertyName("api_key")]
        public string ApiKey { get; set; } = string.Empty;

        [JsonPropertyName("transaction_id")]
        public string? TransactionId { get; set; }

        [JsonPropertyName("merchant_id")]
        public string? MerchantId { get; set; }

        [JsonPropertyName("start_date")]
        public DateTime? StartDate { get; set; }

        [JsonPropertyName("end_date")]
        public DateTime? EndDate { get; set; }

        [JsonPropertyName("transaction_status")]
        public string? TransactionStatus { get; set; }

        [JsonPropertyName("min_amount")]
        public decimal? MinAmount { get; set; }

        [JsonPropertyName("max_amount")]
        public decimal? MaxAmount { get; set; }

        [JsonPropertyName("baseUrl")]
        public string? BaseUrl { get; set; }
    }
}
