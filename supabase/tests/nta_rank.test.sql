DO $$
DECLARE v jsonb;
BEGIN
  -- T1 order by total marks
  v := '[{"key":"A","score":50},{"key":"B","score":80},{"key":"C","score":60}]';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='B') = 1, 'T1 B first';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='C') = 2, 'T1 C second';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='A') = 3, 'T1 A third';

  -- T2 JEE tie on total broken by Mathematics
  v := '[{"key":"A","score":100,"subjects":{"Mathematics":{"score":40},"Physics":{"score":30},"Chemistry":{"score":30}}},
         {"key":"B","score":100,"subjects":{"Mathematics":{"score":30},"Physics":{"score":40},"Chemistry":{"score":30}}}]';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='A') = 1, 'T2 maths decides';

  -- T3 JEE: Physics is compared before Chemistry
  v := '[{"key":"A","score":100,"subjects":{"Mathematics":{"score":40},"Physics":{"score":35},"Chemistry":{"score":25}}},
         {"key":"B","score":100,"subjects":{"Mathematics":{"score":40},"Physics":{"score":25},"Chemistry":{"score":35}}}]';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-advanced') WHERE row_key='A') = 1, 'T3 physics before chemistry';

  -- T4 NEET: Biology first
  v := '[{"key":"A","score":100,"subjects":{"Biology":{"score":60},"Chemistry":{"score":20},"Physics":{"score":20}}},
         {"key":"B","score":100,"subjects":{"Biology":{"score":50},"Chemistry":{"score":30},"Physics":{"score":20}}}]';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'neet') WHERE row_key='A') = 1, 'T4 biology first';

  -- T5 NEET: Chemistry before Physics
  v := '[{"key":"A","score":100,"subjects":{"Biology":{"score":50},"Chemistry":{"score":30},"Physics":{"score":20}}},
         {"key":"B","score":100,"subjects":{"Biology":{"score":50},"Chemistry":{"score":20},"Physics":{"score":30}}}]';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'neet') WHERE row_key='A') = 1, 'T5 chemistry before physics';

  -- T6 equal subject marks: fewer wrong answers per correct wins (overall ratio)
  v := '[{"key":"A","score":100,"subjects":{"Mathematics":{"score":40,"correct":10,"attempted":14},"Physics":{"score":30},"Chemistry":{"score":30}}},
         {"key":"B","score":100,"subjects":{"Mathematics":{"score":40,"correct":10,"attempted":11},"Physics":{"score":30},"Chemistry":{"score":30}}}]';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='B') = 1, 'T6 overall ratio';

  -- T7 same overall ratio, Mathematics ratio decides
  v := '[{"key":"A","score":100,"subjects":{"Mathematics":{"score":40,"correct":10,"attempted":12},"Physics":{"score":30,"correct":10,"attempted":10},"Chemistry":{"score":30}}},
         {"key":"B","score":100,"subjects":{"Mathematics":{"score":40,"correct":10,"attempted":10},"Physics":{"score":30,"correct":10,"attempted":12},"Chemistry":{"score":30}}}]';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='B') = 1, 'T7 maths ratio';

  -- T8 same overall and Mathematics ratio, Physics ratio comes before Chemistry ratio
  v := '[{"key":"A","score":100,"subjects":{"Mathematics":{"score":40,"correct":10,"attempted":10},"Physics":{"score":30,"correct":10,"attempted":12},"Chemistry":{"score":30,"correct":10,"attempted":10}}},
         {"key":"B","score":100,"subjects":{"Mathematics":{"score":40,"correct":10,"attempted":10},"Physics":{"score":30,"correct":10,"attempted":10},"Chemistry":{"score":30,"correct":10,"attempted":12}}}]';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='B') = 1, 'T8 physics ratio before chemistry ratio';

  -- T9 zero-correct handling: nothing attempted is best, zero correct with wrong answers is worst
  v := '[{"key":"A","score":100,"subjects":{"Mathematics":{"score":40,"correct":0,"attempted":3}}},
         {"key":"B","score":100,"subjects":{"Mathematics":{"score":40,"correct":2,"attempted":3}}},
         {"key":"C","score":100,"subjects":{"Mathematics":{"score":40,"correct":0,"attempted":0}}}]';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='C') = 1, 'T9 C best';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='B') = 2, 'T9 B second';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='A') = 3, 'T9 A worst';

  -- T10 everything equal: earlier submission wins, then key order
  v := '[{"key":"A","score":100,"submitted_at":"2026-10-01T10:00:00Z"},
         {"key":"B","score":100,"submitted_at":"2026-10-01T09:00:00Z"},
         {"key":"C","score":100,"submitted_at":"2026-10-01T09:00:00Z"}]';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='B') = 1, 'T10 earlier time wins';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='C') = 2, 'T10 key breaks last tie';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='A') = 3, 'T10 latest submission last';

  -- T11 subject name aliases
  v := '[{"key":"A","score":100,"subjects":{"Maths":{"score":40},"Physics":{"score":30},"Chemistry":{"score":30}}},
         {"key":"B","score":100,"subjects":{"Mathematics":{"score":30},"Physics":{"score":40},"Chemistry":{"score":30}}}]';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='A') = 1, 'T11 Maths alias';
  v := '[{"key":"A","score":100,"subjects":{"Botany":{"score":30},"Zoology":{"score":30},"Chemistry":{"score":20},"Physics":{"score":20}}},
         {"key":"B","score":100,"subjects":{"Biology":{"score":50},"Chemistry":{"score":30},"Physics":{"score":20}}}]';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'neet') WHERE row_key='A') = 1, 'T11 Botany+Zoology sum to Biology';

  -- T12 other exam patterns ignore subject marks and use ratio, then time
  v := '[{"key":"A","score":100,"submitted_at":"2026-10-01T10:00:00Z","subjects":{"Mathematics":{"score":90},"Chemistry":{"score":10}}},
         {"key":"B","score":100,"submitted_at":"2026-10-01T09:00:00Z","subjects":{"Mathematics":{"score":10},"Chemistry":{"score":90}}}]';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'boost') WHERE row_key='B') = 1, 'T12 boost ignores subjects';

  -- T13 percentile: equal totals share it, topper is 100
  v := '[{"key":"A","score":100},{"key":"B","score":100},{"key":"C","score":50}]';
  ASSERT (SELECT percentile FROM public.nta_rank(v,'jee-main') WHERE row_key='A') = 100, 'T13 topper 100';
  ASSERT (SELECT percentile FROM public.nta_rank(v,'jee-main') WHERE row_key='B') = 100, 'T13 tied share percentile';
  ASSERT (SELECT percentile FROM public.nta_rank(v,'jee-main') WHERE row_key='C') = 33.3, 'T13 lowest 33.3';

  -- T14 ranks are unique 1..N even when every key ties
  v := '[{"key":"A","score":10},{"key":"B","score":10},{"key":"C","score":10},{"key":"D","score":10},{"key":"E","score":10}]';
  ASSERT (SELECT count(DISTINCT rank_num) FROM public.nta_rank(v,'jee-main')) = 5, 'T14 five distinct ranks';
  ASSERT (SELECT max(rank_num) FROM public.nta_rank(v,'jee-main')) = 5, 'T14 max rank is N';

  -- T15 rows sharing a key are merged (combined papers): scores and subject marks add up
  v := '[{"key":"R:1","score":60,"subjects":{"Mathematics":{"score":20}}},
         {"key":"R:1","score":40,"subjects":{"Mathematics":{"score":30}}},
         {"key":"R:2","score":100,"subjects":{"Mathematics":{"score":40}}}]';
  ASSERT (SELECT count(*) FROM public.nta_rank(v,'jee-main')) = 2, 'T15 two students';
  ASSERT (SELECT rank_num FROM public.nta_rank(v,'jee-main') WHERE row_key='R:1') = 1, 'T15 merged maths 50 beats 40';

  -- T16 empty input
  ASSERT (SELECT count(*) FROM public.nta_rank('[]'::jsonb,'jee-main')) = 0, 'T16 empty';
  ASSERT (SELECT count(*) FROM public.nta_rank(NULL,'jee-main')) = 0, 'T16 null';
END $$;
