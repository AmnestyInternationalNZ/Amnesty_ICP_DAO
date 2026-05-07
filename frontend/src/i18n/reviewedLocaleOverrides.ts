import type { SupportedLocale } from './types';
import type { DeepPartial, TranslationCatalog } from './resources';

export const reviewedLocaleOverrides = {} as Partial<Record<SupportedLocale, DeepPartial<TranslationCatalog>>>;
