using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace MyWebAPI.Controllers
{

    [ApiController]
    [Route("async")]
    public class AsyncController : ControllerBase
    {

        private readonly IHttpClientFactory _clientFactory;
        private readonly ILogger<AsyncController> _paymentLogger;

        public AsyncController(
            IHttpClientFactory clientFactory,
            ILogger<AsyncController> paymentLogger
        )
        {
            _clientFactory = clientFactory;
            _paymentLogger = paymentLogger;
        }
        [HttpPost]
        public async Task<ActionResult<string>> SendPaymentRequest([FromForm] AsyncRequest asyncRequest)
        {


            // Create HttpClient instance
            var httpClient = _clientFactory.CreateClient();

            var requestData = new Dictionary<string, string>
            {
                { "asyncStatusGuid", asyncRequest.AsyncGuid}
            };

            _paymentLogger.LogInformation(requestData.ToString());

            // Convert request data to URL-encoded form data
            var content = new FormUrlEncodedContent(requestData);


            try
            {
                var response = await httpClient.PostAsync("https://secure.networkmerchants.com/api/asyncstatus", content);
                response.EnsureSuccessStatusCode();
                var responseBody = await response.Content.ReadAsStringAsync();

                return Ok(responseBody);
            }
            catch (Exception ex)
            {
                _paymentLogger.LogError(ex, "Error sending payment request");
                return StatusCode(500, "Internal server error");
            }
        }
    }
    public class AsyncRequest
    {
        public required string AsyncGuid { get; set; }

    }
}