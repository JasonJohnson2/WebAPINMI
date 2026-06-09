import { json } from "./_shared";

export const onRequestGet = async (): Promise<Response> => {
  return json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "NMI V5 API Proxy Controller",
  });
};
