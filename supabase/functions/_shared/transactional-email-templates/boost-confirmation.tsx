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
  divider,
  footer,
  h1,
  header,
  label,
  main,
  stat,
  text,
} from './_styles.ts'

interface Props {
  name?: string
  admitCardNumber?: string
  classLevel?: string
  targetExam?: string
  preferredCentre?: string
}

const BoostConfirmationEmail = ({
  name,
  admitCardNumber,
  classLevel,
  targetExam,
  preferredCentre,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>BOOST 2026 registration confirmed — save your admit card</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>{SITE_NAME}</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>
            {name ? `You're in, ${name}!` : 'Registration confirmed!'}
          </Heading>
          <Text style={text}>
            Your spot for the <strong>BOOST 2026 Scholarship Test</strong> is
            reserved. Save your admit card number below — you&apos;ll need it on
            exam day.
          </Text>
          {admitCardNumber && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '2px solid #F97316',
                borderRadius: '12px',
                padding: '16px 20px',
                textAlign: 'center' as const,
                margin: '16px 0',
              }}
            >
              <Text style={{ ...label, margin: '0 0 6px' }}>Admit card</Text>
              <Text
                style={{
                  fontFamily: 'monospace',
                  fontSize: '22px',
                  fontWeight: '800',
                  color: '#1E293B',
                  margin: 0,
                  letterSpacing: '1px',
                }}
              >
                {admitCardNumber}
              </Text>
            </div>
          )}
          <div style={divider} />
          {classLevel && (
            <>
              <Text style={label}>Class</Text>
              <Text style={stat}>{classLevel}</Text>
            </>
          )}
          {targetExam && (
            <>
              <Text style={{ ...label, marginTop: '12px' }}>Target exam</Text>
              <Text style={stat}>{targetExam}</Text>
            </>
          )}
          {preferredCentre && (
            <>
              <Text style={{ ...label, marginTop: '12px' }}>Preferred centre</Text>
              <Text style={stat}>{preferredCentre}</Text>
            </>
          )}
          <Text style={{ ...text, marginTop: '20px' }}>
            Our team will WhatsApp you within 24 hours with the payment link and
            exam-day instructions.
          </Text>
        </Section>
        <Text style={footer}>
          Questions about BOOST? Just reply to this email — we&apos;re here to help.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BoostConfirmationEmail,
  subject: `BOOST 2026 registration confirmed — ${SITE_NAME}`,
  displayName: 'BOOST registration confirmation',
  previewData: {
    name: 'Aanya',
    admitCardNumber: 'BOOST-2026-000123',
    classLevel: 'Class 11',
    targetExam: 'JEE',
    preferredCentre: 'Kota — Indra Vihar',
  },
} satisfies TemplateEntry
