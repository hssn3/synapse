/**
 * Form Engine Data Transfer Objects & Zod Schemas
 */
const { z } = require('zod');

// اعتبارسنجی ایجاد فرم پایه
const CreateFormSchema = z.object({
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-_]+$/, 'شناسه یکتا (slug) فقط شامل حروف کوچک انگلیسی، ارقام و خط تیره باشد'),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  category: z.string().default('general'),
  version_no: z.number().int().min(1).default(1).optional(),
  revision_no: z.number().int().min(0).max(20).default(0).optional(),
  initial_schema: z.record(z.any()).optional(),
  initial_ui_schema: z.record(z.any()).optional()
});

// اعتبارسنجی ثبت نسخه جدید فرم
const CreateFormVersionSchema = z.object({
  schema: z.record(z.any()), // JSON Schema v7
  ui_schema: z.record(z.any()).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('published')
});

// اعتبارسنجی تنظیم ماتریس دسترسی فرم
const UpdateFormPermissionsSchema = z.object({
  permissions: z.array(z.object({
    role_code: z.string(),
    can_view: z.boolean().default(true),
    can_fill: z.boolean().default(false),
    can_edit: z.boolean().default(false),
    can_approve: z.boolean().default(false),
    can_delete: z.boolean().default(false),
    field_rules: z.record(z.any()).optional()
  }))
});

// اعتبارسنجی بررسی پاسخ فرم
const ReviewSubmissionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejection_reason: z.string().optional()
});

module.exports = {
  CreateFormSchema,
  CreateFormVersionSchema,
  UpdateFormPermissionsSchema,
  ReviewSubmissionSchema
};
