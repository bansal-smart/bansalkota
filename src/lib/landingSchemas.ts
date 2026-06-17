import { z } from "zod";

export const leadFormSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a valid phone")
    .max(20)
    .regex(/^[+\d\s-]+$/, "Digits, spaces, + and - only"),
  email: z
    .string()
    .trim()
    .max(200)
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  class_level: z.string().trim().max(40).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export type HeroConfig = {
  banner_url?: string;
  title?: string;
  subtitle?: string;
  start_date?: string;
  seats_left?: number;
  seats_enabled?: boolean;
  early_bird_deadline?: string | null;
  early_bird_enabled?: boolean;
  cta_label?: string;
};

export type Highlight = { icon: string; title: string; text: string };
export type Faq = { q: string; a: string };
export type BannerItem = {
  image_url: string;
  caption?: string;
  link?: string;
  alt?: string;
};

export type DetailsBlock = {
  eligibility?: string;
  duration?: string;
  mode?: string;
  batch_start?: string;
  language?: string;
  schedule?: string;
};

export type ContactBlock = {
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
};

export type FormConfig = {
  show_city?: boolean;
  show_message?: boolean;
  submit_label?: string;
  success_message?: string;
};

export type LandingConfig = {
  id: string;
  hero: HeroConfig;
  overview: string;
  highlights: Highlight[];
  outcomes: string[];
  details: DetailsBlock;
  faqs: Faq[];
  contact: ContactBlock;
  form_config: FormConfig;
  is_published: boolean;
};
