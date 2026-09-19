import { defineMiddleware } from "nitro";

/** Low-risk response protections; CSP/frame policy remain at the proxy boundary. */
export default defineMiddleware((event) => {
  event.res.headers.set("x-content-type-options", "nosniff");
  event.res.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  event.res.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
});
