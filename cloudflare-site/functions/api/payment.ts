export const onRequest = async (): Promise<Response> => {
  // TODO: Port PaymentController.cs (POST /api/pay) — direct-post sale to
  // transact.php with ACH/eCheck support, 3DS pass-through, and sandbox/secure
  // security keys. The original C# handler reads multipart FormData from
  // public/main.js and forwards URL-encoded form data to NMI.
  return new Response(
    "response=3&responsetext=NotImplemented%3A+%2Fapi%2Fpayment+is+not+yet+ported+to+Cloudflare+Pages+Functions.+See+functions%2Fapi%2Fpayment.ts.&response_code=300",
    {
      status: 501,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    }
  );
};
