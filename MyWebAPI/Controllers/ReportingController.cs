using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;

namespace MyWebAPI.Controllers
{
    [ApiController]
    [Route("api/reporting")]
    public class ReportingController : ControllerBase
    {
        private readonly IHttpClientFactory _clientFactory;
        private readonly ILogger<ReportingController> _logger;
        private const string ReportingServiceUrl = "https://embed-reporting.iriscrm.com";

        public ReportingController(
            IHttpClientFactory clientFactory,
            ILogger<ReportingController> logger)
        {
            _clientFactory = clientFactory;
            _logger = logger;
        }

        [HttpPost("session")]
        public async Task<IActionResult> CreateSession([FromBody] SessionRequest request)
        {
            try
            {
                _logger.LogInformation("Creating reporting session for merchant: {MerchantId}", request.MerchantId);

                var httpClient = _clientFactory.CreateClient();

                var requestBody = new
                {
                    gateway = new
                    {
                        api_key = request.ApiKey,
                        merchant_id = request.MerchantId,
                        environment = request.Environment ?? "sandbox"
                    }
                };

                var jsonContent = JsonSerializer.Serialize(requestBody);
                var requestMessage = new HttpRequestMessage(HttpMethod.Post, $"{ReportingServiceUrl}/api/v1/sessions");
                requestMessage.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
                requestMessage.Headers.Add("Accept", "application/json");

                var response = await httpClient.SendAsync(requestMessage);
                var responseString = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("Session API response status: {StatusCode}", response.StatusCode);

                if (response.IsSuccessStatusCode)
                {
                    var sessionResponse = JsonSerializer.Deserialize<NmiSessionResponse>(responseString);

                    return Ok(new
                    {
                        sessionToken = sessionResponse?.SessionToken,
                        expiresAt = sessionResponse?.ExpiresAtEpoch
                    });
                }

                _logger.LogWarning("Session creation failed: {Response}", responseString);
                return StatusCode((int)response.StatusCode, new
                {
                    error = "Session creation failed",
                    message = responseString
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating reporting session");
                return StatusCode(500, new
                {
                    error = "Internal server error",
                    message = ex.Message
                });
            }
        }
    }

    public class SessionRequest
    {
        [JsonPropertyName("api_key")]
        public string ApiKey { get; set; } = string.Empty;

        [JsonPropertyName("merchant_id")]
        public string MerchantId { get; set; } = string.Empty;

        [JsonPropertyName("environment")]
        public string? Environment { get; set; } = "sandbox";
    }

    public class NmiSessionResponse
    {
        [JsonPropertyName("session_token")]
        public string SessionToken { get; set; } = string.Empty;

        [JsonPropertyName("expires_at")]
        public string ExpiresAt { get; set; } = string.Empty;

        public long ExpiresAtEpoch
        {
            get
            {
                if (DateTimeOffset.TryParse(ExpiresAt, out var dto))
                    return dto.ToUnixTimeMilliseconds();
                return DateTimeOffset.UtcNow.AddMinutes(15).ToUnixTimeMilliseconds();
            }
        }
    }
}
