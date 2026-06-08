using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using MyWebAPI.Utilities;

namespace MyWebAPI.Controllers
{
    public class MenuSelectionRequest
    {
        public string? Header { get; set; }
        public List<string> Options { get; set; } = new();
    }

    [ApiController]
    [Route("cloud")]
    public class CloudController : ControllerBase
    {

        private readonly string _apiKey;
        private readonly IHttpClientFactory _clientFactory;
        private readonly ILogger<CloudController> _paymentLogger;
        private readonly IMemoryCache _memoryCache;

        public CloudController(
            IConfiguration configuration,
            IHttpClientFactory clientFactory,
            ILogger<CloudController> paymentLogger,
            IMemoryCache memoryCache
        )
        {
            _clientFactory = clientFactory;
            _paymentLogger = paymentLogger;
            _memoryCache = memoryCache;
            _apiKey = configuration["MyAppSettings:ApiKey"] ?? throw new InvalidOperationException("API Key is not configured.");


        }

        [HttpGet("devices")]
        public async Task<ActionResult<string>> GetDeviceList([FromHeader(Name = "Authorization")] string authorization)
        {
            _paymentLogger.LogInformation("Received Device List Request");

            if (string.IsNullOrEmpty(authorization) || !authorization.StartsWith("Bearer "))
            {
                _paymentLogger.LogWarning("Invalid or missing Authorization header");
                return BadRequest("Authorization header with Bearer token is required");
            }

            // Extract the token from "Bearer <token>"
            var token = authorization.Substring("Bearer ".Length).Trim();

            try
            {
                // Create HttpClient instance
                var httpClient = _clientFactory.CreateClient();

                // Set up the request to NMI device API
                httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

                var response = await httpClient.GetAsync("https://secure.nmi.com/api/v2/devices/list?disableConnectionInfo=true");
                
                if (!response.IsSuccessStatusCode)
                {
                    _paymentLogger.LogError("NMI Device API returned status: {StatusCode}", response.StatusCode);
                    return StatusCode((int)response.StatusCode, "Failed to fetch devices from NMI API");
                }

                var responseBody = await response.Content.ReadAsStringAsync();
                _paymentLogger.LogInformation("Device List Response received successfully");
                _paymentLogger.LogInformation("NMI Device API Response: {ResponseBody}", responseBody);

                // Return as JSON content with proper content type
                return Content(responseBody, "application/json");
            }
            catch (Exception ex)
            {
                _paymentLogger.LogError(ex, "Error fetching device list");
                return StatusCode(500, "Internal server error while fetching device list");
            }
        }

        [HttpGet("asyncstatus/{statusGuid}")]
        public async Task<ActionResult<string>> GetAsyncStatus(string statusGuid, [FromHeader(Name = "Authorization")] string authorization, [FromQuery] string? responseMethod = null)
        {
            _paymentLogger.LogInformation("Received Async Status Request for GUID: {StatusGuid}", statusGuid);

            if (string.IsNullOrEmpty(authorization) || !authorization.StartsWith("Bearer "))
            {
                _paymentLogger.LogWarning("Invalid or missing Authorization header");
                return BadRequest("Authorization header with Bearer token is required");
            }

            // Extract the token from "Bearer <token>"
            var token = authorization.Substring("Bearer ".Length).Trim();

            try
            {
                // Create HttpClient instance
                var httpClient = _clientFactory.CreateClient();

                // Build the async status URL
                var url = $"https://secure.networkmerchants.com/api/asyncstatus/{statusGuid}";
                
                // Add query parameter if responseMethod is provided and not "asynchronous"
                if (!string.IsNullOrEmpty(responseMethod) && responseMethod != "asynchronous")
                {
                    url += $"?responseMethod={responseMethod}";
                }

                // Set up the request headers
                httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

                var response = await httpClient.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    _paymentLogger.LogError("NMI Async Status API returned status: {StatusCode}", response.StatusCode);
                    return StatusCode((int)response.StatusCode, "Failed to fetch async status from NMI API");
                }

                var responseBody = await response.Content.ReadAsStringAsync();
                _paymentLogger.LogInformation("Async Status Response received successfully for GUID: {StatusGuid}", statusGuid);
                _paymentLogger.LogInformation("NMI Async Status API Response: {ResponseBody}", responseBody);

                // Return as JSON content with proper content type
                return Content(responseBody, "application/json");
            }
            catch (Exception ex)
            {
                _paymentLogger.LogError(ex, "Error fetching async status for GUID: {StatusGuid}", statusGuid);
                return StatusCode(500, "Internal server error while fetching async status");
            }
        }



        [HttpGet("devices/sign/{poiDeviceId}")]
        public async Task<ActionResult<string>> StartSignatureCapture(string poiDeviceId, [FromHeader(Name = "Authorization")] string authorization, [FromQuery] string? header = null)
        {
            _paymentLogger.LogInformation("Received Standalone Signature Capture Request for Device: {DeviceId}", poiDeviceId);

            if (string.IsNullOrEmpty(authorization) || !authorization.StartsWith("Bearer "))
            {
                _paymentLogger.LogWarning("Invalid or missing Authorization header");
                return BadRequest("Authorization header with Bearer token is required");
            }

            var token = authorization.Substring("Bearer ".Length).Trim();

            try
            {
                var httpClient = _clientFactory.CreateClient();
                
                var url = $"https://secure.networkmerchants.com/api/v2/devices/sign/{poiDeviceId}";
                if (!string.IsNullOrEmpty(header))
                {
                    url += $"?header={Uri.EscapeDataString(header)}";
                }

                httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

                var response = await httpClient.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    _paymentLogger.LogError("NMI Signature API returned status: {StatusCode}", response.StatusCode);
                    return StatusCode((int)response.StatusCode, "Failed to start signature capture");
                }

                var responseBody = await response.Content.ReadAsStringAsync();
                _paymentLogger.LogInformation("Signature Capture Response: {ResponseBody}", responseBody);

                return Content(responseBody, "application/json");
            }
            catch (Exception ex)
            {
                _paymentLogger.LogError(ex, "Error starting signature capture for device: {DeviceId}", poiDeviceId);
                return StatusCode(500, "Internal server error while starting signature capture");
            }
        }

        [HttpGet("devices/yesno/{poiDeviceId}")]
        public async Task<ActionResult<string>> StartYesNoPrompt(string poiDeviceId, [FromHeader(Name = "Authorization")] string authorization, [FromQuery] string? header = null, [FromQuery] string? message = null)
        {
            _paymentLogger.LogInformation("Received Standalone Yes/No Prompt Request for Device: {DeviceId}", poiDeviceId);

            if (string.IsNullOrEmpty(authorization) || !authorization.StartsWith("Bearer "))
            {
                _paymentLogger.LogWarning("Invalid or missing Authorization header");
                return BadRequest("Authorization header with Bearer token is required");
            }

            var token = authorization.Substring("Bearer ".Length).Trim();

            try
            {
                var httpClient = _clientFactory.CreateClient();
                
                var queryParams = new List<string>();
                if (!string.IsNullOrEmpty(header))
                {
                    queryParams.Add($"header={Uri.EscapeDataString(header)}");
                }
                if (!string.IsNullOrEmpty(message))
                {
                    queryParams.Add($"message={Uri.EscapeDataString(message)}");
                }

                var url = $"https://secure.networkmerchants.com/api/v2/devices/yesno/{poiDeviceId}";
                if (queryParams.Count > 0)
                {
                    url += "?" + string.Join("&", queryParams);
                }

                httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

                var response = await httpClient.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    _paymentLogger.LogError("NMI Yes/No API returned status: {StatusCode}", response.StatusCode);
                    return StatusCode((int)response.StatusCode, "Failed to start yes/no prompt");
                }

                var responseBody = await response.Content.ReadAsStringAsync();
                _paymentLogger.LogInformation("Yes/No Prompt Response: {ResponseBody}", responseBody);

                return Content(responseBody, "application/json");
            }
            catch (Exception ex)
            {
                _paymentLogger.LogError(ex, "Error starting yes/no prompt for device: {DeviceId}", poiDeviceId);
                return StatusCode(500, "Internal server error while starting yes/no prompt");
            }
        }

        [HttpPost("devices/menuselection/{poiDeviceId}")]
        public async Task<ActionResult<string>> StartMenuSelection(string poiDeviceId, [FromHeader(Name = "Authorization")] string authorization, [FromBody] MenuSelectionRequest request)
        {
            _paymentLogger.LogInformation("Received Standalone Menu Selection Request for Device: {DeviceId}", poiDeviceId);

            if (string.IsNullOrEmpty(authorization) || !authorization.StartsWith("Bearer "))
            {
                _paymentLogger.LogWarning("Invalid or missing Authorization header");
                return BadRequest("Authorization header with Bearer token is required");
            }

            var token = authorization.Substring("Bearer ".Length).Trim();

            // Validate the request
            if (request.Options == null || request.Options.Count < 2 || request.Options.Count > 20)
            {
                _paymentLogger.LogWarning("Invalid options count: {Count}. Must be between 2 and 20", request.Options?.Count ?? 0);
                return BadRequest("Options must contain between 2 and 20 items");
            }

            try
            {
                var httpClient = _clientFactory.CreateClient();
                
                var url = $"https://secure.networkmerchants.com/api/v2/devices/menuselection/{poiDeviceId}";

                httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

                var jsonContent = System.Text.Json.JsonSerializer.Serialize(request);
                var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

                var response = await httpClient.PostAsync(url, content);
                
                if (!response.IsSuccessStatusCode)
                {
                    _paymentLogger.LogError("NMI Menu Selection API returned status: {StatusCode}", response.StatusCode);
                    return StatusCode((int)response.StatusCode, "Failed to start menu selection");
                }

                var responseBody = await response.Content.ReadAsStringAsync();
                _paymentLogger.LogInformation("Menu Selection Response: {ResponseBody}", responseBody);

                return Content(responseBody, "application/json");
            }
            catch (Exception ex)
            {
                _paymentLogger.LogError(ex, "Error starting menu selection for device: {DeviceId}", poiDeviceId);
                return StatusCode(500, "Internal server error while starting menu selection");
            }
        }

        [HttpGet("asyncdevicestatus/{asyncStatusGuid}")]
        public async Task<ActionResult<string>> GetAsyncDeviceStatus(string asyncStatusGuid, [FromHeader(Name = "Authorization")] string authorization, [FromQuery] string? responseMethod = null)
        {
            _paymentLogger.LogInformation("Received Async Device Status Request for GUID: {StatusGuid}", asyncStatusGuid);

            if (string.IsNullOrEmpty(authorization) || !authorization.StartsWith("Bearer "))
            {
                _paymentLogger.LogWarning("Invalid or missing Authorization header");
                return BadRequest("Authorization header with Bearer token is required");
            }

            var token = authorization.Substring("Bearer ".Length).Trim();

            try
            {
                var httpClient = _clientFactory.CreateClient();

                var url = $"https://secure.networkmerchants.com/api/asyncdevicestatus/{asyncStatusGuid}";
                if (!string.IsNullOrEmpty(responseMethod))
                {
                    url += $"?responseMethod={Uri.EscapeDataString(responseMethod)}";
                }

                httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

                var response = await httpClient.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    _paymentLogger.LogError("NMI Async Device Status API returned status: {StatusCode}", response.StatusCode);
                    return StatusCode((int)response.StatusCode, "Failed to fetch async device status from NMI API");
                }

                var responseBody = await response.Content.ReadAsStringAsync();
                _paymentLogger.LogInformation("Async Device Status Response received successfully for GUID: {StatusGuid}", asyncStatusGuid);
                _paymentLogger.LogInformation("NMI Async Device Status API Response: {ResponseBody}", responseBody);

                return Content(responseBody, "application/json");
            }
            catch (Exception ex)
            {
                _paymentLogger.LogError(ex, "Error fetching async device status for GUID: {StatusGuid}", asyncStatusGuid);
                return StatusCode(500, "Internal server error while fetching async device status");
            }
        }

        [HttpPost]
        public async Task<ActionResult<string>> SendPaymentRequest([FromForm] Dictionary<string, string> cloudRequest)
        {
            _paymentLogger.LogInformation("Received Cloud Payment Request with Response method of: {ResponseMethod}", cloudRequest["response_method"]);

            var cacheKey = CacheKeyGenerator.GenerateCacheKey(cloudRequest);

            _paymentLogger.LogInformation("CacheKey generated: {CacheKey}", cacheKey);

#pragma warning disable CS8600 // Converting null literal or possible null value to non-nullable type.
            if (_memoryCache.TryGetValue(cacheKey, out string cachedResponse))
            {
                _paymentLogger.LogInformation("Cache hit for key: {CacheKey}", cacheKey);
                return Ok(cachedResponse);
            }
#pragma warning restore CS8600

            // Create HttpClient instance
            var httpClient = _clientFactory.CreateClient();

            Random rnd = new();

            cloudRequest["order_id"] = "JasonTestNetOrder-" + rnd.Next();
            cloudRequest["security_key"] = _apiKey;

            // Convert request data to URL-encoded form data
            var content = new FormUrlEncodedContent(cloudRequest);


            try
            {
                var response = await httpClient.PostAsync("https://secure.networkmerchants.com/api/transact.php", content);
                response.EnsureSuccessStatusCode();
                var responseBody = await response.Content.ReadAsStringAsync();

                var prettyPrintedResponse = PrettyPrint.PrettyPrintResponse(responseBody);

                _paymentLogger.LogInformation("Payment Response:\n{PrettyResponse}", prettyPrintedResponse);

                return Ok(prettyPrintedResponse);
            }
            catch (Exception ex)
            {
                _paymentLogger.LogError(ex, "Error sending payment request");
                return StatusCode(500, "Internal server error");
            }
        }
    }
}