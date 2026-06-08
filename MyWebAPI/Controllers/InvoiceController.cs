using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace MyWebAPI.Controllers
{
    [ApiController]
    [Route("invoice")]
    public class InvoiceController : ControllerBase
    {
        private readonly IHttpClientFactory _clientFactory;
        private readonly ILogger<InvoiceController> _logger;

        private const string SandboxSecurityKey = "Kes9dc87682hQHn6JSTTs44uyvz66c56";
        private const string SandboxGatewayUrl = "https://sandbox.nmi.com/api/transact.php";

        public InvoiceController(IHttpClientFactory clientFactory, ILogger<InvoiceController> logger)
        {
            _clientFactory = clientFactory;
            _logger = logger;
        }

        [HttpPost]
        public async Task<ActionResult<string>> SendInvoiceRequest([FromForm] Dictionary<string, string> invoiceRequest)
        {
            if (invoiceRequest == null || invoiceRequest.Count == 0)
            {
                return BadRequest("Invoice request is empty.");
            }

            invoiceRequest.Remove("nmi_env");

            if (!invoiceRequest.TryGetValue("security_key", out var providedKey) || string.IsNullOrWhiteSpace(providedKey))
            {
                invoiceRequest["security_key"] = SandboxSecurityKey;
            }

            _logger.LogInformation("Invoice Request -> {Url}: {@Request}", SandboxGatewayUrl, invoiceRequest);

            var httpClient = _clientFactory.CreateClient();
            var content = new FormUrlEncodedContent(invoiceRequest);

            try
            {
                var response = await httpClient.PostAsync(SandboxGatewayUrl, content);
                var body = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("Invoice Response ({StatusCode}): {Body}", (int)response.StatusCode, body);

                return Content(body, "application/x-www-form-urlencoded");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP error sending invoice request");
                return StatusCode(503, "Gateway unavailable. Please try again.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending invoice request");
                return StatusCode(500, "Internal server error");
            }
        }
    }
}
