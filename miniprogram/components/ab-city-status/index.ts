import { OperationalState } from '../../shared/types/enums';

Component({
  properties: {
    cityName: { type: String, value: '' },
    operationalState: { type: String, value: OperationalState.PLANNED },
  },
});
