import { definePlugin } from "nitro";
import { initializeBenchproof, requestOnchainSync } from "../../src/lib/benchproof/queries.ts";

export default definePlugin(() => {
  void initializeBenchproof().catch((error) => {
    console.error("[benchproof] startup initialization failed", error instanceof Error ? error.message : "unknown error");
  });
  // ponytail: one bounded single-instance timer; move to a durable worker when deployment scales out.
  const timer = setInterval(() => {
    void requestOnchainSync().catch((error) => {
      console.error("[benchproof] scheduled on-chain sync failed", error instanceof Error ? error.message : "unknown error");
    });
  }, 60_000);
  timer.unref?.();
});
