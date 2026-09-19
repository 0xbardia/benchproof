import type { ClaimStatus } from "./constants.ts";
import type { ClaimOperation } from "./types.ts";

const TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  DRAFT: ["OPEN"],
  OPEN: ["CHALLENGED", "EVALUATING", "FINALIZED"],
  CHALLENGED: ["CHALLENGED", "EVALUATING", "FINALIZED"],
  EVALUATING: ["FINALIZED"],
  FINALIZED: [],
};

export function canTransition(from: ClaimStatus, to: ClaimStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: ClaimStatus, to: ClaimStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`illegal transition: ${from} → ${to}`);
  }
}

export function canAddEvidence(status: ClaimStatus, sender: string, claimant: string): boolean {
  return status === "DRAFT" && sender === claimant;
}

export function canPublish(status: ClaimStatus, sender: string, claimant: string, evidenceCount: number): boolean {
  return status === "DRAFT" && sender === claimant && evidenceCount >= 1;
}

export function canChallenge(status: ClaimStatus, sender: string, claimant: string): boolean {
  if (sender === claimant) return false;
  return status === "OPEN" || status === "CHALLENGED";
}

export function canEvaluate(status: ClaimStatus): boolean {
  return status === "OPEN" || status === "CHALLENGED";
}

export function isOperationPending(operation: ClaimOperation | null | undefined): boolean {
  return Boolean(
    operation &&
      ["QUEUED", "SUBMITTED", "CONSENSUS_PENDING", "RECONCILING"].includes(operation.state),
  );
}

export function nextStatusAfterChallenge(status: ClaimStatus): ClaimStatus {
  if (status === "OPEN") return "CHALLENGED";
  return status;
}
