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
  courseTitle?: string
  centreName?: string
  classLevel?: string
}

const CentreCourseEnquiryConfirmationEmail = ({
  name,
  courseTitle = 'the course',
  centreName,
  classLevel,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your enquiry about {courseTitle} is in</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>{SITE_NAME}</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>
            {name ? `Thanks, ${name}!` : 'Thanks for your enquiry!'}
          </Heading>
          <Text style={text}>
            We&apos;ve received your interest in <strong>{courseTitle}</strong>
            {centreName ? ` at our ${centreName} centre` : ''}. Our admissions
            team will contact you shortly with fee structure, batch timings and
            seat availability.
          </Text>
          <div style={divider} />
          <Text style={label}>Course</Text>
          <Text style={stat}>{courseTitle}</Text>
          {centreName && (
            <>
              <Text style={{ ...label, marginTop: '12px' }}>Centre</Text>
              <Text style={stat}>{centreName}</Text>
            </>
          )}
          {classLevel && (
            <>
              <Text style={{ ...label, marginTop: '12px' }}>Class / Year</Text>
              <Text style={stat}>{classLevel}</Text>
            </>
          )}
        </Section>
        <Text style={footer}>
          Have a question? Just reply to this email — we&apos;re happy to help.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CentreCourseEnquiryConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `Enquiry received: ${data.courseTitle || 'your course'} — ${SITE_NAME}`,
  displayName: 'Centre course enquiry confirmation',
  previewData: {
    name: 'Aanya',
    courseTitle: 'JEE Advanced Classroom Programme',
    centreName: 'Kota Main Campus',
    classLevel: 'Class 11',
  },
} satisfies TemplateEntry
