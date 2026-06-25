
-- =========================================================
-- 1. SITE TESTIMONIALS
-- =========================================================
CREATE TABLE public.site_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rank_label text,
  quote text NOT NULL,
  avatar_url text,
  rating int DEFAULT 5,
  region text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_testimonials TO authenticated;
GRANT ALL ON public.site_testimonials TO service_role;
ALTER TABLE public.site_testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active testimonials" ON public.site_testimonials
  FOR SELECT USING (is_active = true OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "Admins manage testimonials" ON public.site_testimonials
  FOR ALL USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE TRIGGER trg_site_testimonials_updated BEFORE UPDATE ON public.site_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2. SITE STATS (homepage counter strip)
-- =========================================================
CREATE TABLE public.site_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  suffix text,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_stats TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_stats TO authenticated;
GRANT ALL ON public.site_stats TO service_role;
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active stats" ON public.site_stats
  FOR SELECT USING (is_active = true OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "Admins manage stats" ON public.site_stats
  FOR ALL USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE TRIGGER trg_site_stats_updated BEFORE UPDATE ON public.site_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3. LEADERSHIP PROFILES + SECTIONS
-- =========================================================
CREATE TABLE public.leadership_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  title text,
  hero_photo_url text,
  headline text,
  pull_quote text,
  intro text,
  recognition_text text,
  tags text[] DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leadership_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leadership_profiles TO authenticated;
GRANT ALL ON public.leadership_profiles TO service_role;
ALTER TABLE public.leadership_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active leaders" ON public.leadership_profiles
  FOR SELECT USING (is_active = true OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "Admins manage leaders" ON public.leadership_profiles
  FOR ALL USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE TRIGGER trg_leadership_profiles_updated BEFORE UPDATE ON public.leadership_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.leadership_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leadership_id uuid NOT NULL REFERENCES public.leadership_profiles(id) ON DELETE CASCADE,
  heading text NOT NULL,
  body text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leadership_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leadership_sections TO authenticated;
GRANT ALL ON public.leadership_sections TO service_role;
ALTER TABLE public.leadership_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read leader sections" ON public.leadership_sections
  FOR SELECT USING (true);
CREATE POLICY "Admins manage leader sections" ON public.leadership_sections
  FOR ALL USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE TRIGGER trg_leadership_sections_updated BEFORE UPDATE ON public.leadership_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_leadership_sections_leader ON public.leadership_sections(leadership_id, sort_order);

-- =========================================================
-- 4. SEED CONTENT
-- =========================================================
INSERT INTO public.site_testimonials (name, rank_label, quote, sort_order) VALUES
('Aarav Sharma', 'AIR 47 — JEE Advanced 2024', 'Bansal Classes transformed how I approach problems. The faculty guides you with a strategy, not just answers.', 1),
('Ishita Verma', 'AIR 112 — NEET UG 2024', 'Personal attention from mentors and constant test practice made all the difference in my final year.', 2),
('Rohan Mehta',  'AIR 286 — JEE Main 2024', 'From Pre-Foundation to JEE, Bansal has been my second home. Ideal for Scholars in every sense.', 3);

INSERT INTO public.site_stats (key, label, value, icon, sort_order) VALUES
('air_top_100',  'AIR in JEE Top 100', '30+',     'Trophy',        1),
('iit_select',   'IIT Selections',     '2,500+',  'GraduationCap', 2),
('neet_qual',    'NEET Qualifiers',    '5,000+',  'Star',          3),
('legacy_years', 'Years of Legacy',    '40+',     'ShieldCheck',   4);

WITH ins AS (
  INSERT INTO public.leadership_profiles (slug, name, title, headline, pull_quote, intro, recognition_text, tags, sort_order) VALUES
  ('vk-bansal', 'VK Bansal', 'Founder, Bansal Classes',
    'Born from a Father''s Vision. Carried by a Family''s Promise.',
    'Believe in yourself and strive for excellence with unwavering dedication. Success comes to those who persevere through challenges with a positive mindset and a thirst for knowledge.',
    'Bansal Sir was born on October 26, 1949, in the Jhansi district of Uttar Pradesh. His father was a government employee and his mother a homemaker. He graduated from the Indian Institute of Technology at Banaras Hindu University and worked at J. K. Synthetics in Kota before founding Bansal Classes in 1981 to provide proper guidance to JEE aspirants.',
    'Though his untimely passing left a void in the educational community, his contributions continue to shape the lives of aspiring engineers across India. Remembering VK Bansal — a mentor, a visionary, a legend.',
    ARRAY['Founder','Visionary Educator','Forever Honored'], 1),
  ('sameer-bansal', 'Sameer Bansal', 'Managing Director & CEO, Bansal Classes Kota',
    'Leading Bansal into the next chapter.',
    'Success is not just about hard work — it''s about smart strategy and relentless focus.',
    'Sameer Bansal leads Bansal Classes, Kota — one of India''s most prestigious coaching institutes for IIT-JEE & NEET. Known for his deep academic roots and modern leadership, he continues the legacy of founder VK Bansal by blending excellence, discipline and innovation.',
    'Widely praised by both students and educators, Sameer Bansal is considered a ''Mathematical Gem'' and a pillar of academic excellence.',
    ARRAY['Mathematics Expert','IITian Mentor','Visionary Leader'], 2),
  ('mahima-bansal', 'Mahima Bansal', 'Director & Academic Mentor, Bansal Classes Kota',
    'Nurturing purpose alongside performance.',
    'Education is not just about achieving ranks, it''s about nurturing purpose, passion and perseverance.',
    'Mahima Bansal plays a pivotal role in upholding the academic excellence and administrative vision of Bansal Classes. With a strong educational background and commitment to empowering students, she bridges traditional values with modern pedagogical approaches.',
    'Mahima Bansal is admired for her professional contributions and her ability to connect personally with students, offering them a nurturing and motivating environment. Her presence is a driving force behind the continued success and modernisation of the Bansal legacy.',
    ARRAY['Academic Leader','Mentor','Women in Education'], 3),
  ('neelam-bansal', 'Neelam Bansal', 'Co-founder & Matriarch, Bansal Classes Kota',
    'The quiet strength behind the legacy.',
    'Behind every strong institution is a woman who nurtures it with selfless strength and unconditional support.',
    'Mrs. Neelam Bansal has been the unwavering support system and guiding light behind the incredible success of Bansal Classes. As the wife of the legendary Mr. V.K. Bansal and mother of Mr. Sameer Bansal, her dedication, strength and wisdom have shaped the values and culture of the institution.',
    'Though often away from the spotlight, Mrs. Neelam Bansal''s role has been foundational to the success of the Bansal family and its legacy in Indian education — a symbol of grace, strength and silent determination.',
    ARRAY['Inspiration','Pillar of Strength','Visionary Support'], 4)
  RETURNING id, slug
)
INSERT INTO public.leadership_sections (leadership_id, heading, body, sort_order)
SELECT ins.id, s.heading, s.body, s.sort_order
FROM ins
JOIN (VALUES
  ('vk-bansal','Guiding Teachers','Bansal Sir aimed for comprehensive JEE exam guidance through a structured curriculum and innovative teaching, offering personalised support and motivation. His holistic approach empowered students to master the syllabus and confidently face exam challenges.',1),
  ('vk-bansal','Disciplinary Atmosphere','He continuously evolved teaching methods to meet students'' diverse needs, integrating the latest educational technologies to enhance understanding and performance. His adaptive approach ensured students were always well-prepared.',2),
  ('vk-bansal','Setting High Standards','Year after year, his leadership pushed boundaries in academic excellence — challenging both students and educators to strive for higher performance and fostering a culture of continuous improvement within Bansal Classes.',3),
  ('vk-bansal','Building a Legacy','VK Bansal aimed to leave a lasting impact on education by setting benchmarks in coaching innovation and success. His efforts revolutionised educational practices and continue to elevate student achievement across India.',4),
  ('sameer-bansal','Leadership Philosophy','Emphasises smart and strategic learning for success, with a strong student-first approach that adapts to evolving JEE and NEET exam patterns. Author of renowned mathematics books used by aspirants nationwide.',1),
  ('sameer-bansal','Modern Outlook','Drives the institute''s transition into a hybrid offline + online ecosystem — bringing live classes, recorded lectures, smart test series and AI-assisted doubt solving to every Bansal student.',2),
  ('mahima-bansal','Leadership & Initiatives','Drives academic planning and student mentorship at Bansal Classes. Actively involved in performance tracking, learning enhancement and a student-first philosophy that motivates aspirants to perform with balance and confidence.',1),
  ('mahima-bansal','Mentoring the Next Generation','Anchors faculty development and student support programs that have made Bansal a name synonymous with results — championing women in education along the way.',2),
  ('neelam-bansal','Legacy & Values','Embodies compassion and resilience as the cornerstone of Bansal Classes. Provided silent leadership and moral guidance during the formative years of the institute — a source of emotional strength for students, teachers and family alike.',1)
) AS s(slug, heading, body, sort_order) ON s.slug = ins.slug;

-- =========================================================
-- 5. TESTS: rank release
-- =========================================================
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS auto_release boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS results_released_at timestamptz;

-- Boolean helper
CREATE OR REPLACE FUNCTION public.test_results_released(_test_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN t.ends_at IS NULL THEN true
      WHEN t.results_released_at IS NOT NULL AND now() >= t.results_released_at THEN true
      WHEN t.auto_release AND now() >= t.ends_at THEN true
      ELSE false
    END
  FROM public.tests t WHERE t.id = _test_id;
$$;

-- Rank + comparison
CREATE OR REPLACE FUNCTION public.get_test_rank(_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt RECORD;
  v_test RECORD;
  v_released boolean;
  v_rank int;
  v_total int;
  v_topper numeric;
  v_avg numeric;
BEGIN
  SELECT * INTO v_attempt FROM public.test_attempts WHERE id = _attempt_id;
  IF v_attempt IS NULL THEN RETURN jsonb_build_object('error','not_found'); END IF;
  IF v_attempt.user_id <> auth.uid()
     AND NOT public.is_admin_or_super(auth.uid())
     AND NOT public.has_role(auth.uid(),'teacher'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_test FROM public.tests WHERE id = v_attempt.test_id;
  v_released := public.test_results_released(v_attempt.test_id);

  IF NOT v_released THEN
    RETURN jsonb_build_object(
      'released', false,
      'release_at', v_test.ends_at,
      'your_score', v_attempt.score
    );
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.test_attempts
    WHERE test_id = v_attempt.test_id AND status IN ('submitted','auto_submitted');
  SELECT COUNT(*) + 1 INTO v_rank FROM public.test_attempts
    WHERE test_id = v_attempt.test_id
      AND status IN ('submitted','auto_submitted')
      AND score > v_attempt.score;
  SELECT MAX(score), AVG(score) INTO v_topper, v_avg FROM public.test_attempts
    WHERE test_id = v_attempt.test_id AND status IN ('submitted','auto_submitted');

  RETURN jsonb_build_object(
    'released', true,
    'rank', v_rank,
    'total', v_total,
    'percentile', v_attempt.percentile,
    'your_score', v_attempt.score,
    'topper_score', v_topper,
    'average_score', ROUND(COALESCE(v_avg,0)::numeric, 2)
  );
END;
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_testimonials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leadership_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leadership_sections;
