INSERT INTO public.exams (name, code, description, sort_order) VALUES
  ('BOOST', 'boost', 'Bansal BOOST Scholarship Test', 60),
  ('BFTP', 'bftp', 'Bansal Free Talent Program', 70)
ON CONFLICT (name) DO NOTHING;
