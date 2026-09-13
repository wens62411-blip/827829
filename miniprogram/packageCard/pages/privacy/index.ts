import { Visibility } from '../../../shared/types/enums';
import { getRuntimeEvidence } from '../../../pages/card/services/identity-client';

Page({
  data: {
    runtimeMode: 'OFFLINE_DEMO',
    permanentPrivateFields: [
      { fieldKey: 'phone', label: '电话号码', visibility: Visibility.PRIVATE },
      { fieldKey: 'email', label: '邮箱地址', visibility: Visibility.PRIVATE },
    ],
  },

  onLoad() {
    this.setData({ runtimeMode: getRuntimeEvidence().runtimeMode });
  },

  returnToEditor() {
    if (getCurrentPages().length > 1) {
      void wx.navigateBack();
      return;
    }
    void wx.redirectTo({ url: '/packageCard/pages/edit/index' });
  },
});
