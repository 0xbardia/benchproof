/** Recorded GenLayer deployment. Overridable by VITE_GENLAYER_* env vars. */
export const DEPLOYMENT = {
  network: "studionet",
  chainId: 61999,
  rpc: "https://studio.genlayer.com/api",
  explorer: "https://explorer-studio.genlayer.com",
  studio: "https://studio.genlayer.com/contracts",
  contractAddress: "0x2368a42582710f61AF4f29A432990328db32a2ec",
  deploymentTx: "0xd2b875600a60ef8bff48488441a4e9183940adde5cb6de46e5b5df02637669fa",
  evaluationTx: "0x3ce022d3e3874f85854c74e307a6acf231892b9563c459916acd4f699ca7be6a",
  evaluationVerdict: "INSUFFICIENT_EVIDENCE",
  evaluationClaimId: 1,
  finalized: true,
  version: "BenchProof-v1.0.1",
  proofTransactions: [
    { method: "contract_deployment", hash: "0xd2b875600a60ef8bff48488441a4e9183940adde5cb6de46e5b5df02637669fa" },
    { method: "create_claim", hash: "0x57354d60bfa1354c6c064cf183bb9fd5dd7fafbaaf5fc9c64d566efc1fa10ddc" },
    { method: "add_evidence", hash: "0xec4e8eb01e16f20d5c3dac731d55614372958b43882040df5e50ad660dfef86d" },
    { method: "add_evidence", hash: "0x5a7ed9e8ac18a6701bd0bbe789845953f3460ee37e9495230521f32e85b564d1" },
    { method: "publish_claim", hash: "0x5c5ad3f4a24d6cd9444ad8542e3ebd3d01d4ca9fce71d817fc53ed0b8432e76e" },
    { method: "challenge_claim", hash: "0x9de5171019be63bc1836953aa059a40d8483be76ee1bbeaf2b809c9ee8411247" },
    { method: "request_evaluation", hash: "0x3ce022d3e3874f85854c74e307a6acf231892b9563c459916acd4f699ca7be6a" },
  ],
} as const;

export function explorerTxUrl(hash: string) {
  if (!hash || !hash.startsWith("0x")) return "";
  return `${DEPLOYMENT.explorer}/tx/${hash}`;
}

export function explorerAddressUrl(address: string) {
  if (!address || !address.startsWith("0x")) return "";
  return `${DEPLOYMENT.explorer}/address/${address}`;
}

export function getPublicNetwork() {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  const vite =
    typeof import.meta !== "undefined"
      ? (import.meta as { env?: Record<string, string | undefined> }).env
      : undefined;
  const pick = (k: string, fallback: string) =>
    vite?.[k] || env?.[k] || env?.[k.replace("VITE_", "")] || fallback;
  return {
    network: pick("VITE_GENLAYER_NETWORK", DEPLOYMENT.network),
    chainId: Number(pick("VITE_GENLAYER_CHAIN_ID", String(DEPLOYMENT.chainId))),
    rpc: pick("VITE_GENLAYER_RPC", DEPLOYMENT.rpc),
    explorer: pick("VITE_GENLAYER_EXPLORER", DEPLOYMENT.explorer),
    contractAddress: pick("VITE_GENLAYER_CONTRACT_ADDRESS", DEPLOYMENT.contractAddress),
    deploymentTx: pick("VITE_GENLAYER_DEPLOYMENT_TX", DEPLOYMENT.deploymentTx),
    evaluationTx: pick("VITE_GENLAYER_EVALUATION_TX", DEPLOYMENT.evaluationTx),
    studio: DEPLOYMENT.studio,
    version: DEPLOYMENT.version,
    evaluationVerdict: DEPLOYMENT.evaluationVerdict,
    evaluationClaimId: DEPLOYMENT.evaluationClaimId,
    connected: Boolean(pick("VITE_GENLAYER_CONTRACT_ADDRESS", DEPLOYMENT.contractAddress)),
  };
}
