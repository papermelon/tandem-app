alter table public.care_recipients
add column if not exists relationship text,
add column if not exists country text;

update public.care_recipients
set
  relationship = coalesce(relationship, 'Mother'),
  country = coalesce(country, 'Singapore')
where id = 'mum';
