import { ReviewStatus, VerificationState } from '../../shared/types/enums';

Component({
  properties: {
    label: { type: String, value: '' },
    reviewStatus: { type: String, value: ReviewStatus.DRAFT },
    verificationState: { type: String, value: VerificationState.USER_DECLARED },
  },
  data: {
    visible: false,
  },
  observers: {
    'reviewStatus, verificationState'(reviewStatus: string, verificationState: string) {
      this.setData({
        visible:
          reviewStatus === ReviewStatus.APPROVED &&
          verificationState === VerificationState.HUMAN_REVIEWED,
      });
    },
  },
});
