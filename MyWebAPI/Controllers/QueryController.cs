using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MyWebAPI.Utilities;

namespace MyWebAPI.Controllers
{
    [ApiController]
    [Route("query")]
    public class QueryController : ControllerBase
    {
        private readonly string _apiKey;
        private readonly IHttpClientFactory _clientFactory;
        private readonly ILogger<QueryController> _queryLogger;
        private readonly IMemoryCache _memoryCache;

        public QueryController(
            IConfiguration configuration,
            IHttpClientFactory clientFactory,
            ILogger<QueryController> queryLogger,
            IMemoryCache memoryCache
        )
        {
            _clientFactory = clientFactory;
            _queryLogger = queryLogger;
            _memoryCache = memoryCache;
            _apiKey = configuration["MyAppSettings:ApiKey"] ?? throw new InvalidOperationException("API Key is not configured.");
        }

        [HttpPost]
        public async Task<ActionResult<string>> SendQueryRequest([FromForm] Dictionary<string, string> queryParameters)
        {
            _queryLogger.LogInformation("Received Query Request with parameters: {QueryParameters}", queryParameters);

            var cacheKey = CacheKeyGenerator.GenerateCacheKey(queryParameters);

            _queryLogger.LogInformation("CacheKey generated: {CacheKey}", cacheKey);

            // Attempt to retrieve cached response
#pragma warning disable CS8600 // Converting null literal or possible null value to non-nullable type.
            if (_memoryCache.TryGetValue(cacheKey, out string cachedResponse))
            {
                _queryLogger.LogInformation("Cache hit for key: {CacheKey}", cacheKey);
                return Ok(cachedResponse);
            }
#pragma warning restore CS8600 // Converting null literal or possible null value to non-nullable type.

            // Create HttpClient instance
            var httpClient = _clientFactory.CreateClient();

            queryParameters["security_key"] = _apiKey;

            // Convert request data to URL-encoded form data
            var content = new FormUrlEncodedContent(queryParameters);

            _queryLogger.LogInformation("Content is : {Content}", content);

            try
            {
                var response = await httpClient.PostAsync("https://secure.networkmerchants.com/api/query.php", content);

                // Log the response status code
                _queryLogger.LogInformation("Received response with status code: {StatusCode}", response.StatusCode);

                response.EnsureSuccessStatusCode(); // Throws if the status code is not success

                var responseBody = await response.Content.ReadAsStringAsync();

                _queryLogger.LogInformation("Raw Response: {ResponseBody}", responseBody);

                // Check if the response is empty
                if (string.IsNullOrWhiteSpace(responseBody))
                {
                    _queryLogger.LogWarning("The API response is empty.");
                    return StatusCode(204, "No Content returned from the API.");
                }

                // Store the response in the cache
                var cacheEntryOptions = new MemoryCacheEntryOptions()
                    .SetSlidingExpiration(TimeSpan.FromMinutes(30)); // Adjust expiration as needed

                _memoryCache.Set(cacheKey, responseBody, cacheEntryOptions);

                return Ok(responseBody); // Return the pretty-printed response
            }
            catch (HttpRequestException httpEx)
            {
                _queryLogger.LogError(httpEx, "HTTP Request error while sending query request");
                return StatusCode(503, "Service unavailable. Please try again later.");
            }
            catch (Exception ex)
            {
                _queryLogger.LogError(ex, "Error sending query request");
                return StatusCode(500, "Internal server error");
            }
        }

    }
}
