/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcome } from './welcome.tsx'
import { template as liveClassReminder } from './live-class-reminder.tsx'
import { template as paymentReceipt } from './payment-receipt.tsx'
import { template as enquiryConfirmation } from './enquiry-confirmation.tsx'
import { template as centreCourseEnquiryConfirmation } from './centre-course-enquiry-confirmation.tsx'
import { template as boostConfirmation } from './boost-confirmation.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome,
  'live-class-reminder': liveClassReminder,
  'payment-receipt': paymentReceipt,
  'enquiry-confirmation': enquiryConfirmation,
  'centre-course-enquiry-confirmation': centreCourseEnquiryConfirmation,
  'boost-confirmation': boostConfirmation,
}
