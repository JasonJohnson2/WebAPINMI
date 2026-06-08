using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace MyWebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EKashuController : ControllerBase
    {
        private readonly ILogger<EKashuController> _logger;

        public EKashuController(ILogger<EKashuController> logger)
        {
            _logger = logger;
        }

        [HttpGet("test")]
        public ActionResult<object> Test()
        {
            return Ok(new { message = "eKashu controller is working", timestamp = DateTime.UtcNow });
        }

        [HttpPost("generate-hash")]
        public ActionResult<object> GenerateHash([FromBody] Dictionary<string, string> request)
        {
            string hashKey = "NF2n9wPefvwGZVdU";

            SortedDictionary<string, string> hashcodeInput = new SortedDictionary<string, string>{
                 {"ekashu_3d_secure_verify", null! },
                { "ekashu_amount", request["ekashu_amount"] },
                { "ekashu_amount_format", null! },
                { "ekashu_auto_confirm", null! },
                { "ekashu_callback_failure_url", null! },
                { "ekashu_callback_include_post", null! },
                { "ekashu_callback_success_url", null! },
                { "ekashu_card_address_editable", null! },
                { "ekashu_card_address_required", null! },
                { "ekashu_card_address_verify", null! },
                { "ekashu_card_email_address_mandatory", null! },
                { "ekashu_card_phone_number_mandatory", null! },
                { "ekashu_card_title_mandatory", null! },
                { "ekashu_card_zip_code_verify", null! },
                { "ekashu_currency", request["ekashu_currency"] },
                { "ekashu_delivery_address_editable", null! },
                { "ekashu_delivery_address_required", null! },
                { "ekashu_delivery_email_address_mandatory", null! },
                { "ekashu_delivery_phone_number_mandatory", null! },
                { "ekashu_delivery_title_mandatory", null! },
                { "ekashu_description", request["ekashu_description"] },
                { "ekashu_device", null! },
                { "ekashu_duplicate_check", null! },
                { "ekashu_duplicate_minutes", null! },
                { "ekashu_failure_return_text", null! },
                { "ekashu_failure_url", request["ekashu_failure_url"] },
                { "ekashu_hash_code_format", request["ekashu_hash_code_format"] },
                { "ekashu_hash_code_type", request["ekashu_hash_code_type"] },
                { "ekashu_hash_code_version", request["ekashu_hash_code_version"] },
                { "ekashu_include_post", null! },
                { "ekashu_invoice_address_editable", null! },
                { "ekashu_invoice_address_required", null! },
                { "ekashu_invoice_email_address_mandatory", null! },
                { "ekashu_invoice_phone_number_mandatory", null! },
                { "ekashu_invoice_title_mandatory", null! },
                { "ekashu_locale", request["ekashu_locale"] },
                { "ekashu_payment_methods", null! },
                { "ekashu_reference", request["ekashu_reference"] },
                { "ekashu_request_type", request["ekashu_request_type"] },
                { "ekashu_return_text", null! },
                { "ekashu_seller_address", null! },
                { "ekashu_seller_email_address", null! },
                { "ekashu_seller_id", request["ekashu_seller_id"] },
                { "ekashu_seller_key", request["ekashu_seller_key"] },
                { "ekashu_seller_name", null! },
                { "ekashu_shortcut_icon", null! },
                { "ekashu_style_sheet", null! },
                { "ekashu_success_url", request["ekashu_success_url"] },
                { "ekashu_title", null! },
                { "ekashu_verification_value_mask", null! },
                { "ekashu_verification_value_verify", null! },
                { "ekashu_viewport", null! }
            };

            byte[] hashcodeInputBytes = Encoding.UTF8.GetBytes(string.Join("&", hashcodeInput.Values));

            using (HMACSHA256 hmac = new HMACSHA256(Encoding.UTF8.GetBytes(hashKey)))
            {
                byte[] hash = hmac.ComputeHash(hashcodeInputBytes);
                return Ok(new { message = "eKashu hash generated", hash = Convert.ToBase64String(hash) });
            }
        }
    }
}