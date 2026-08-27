import type { FriendshipState } from '../../shared/types/enums';

export interface RelationshipActionInput {
  readonly friendshipState: FriendshipState | undefined;
  readonly viewerBlockedSubject: boolean;
  readonly subjectBlockedViewer: boolean;
  /** Only set from an action result or trusted incoming-list context. */
  readonly outgoingPendingKnown: boolean;
}

export interface RelationshipActionView {
  readonly statusLabel: string;
  readonly canRequest: boolean;
  readonly canCancel: boolean;
  readonly canRemove: boolean;
  readonly canBlock: boolean;
  readonly canUnblock: boolean;
  readonly canReport: boolean;
}

export function deriveRelationshipActions(input: RelationshipActionInput): RelationshipActionView {
  if (input.viewerBlockedSubject) {
    return {
      statusLabel: '已拉黑', canRequest: false, canCancel: false, canRemove: false,
      canBlock: false, canUnblock: true, canReport: true,
    };
  }
  if (input.subjectBlockedViewer) {
    return {
      statusLabel: '当前不可建立关系', canRequest: false, canCancel: false, canRemove: false,
      canBlock: false, canUnblock: false, canReport: true,
    };
  }
  switch (input.friendshipState) {
    case 'PENDING':
      return {
        statusLabel: '申请处理中', canRequest: false, canCancel: input.outgoingPendingKnown,
        canRemove: false, canBlock: true, canUnblock: false, canReport: true,
      };
    case 'ACCEPTED':
      return {
        statusLabel: '已认识', canRequest: false, canCancel: false, canRemove: true,
        canBlock: true, canUnblock: false, canReport: true,
      };
    case 'REJECTED':
      return {
        statusLabel: '申请未通过', canRequest: false, canCancel: false, canRemove: false,
        canBlock: true, canUnblock: false, canReport: true,
      };
    case 'CANCELLED':
      return {
        statusLabel: '申请已撤回', canRequest: false, canCancel: false, canRemove: false,
        canBlock: true, canUnblock: false, canReport: true,
      };
    case 'REMOVED':
      return {
        statusLabel: '关系已解除，可重新申请', canRequest: true, canCancel: false, canRemove: false,
        canBlock: true, canUnblock: false, canReport: true,
      };
    default:
      return {
        statusLabel: '尚未认识', canRequest: true, canCancel: false, canRemove: false,
        canBlock: true, canUnblock: false, canReport: true,
      };
  }
}

export const REVIEW_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  DRAFT: '草稿',
  SUBMITTED: '已提交',
  UNDER_REVIEW: '人工审核中',
  NEEDS_CHANGES: '需要补充材料',
  APPROVED: '审核通过',
  REJECTED: '审核未通过',
  EXPIRED: '已过期',
  REVOKED: '已撤销',
});
