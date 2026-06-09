import { buildClearCookie } from "../../_auth";

export const onRequest = async (): Promise<Response> => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/login",
      "Set-Cookie": buildClearCookie(),
      "Cache-Control": "no-store",
    },
  });
};
