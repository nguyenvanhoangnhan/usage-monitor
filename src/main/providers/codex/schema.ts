import { z } from 'zod'

/** Shape of `GET https://chatgpt.com/backend-api/wham/usage`. Unknown fields pass through. */
export const codexWindowSchema = z.looseObject({
  used_percent: z.number(),
  limit_window_seconds: z.number().optional(),
  reset_after_seconds: z.number().nullable().optional(),
  reset_at: z.number().nullable().optional()
})

export const codexRateLimitSchema = z.looseObject({
  allowed: z.boolean().optional(),
  limit_reached: z.boolean().optional(),
  primary_window: codexWindowSchema.nullable().optional(),
  secondary_window: codexWindowSchema.nullable().optional()
})

export const codexAdditionalLimitSchema = z.looseObject({
  limit_name: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  rate_limit: codexRateLimitSchema.nullable().optional()
})

export const codexUsageSchema = z.looseObject({
  plan_type: z.string().nullable().optional(),
  rate_limit: codexRateLimitSchema.nullable().optional(),
  additional_rate_limits: z.array(codexAdditionalLimitSchema).nullable().optional()
})

export type CodexWindow = z.infer<typeof codexWindowSchema>
export type CodexRateLimit = z.infer<typeof codexRateLimitSchema>
export type CodexUsageResponse = z.infer<typeof codexUsageSchema>
