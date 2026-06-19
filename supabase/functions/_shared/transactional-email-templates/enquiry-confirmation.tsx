import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME,
  brand,
  card,
  container,
  footer,
  h1,
  header,
  main,
  text,
} from './_styles.ts'

interface Props {
  name?: string
  source?: string
  message?: string
}

const EnquiryConfirmationEmail = ({ name, source, message }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your enquiry — we&apos;ll be in touch within 24 hours</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>{SITE_NAME}</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>
            {name ? `Thanks, ${name}!` : 'Thanks for reaching out!'}
          </Heading>
          <Text style={text}>
            We&apos;ve received your enquiry{source ? ` from our ${source} form` : ''} and a
            senior counsellor will personally call you within 24 hours with a
            tailored study plan, scholarship eligibility check and the right
            batch for you.
          </Text>
          {message && (
            <Text style={{ ...text, fontStyle: 'italic', borderLeft: '3px solid #F97316', paddingLeft: '12px' }}>
              &ldquo;{message.slice(0, 240)}{message.length > 240 ? '…' : ''}&rdquo;
            </Text>
          )}
          <Text style={text}>
            In the meantime, feel free to explore our courses, toppers and free
            resources on the website.
          </Text>
        </Section>
        <Text style={footer}>
          Need urgent help? Just reply to this email or call us — we&apos;re here for you.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EnquiryConfirmationEmail,
  subject: `We got your enquiry — ${SITE_NAME}`,
  displayName: 'Enquiry confirmation',
  previewData: { name: 'Aanya', source: 'website', message: 'Looking for JEE 2027 batch.' },
} satisfies TemplateEntry
