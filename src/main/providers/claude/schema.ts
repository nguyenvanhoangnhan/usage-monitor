import { z } from 'zod'

/**
 * Subset of the JSON Claude Code pipes into the statusline command.
 * `resets_at` is epoch seconds. Any window may be absent independently.
 */
export const claudeRateLimitWindowSchema = z.looseObject({
  used_percentage: z.number(),
  resets_at: z.number().nullable().optional()
})

export const claudeStatuslinePayloadSchema = z.looseObject({
  session_id: z.string().optional(),
  model: z
    .looseObject({
      id: z.string().optional(),
      display_name: z.string().optional()
    })
    .nullable()
    .optional(),
  rate_limits: z
    .looseObject({
      five_hour: claudeRateLimitWindowSchema.nullable().optional(),
      seven_day: claudeRateLimitWindowSchema.nullable().optional(),
      spend_limit: claudeRateLimitWindowSchema.nullable().optional()
    })
    .nullable()
    .optional()
})

export type ClaudeStatuslinePayload = z.infer<typeof claudeStatuslinePayloadSchema>
