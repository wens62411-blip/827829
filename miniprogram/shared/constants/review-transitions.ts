import { ReviewStatus } from '../types/enums';

export const REVIEW_STATUS_TRANSITIONS = [
  [ReviewStatus.DRAFT, ReviewStatus.SUBMITTED],
  [ReviewStatus.SUBMITTED, ReviewStatus.UNDER_REVIEW],
  [ReviewStatus.UNDER_REVIEW, ReviewStatus.APPROVED],
  [ReviewStatus.UNDER_REVIEW, ReviewStatus.REJECTED],
  [ReviewStatus.UNDER_REVIEW, ReviewStatus.NEEDS_CHANGES],
  [ReviewStatus.NEEDS_CHANGES, ReviewStatus.SUBMITTED],
  [ReviewStatus.APPROVED, ReviewStatus.EXPIRED],
  [ReviewStatus.APPROVED, ReviewStatus.REVOKED],
] as const;

export function isLegalReviewTransition(from: ReviewStatus, to: ReviewStatus): boolean {
  return REVIEW_STATUS_TRANSITIONS.some(([allowedFrom, allowedTo]) =>
    allowedFrom === from && allowedTo === to);
}

