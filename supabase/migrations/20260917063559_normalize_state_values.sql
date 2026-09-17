-- Normalize free-text state values to the canonical Indian States/UTs spelling.
-- Only confident, unambiguous variants are mapped; anything else (junk/ambiguous
-- values like "Patna", "india", "s", "KA") is left untouched for manual review.

-- boost_registrations
UPDATE public.boost_registrations SET state = 'Rajasthan'
  WHERE state IN ('RAJASTHAN', 'Rajsthan', 'rajasthan', 'Raj');
UPDATE public.boost_registrations SET state = 'Maharashtra'
  WHERE state IN ('MAHARASHTRA', 'maharastra', 'Mharashtra', 'Maharastra', 'MAHARASTRA');
UPDATE public.boost_registrations SET state = 'Uttar Pradesh'
  WHERE state IN ('UP', 'Up', 'UTTAR PRADESH');
UPDATE public.boost_registrations SET state = 'West Bengal'
  WHERE state IN ('WEST BENGAL', 'Westbengal');
UPDATE public.boost_registrations SET state = 'Jammu and Kashmir'
  WHERE state IN ('Jammu and kashmir');
UPDATE public.boost_registrations SET state = 'Punjab'
  WHERE state IN ('PUNJAB');
UPDATE public.boost_registrations SET state = 'Bihar'
  WHERE state IN ('BIHAR');
UPDATE public.boost_registrations SET state = 'Andhra Pradesh'
  WHERE state IN ('ANDHRA PRADESH');
UPDATE public.boost_registrations SET state = 'Telangana'
  WHERE state IN ('telengana');
UPDATE public.boost_registrations SET state = 'Madhya Pradesh'
  WHERE state IN ('Madhyapradesh');
UPDATE public.boost_registrations SET state = NULL
  WHERE state = '';

-- course_enquiries
UPDATE public.course_enquiries SET state = 'Rajasthan' WHERE state = 'rajasthan';
UPDATE public.course_enquiries SET state = 'Maharashtra' WHERE state = 'maharashtra';
UPDATE public.course_enquiries SET state = 'Uttar Pradesh' WHERE state = 'Uttar pradesh';
UPDATE public.course_enquiries SET state = 'Tamil Nadu' WHERE state = 'tamil nadu';
UPDATE public.course_enquiries SET state = NULL WHERE state = '';

-- centres
UPDATE public.centres SET state = 'Punjab' WHERE state = 'PUNJAB';
UPDATE public.centres SET state = 'Jammu and Kashmir' WHERE state = 'Jammu & Kashmir';
UPDATE public.centres SET state = NULL WHERE state = '';

-- profiles
UPDATE public.profiles SET state = NULL WHERE state = '';
