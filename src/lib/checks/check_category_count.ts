import { DataRowCheck, DataError } from '@/lib/DataRowParser';

export type CategoryCountCheckContext = {
  minCategoryCount: number;
}

export const categoryCountCheck: DataRowCheck<CategoryCountCheckContext> = {
  name: 'Check Category Count',
  async run(parser, emit, context) {
    if(emit({ status: 'in_progress', details: 'Category count check started' })) return;

    const categories = parser.data?.categories;

    if (!Array.isArray(categories)) {
      emit({ status: 'failed', error: new DataError('Categories must be an array', 'InvalidValueError') });
      return;
    }

    if (!context?.minCategoryCount) {
      emit({ status: 'failed', error: new DataError('Missing minimum category count', 'MissingContextError') });
      return;
    }

    if (categories.length < context.minCategoryCount) {
      emit({
        status: 'failed',
        error: new DataError(`Not enough categories provided. Minimum required: ${context.minCategoryCount}`, 'CategoryCountError')
      });
      return;
    }

    emit({ status: 'success', details: 'Category count check completed' });
  }
};
