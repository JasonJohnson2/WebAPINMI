using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MinProject.Controllers
{
    [ApiController]
    [Route("api/response")]
    public class OpenAIController : ControllerBase
    {
        private readonly string _apiKey;
        private readonly ILogger<OpenAIController> _aiLogger;
        private readonly IHttpClientFactory _httpClientFactory;
        private const string OpenAIEndpoint = "https://api.openai.com/v1/responses";

        public OpenAIController(IHttpClientFactory httpClientFactory, ILogger<OpenAIController> aiLogger, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _aiLogger = aiLogger;
            _apiKey = configuration["MyAppSettings:OpenAiKey"]
                      ?? throw new InvalidOperationException("OpenAI API key is not configured.");
        }

        public class OpenAIRequest
        {
            public string Model { get; set; }
            public string Input { get; set; }
        }

        [HttpPost("generate")]
        public async Task<IActionResult> Generate([FromBody] OpenAIRequest request)
        {
            _aiLogger.LogInformation("Received OpenAI request with parameters: {Request}", request);
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
            _aiLogger.LogInformation("Authorization header set with API key.");
            var payload = JsonSerializer.Serialize(new { model = request.Model, input = request.Input });
            var content = new StringContent(payload, Encoding.UTF8, "application/json");

            using var response = await client.PostAsync(OpenAIEndpoint, content);
            var rawJson = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, rawJson);
            }

            // Return the full JSON payload so the front-end can pick what it needs
            return Content(rawJson, "application/json");
        }
    }
}
