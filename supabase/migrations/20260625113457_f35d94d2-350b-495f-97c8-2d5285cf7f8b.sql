
CREATE TABLE IF NOT EXISTS public.site_pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT ON public.site_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_pages TO authenticated;
GRANT ALL ON public.site_pages TO service_role;

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_pages public read"
  ON public.site_pages FOR SELECT
  USING (true);

CREATE POLICY "site_pages admin insert"
  ON public.site_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "site_pages admin update"
  ON public.site_pages FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "site_pages admin delete"
  ON public.site_pages FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE TRIGGER site_pages_set_updated_at
  BEFORE UPDATE ON public.site_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial content (only if missing) — preserves current website copy
INSERT INTO public.site_pages (slug, title, content_html) VALUES
  ('achievements', 'Our Achievements',
   '<p>Since 1981, Bansal Classes has shaped thousands of IITians, NEET qualifiers and Olympiad winners. The numbers below represent the trust families across India have placed in us — and the discipline of every student who walked through our doors.</p><h2>Highlights</h2><ul><li><strong>330+</strong> AIR in the Top 100 of JEE Advanced 2025</li><li><strong>25,000+</strong> IITians mentored across four decades</li><li><strong>5,000+</strong> NEET qualifiers</li><li><strong>85+</strong> centres across India</li></ul><p>Scroll down to see the latest names on our Wall of Fame.</p>'),
  ('disclaimer', 'Disclaimer',
   '<p>All content on this website — including text, images, videos, study material, test questions and rank information — is published for general informational purposes and for the benefit of Bansal Classes students.</p><h2>Results</h2><p>Ranks, results and testimonials published on this website belong to actual Bansal Classes students. Individual results vary and depend on each student''s effort, attendance and consistency. We do not guarantee specific ranks or selection.</p><h2>Third-party content</h2><p>References to JEE, NEET, NTA, CBSE and other examination bodies are made solely to identify the relevant examination. Bansal Classes is not affiliated with or endorsed by these bodies.</p><h2>Changes</h2><p>Course fees, schedules, faculty allocation and study material may be revised from time to time without prior notice. The latest information published on our official website prevails.</p><h2>Contact</h2><p>For any clarification, write to <a href="mailto:admin@bansal.ac.in">admin@bansal.ac.in</a>.</p>'),
  ('terms', 'Terms & Conditions',
   '<p>By accessing the Bansal Classes website, mobile app or any of our offline centers, you agree to these Terms &amp; Conditions.</p><h2>Enrollment</h2><p>Course enrollment is subject to availability of seats, fulfilment of eligibility criteria and payment of fees as published on our official channels. Bansal Classes reserves the right to accept or decline any application at its sole discretion.</p><h2>Use of digital products</h2><ul><li>Login credentials are personal and non-transferable.</li><li>Recording, downloading or redistributing our live classes, recorded lectures, notes or test material is strictly prohibited.</li><li>We may suspend access in case of misuse, payment default or violation of these terms.</li></ul><h2>Conduct at centers</h2><p>Students are expected to follow the discipline, attendance and conduct rules notified by their respective center. The center administration''s decision is final on disciplinary matters.</p><h2>Limitation of liability</h2><p>Bansal Classes shall not be liable for indirect, incidental or consequential damages arising out of the use or inability to use our services. Outcomes in entrance exams depend on individual effort and several external factors.</p><h2>Governing law</h2><p>These terms are governed by the laws of India. All disputes are subject to the exclusive jurisdiction of courts in Kota, Rajasthan.</p>'),
  ('privacy', 'Privacy Policy',
   '<p>Bansal Classes Private Limited ("Bansal Classes", "we", "our") is committed to protecting the privacy of every student, parent and visitor who interacts with our website, mobile applications and offline centers.</p><h2>Information we collect</h2><ul><li>Contact details you submit through enquiry, admission or career forms (name, email, phone, city).</li><li>Academic information you provide when enrolling — class, target exam, school, board.</li><li>Payment information processed via secure third-party gateways (we do not store card numbers).</li><li>Usage data such as pages visited, time spent and device information.</li></ul><h2>How we use your information</h2><ul><li>To respond to admission and career enquiries.</li><li>To deliver classes, tests, study material and academic support.</li><li>To send transactional emails, schedule updates, and notifications relevant to your courses.</li><li>To improve our products and services based on aggregated usage analytics.</li></ul><h2>Data sharing</h2><p>We do not sell your personal information. We share data only with trusted service providers (hosting, payment gateways, communication tools) that help us operate, and only to the extent necessary.</p><h2>Your rights</h2><p>You may request access, correction or deletion of your personal information at any time by writing to <a href="mailto:admin@bansal.ac.in">admin@bansal.ac.in</a>.</p><h2>Contact</h2><p>Bansal Tower, A-10, Road No. 1, IPIA, Kota-324005, Rajasthan. Phone: +91 9773343246.</p>'),
  ('refund-policy', 'Refund Policy',
   '<h2>Course fee refunds</h2><p>We refund course fees only till the 7th day from the date of course commencement — applicable to every course and phase, with no exceptions.</p><p>If you join late, miss classes, or never attend a single session, the refund window still closes on the 7th day. Refunds are only possible out of the First Installment and before the dates stated in the Information Bulletin. No refund is allowed from the Second Installment, and no refund is given if you leave after the last refund date.</p><h2>How to request a refund</h2><p>Requests must be submitted in hard copy (fax, phone, SMS, or mobile requests are not accepted) personally or by post to: Account Manager, Bansal Classes, A-11(a), IPIA, Road No. 1, Kota, Rajasthan.</p><p>Include your name, roll number, course, original receipt, ID card, and full bank details (bank name, account number, branch, and account holder name).</p><h2>Processing time</h2><p>Once the application is received and verified, refund is initiated within 10–15 working days.</p><h2>Jurisdiction</h2><p>For any legal dispute, jurisdiction is Kota (Rajasthan) only.</p>')
ON CONFLICT (slug) DO NOTHING;
