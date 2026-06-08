using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace MyWebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CardTypeController : ControllerBase
    {
        private readonly IHttpClientFactory _clientFactory;
        private readonly ILogger<CardTypeController> _logger;
        private const string NMI_API_KEY = "v4_secret_eDBu9n9P6pENk35XH3PEQ3ATkjsuyd94";
        private const string NMI_CARD_TYPE_URL = "https://secure.nmi.com/api/v4/card_type";

        public CardTypeController(IHttpClientFactory clientFactory, ILogger<CardTypeController> logger)
        {
            _clientFactory = clientFactory;
            _logger = logger;
        }

        public class CardTypeRequest
        {
            public string ccnumber { get; set; } = string.Empty;
        }

        [HttpPost("check")]
        public async Task<IActionResult> CheckCardType([FromBody] CardTypeRequest request)
        {
            _logger.LogInformation("Received card type check request for card number starting with: {CardPrefix}", 
                request.ccnumber?.Substring(0, Math.Min(6, request.ccnumber.Length)));

            try
            {
                var client = _clientFactory.CreateClient();
                
                // Prepare the request payload
                var payload = new { ccnumber = request.ccnumber };
                var jsonContent = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                // Set up the request
                var httpRequest = new HttpRequestMessage(HttpMethod.Post, NMI_CARD_TYPE_URL)
                {
                    Content = content
                };

                httpRequest.Headers.Add("accept", "application/json");
                httpRequest.Headers.Add("Authorization", NMI_API_KEY);

                // Send the request
                var response = await client.SendAsync(httpRequest);

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogInformation("Successfully received card type response");
                    
                    // Return the JSON response from NMI
                    return Ok(JsonSerializer.Deserialize<object>(responseContent));
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("NMI API returned error status: {StatusCode}, Response: {ErrorContent}", response.StatusCode, errorContent);
                    return StatusCode((int)response.StatusCode, new { error = "NMI API error", details = errorContent });
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP error occurred while calling NMI API");
                return StatusCode(500, new { error = "Failed to connect to card type service", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error occurred while checking card type");
                return StatusCode(500, new { error = "Internal server error", message = ex.Message });
            }
        }
    }
}