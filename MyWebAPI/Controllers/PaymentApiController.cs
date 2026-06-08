using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

using Microsoft.Extensions.Caching.Memory;

using MyWebAPI.Utilities;

// using MyWebAPI.Services;

namespace MyWebAPI.Controllers
{
    [ApiController]
    [Route("payment")]
    public class PaymentController : ControllerBase
    {
        private readonly IHttpClientFactory _clientFactory;
        private readonly ILogger<PaymentController> _paymentLogger;
        private readonly IMemoryCache _memoryCache;

        private const string SandboxSecurityKey = "Kes9dc87682hQHn6JSTTs44uyvz66c56";
        private const string SecureSecurityKey = "dWE6997j8s3rEwK75a4d53t6gZgJUEev";

        public PaymentController(
            IHttpClientFactory clientFactory,
            ILogger<PaymentController> paymentLogger,
            IMemoryCache memoryCache

        )
        {
            _clientFactory = clientFactory;
            _paymentLogger = paymentLogger;
            _memoryCache = memoryCache;
        }

        [HttpPost]
        public async Task<ActionResult<string>> SendPaymentRequest([FromForm] Dictionary<string, string> paymentRequest)
        {

            _paymentLogger.LogInformation("Received Payment Request with parameters: {PaymentRequest}", paymentRequest);

            // Create HttpClient instance
            var cacheKey = CacheKeyGenerator.GenerateCacheKey(paymentRequest);

            _paymentLogger.LogInformation("CacheKey generated: {CacheKey}", cacheKey);

            // Attempt to retrieve cached response
#pragma warning disable CS8600 // Converting null literal or possible null value to non-nullable type.
            if (_memoryCache.TryGetValue(cacheKey, out string cachedResponse))
            {
                _paymentLogger.LogInformation("Cache hit for key: {CacheKey}", cacheKey);
                return Ok(cachedResponse);
            }
#pragma warning restore CS8600 // Converting null literal or possible null value to non-nullable type.

            var httpClient = _clientFactory.CreateClient();

            Random rnd = new();

            var env = "sandbox";
            if (paymentRequest.TryGetValue("nmi_env", out var nmiEnv) &&
                string.Equals(nmiEnv, "secure", StringComparison.OrdinalIgnoreCase))
            {
                env = "secure";
            }

            paymentRequest.Remove("nmi_env");

            var gatewayUrl = env == "secure"
                ? "https://secure.nmi.com/api/transact.php"
                : "https://sandbox.nmi.com/api/transact.php";

            var securityKey = env == "secure" ? SecureSecurityKey : SandboxSecurityKey;
            paymentRequest["security_key"] = securityKey;
            paymentRequest["order_id"] = "JasonTestNetOrder-" + rnd.Next();


            // Convert request data to URL-encoded form data
            var content = new FormUrlEncodedContent(paymentRequest);

            _paymentLogger.LogInformation("Payment Request (env={Env}, url={GatewayUrl}):\n{PaymentRequest}", env, gatewayUrl, paymentRequest);
            try
            {
                var response = await httpClient.PostAsync(gatewayUrl, content);
                response.EnsureSuccessStatusCode();
                var responseBody = await response.Content.ReadAsStringAsync();

                var prettyPrintedResponse = PrettyPrint.PrettyPrintResponse(responseBody);

                _paymentLogger.LogInformation("Payment Response:\n{PrettyResponse}", prettyPrintedResponse);

                return Ok(prettyPrintedResponse); // Return the pretty-printed response
            }
            catch (Exception ex)
            {
                _paymentLogger.LogError(ex, "Error sending payment request");
                return StatusCode(500, "Internal server error");
            }
        }


    }
}