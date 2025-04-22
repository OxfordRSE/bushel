import {DataError, DataRowCheck} from '@/lib/DataRowParser';

export const selectValuesCheck: DataRowCheck<never> = {
  name: 'Check Select values',
  async run(parser, emit) {

    if (emit({ status: 'in_progress' })) return;

    if (!parser.data) {
      emit({ status: 'failed', details: 'No data to check' });
      return;
    }

    for (const key in parser.data) {
        const field = parser.fields.find(f => f.name === key);
        const options = field?.internal_settings?.options;
        if (!options) continue;
        const value = parser.data[key];
        if (!(value instanceof Array)) {
            if (emit({ status: 'failed', error: new DataError(`${key} must be an array (not "${value}")`, 'InvalidValueError') })) return;
        }
        const vv = value as string[];
        for (let i = 0; i < vv.length; i++) {
          const v = String(vv[i]);
          if (!options.includes(v)) {
            if(emit({ status: 'failed', error: new DataError(`${v} is not a valid option for ${key}`, 'InvalidOptionError') })) return;
          }
        }
    }

    emit({ status: 'success', details: 'All select fields have legitimate values' });
  }
};
