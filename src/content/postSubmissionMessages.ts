/**
 * Centralised post-submission copy used after enquiry forms, the welcome
 * popup, payments and enrollment.  Keeping all the customer-facing
 * "thank-you" wording here so the tone stays consistent across the site.
 */

export const postSubmission = {
  enquiry: {
    title: (firstName: string) => `Thank you, ${firstName}!`,
    body: (phone?: string) =>
      phone
        ? `Our senior counsellor will personally call you on ${phone} within 24 hours — with your study plan, scholarship eligibility and the right batch for you.`
        : `Our senior counsellor will personally reach out within 24 hours — with your study plan, scholarship eligibility and the right batch for you.`,
    toast: "We'll call you within 24 hours.",
    ctaLabel: "WhatsApp our team",
    whatsappHref: "https://wa.me/918094555555",
    callLabel: "Call admissions",
    callHref: "tel:+919116223434",
  },
  welcomePopup: {
    title: (firstName: string) => `Welcome to Bansal, ${firstName}!`,
    body: (phone?: string) =>
      phone
        ? `A senior Bansal mentor will call you on ${phone} shortly — let's get your engineering or medical journey started.`
        : `A senior Bansal mentor will reach out shortly — let's get your engineering or medical journey started.`,
    toast: "We'll call you within 24 hours!",
  },
  payment: {
    title: "Welcome to Bansal Classes!",
    body: "Your enrollment is confirmed. Your journey to AIR begins now — head to your dashboard to access lectures, live classes and tests.",
    primaryCta: { label: "Go to Dashboard", href: "/dashboard" },
    secondaryCta: { label: "View My Courses", href: "/my-courses" },
  },
  enrollment: {
    title: "You're in!",
    body: "Welcome to the Bansal family. A study plan and orientation invite will reach your inbox within an hour.",
  },
};
