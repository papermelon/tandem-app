alter table public.care_recipients
add column if not exists care_profile jsonb not null default '{}'::jsonb,
add column if not exists phone text,
add column if not exists relationship text,
add column if not exists country text;

update public.care_recipients
set
  name = 'Ah Muay',
  relationship = coalesce(relationship, 'Mother'),
  country = coalesce(country, 'Singapore'),
  phone = coalesce(phone, '+65 8123 4567'),
  care_profile = case
    when care_profile = '{}'::jsonb then jsonb_build_object(
      'summary', 'Quick reference for meals, mobility, and daily safety checks.',
      'updatedAt', 'today',
      'sections', jsonb_build_array(
        jsonb_build_object('label', 'Food texture', 'value', 'Soft foods preferred', 'notes', jsonb_build_array('Avoid hard or crunchy food unless someone is supervising.', 'Cut meat and fruit into small pieces.')),
        jsonb_build_object('label', 'Drinks', 'value', 'Warm water or milo', 'notes', jsonb_build_array('Encourage small sips during meals.')),
        jsonb_build_object('label', 'Mobility', 'value', 'Use walking stick outside', 'notes', jsonb_build_array('Hold her arm on stairs or wet floors.')),
        jsonb_build_object('label', 'Watch for', 'value', 'Dizziness, missed meals, new confusion', 'notes', jsonb_build_array('Add a note if symptoms appear after medication.'))
      )
    )
    else care_profile
  end
where id = 'mum';
