import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema({ extend: z.object({ checkedWith: z.string().optional(), checkedOn: z.string().optional() }) }) }),
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
