-- Allow CSV upserts on toppers by natural key (name, exam, year). NULLS NOT DISTINCT so missing year still matches.
CREATE UNIQUE INDEX IF NOT EXISTS toppers_name_exam_year_key
  ON public.toppers (name, exam, year) NULLS NOT DISTINCT;