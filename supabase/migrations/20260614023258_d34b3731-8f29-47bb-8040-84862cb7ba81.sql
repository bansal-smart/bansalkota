DO $$
DECLARE
  v_course_id uuid;
  v_batch_id uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  v_user_id uuid := 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
  v_existing uuid;
BEGIN
  -- 1. Get any course to anchor the batch
  SELECT id INTO v_course_id FROM public.courses ORDER BY created_at ASC LIMIT 1;
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'No courses exist - cannot create IT Testing batch';
  END IF;

  -- 2. Create the IT Testing batch
  INSERT INTO public.course_batches (id, course_id, code, name, is_active)
  VALUES (v_batch_id, v_course_id, 'IT-TEST', 'IT Testing (Internal)', true)
  ON CONFLICT (id) DO NOTHING;

  -- 3. Create or reuse the auth user
  SELECT id INTO v_existing FROM auth.users WHERE id = v_user_id OR phone = '0000000000' LIMIT 1;
  IF v_existing IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role,
      email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'it-testing@bansal.internal', crypt('0000000000', gen_salt('bf')),
      jsonb_build_object('provider','email','providers',ARRAY['email']),
      jsonb_build_object('full_name','Bansal IT Testing Team'),
      now(), now(), now(),
      '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
    VALUES (gen_random_uuid(), v_user_id, v_user_id::text,
            jsonb_build_object('sub', v_user_id::text, 'email', 'it-testing@bansal.internal'),
            'email', now(), now(), now());
  ELSE
    v_user_id := v_existing;
    UPDATE auth.users
       SET encrypted_password = crypt('0000000000', gen_salt('bf')),
           raw_user_meta_data = jsonb_build_object('full_name','Bansal IT Testing Team'),
           updated_at = now()
     WHERE id = v_user_id;
  END IF;

  -- 4. Profile row with roll + phone for CBT login
  INSERT INTO public.profiles (user_id, full_name, phone, roll_number, batch_id)
  VALUES (v_user_id, 'Bansal IT Testing Team', '0000000000', '000000', v_batch_id)
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        roll_number = EXCLUDED.roll_number,
        batch_id = EXCLUDED.batch_id;

  -- 5. Grant student role
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'student'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 6. Backfill: add IT Testing batch to every existing test's allowed list
  UPDATE public.tests
     SET cbt_allowed_batch_ids = COALESCE(cbt_allowed_batch_ids, ARRAY[]::uuid[]) || v_batch_id
   WHERE cbt_allowed_batch_ids IS NULL
      OR NOT (v_batch_id = ANY(cbt_allowed_batch_ids));
END $$;

-- 7. Trigger: auto-include IT Testing batch on every new/updated test
CREATE OR REPLACE FUNCTION public.ensure_it_testing_batch_on_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_id uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
BEGIN
  IF NEW.cbt_allowed_batch_ids IS NULL THEN
    NEW.cbt_allowed_batch_ids := ARRAY[v_batch_id];
  ELSIF NOT (v_batch_id = ANY(NEW.cbt_allowed_batch_ids)) THEN
    NEW.cbt_allowed_batch_ids := NEW.cbt_allowed_batch_ids || v_batch_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_it_testing_batch ON public.tests;
CREATE TRIGGER trg_ensure_it_testing_batch
BEFORE INSERT OR UPDATE OF cbt_allowed_batch_ids ON public.tests
FOR EACH ROW EXECUTE FUNCTION public.ensure_it_testing_batch_on_test();