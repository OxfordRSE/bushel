import { DataRowCheck, DataError } from '@/lib/DataRowParser';

export type KeywordCountCheckContext = {
  minKeywordCount: number;
  maxKeywordCount: number;
}

export const keywordCountCheck: DataRowCheck<KeywordCountCheckContext> = {
  name: 'Check Keyword Count',
  async run(parser, emit, context) {
    const keywords = parser.data?.keywords;

    if (!Array.isArray(keywords)) {
      emit({ status: 'failed', error: new DataError('Keywords must be an array', 'InvalidValueError') });
      return;
    }

    if (!context?.maxKeywordCount) {
      emit({ status: 'failed', error: new DataError('Missing minimum keyword count', 'MissingContextError') });
      return;
    }

    if (!context?.minKeywordCount) {
      emit({ status: 'failed', error: new DataError('Missing maximum keyword count', 'MissingContextError') });
      return;
    }

    if (keywords.length > context.maxKeywordCount) {
      emit({
        status: 'failed',
        error: new DataError(`Too many categories provided. Maximum allowed: ${context.maxKeywordCount}`, 'KeywordCountError')
      });
      return;
    }

    if (keywords.length < context.minKeywordCount) {
      emit({
        status: 'failed',
        error: new DataError(`Not enough categories provided. Minimum required: ${context.minKeywordCount}`, 'KeywordCountError')
      });
      return;
    }

    emit({ status: 'success', details: 'Keyword count check completed' });
  }
};
