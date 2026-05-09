insert into public.users (id, name, role, avatar, phone, is_default_caregiver)
values
  ('rachel', 'Rachel', 'Default caregiver', 'R', '+65 9000 1122', true),
  ('ming', 'Ming', 'Sibling', 'M', '+65 9111 2233', false),
  ('lina', 'Lina', 'Sibling', 'L', '+65 9222 3344', false)
on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  avatar = excluded.avatar,
  phone = excluded.phone,
  is_default_caregiver = excluded.is_default_caregiver;

insert into public.care_circles (id, name, created_by)
values ('circle-mum', 'Mum care circle', 'rachel')
on conflict (id) do update set name = excluded.name;

insert into public.care_recipients (id, care_circle_id, name, age, context, address)
values ('mum', 'circle-mum', 'Mum', 78, 'Mild dementia, recent fall, rehab follow-up', 'Ang Mo Kio HDB flat')
on conflict (id) do update set
  name = excluded.name,
  age = excluded.age,
  context = excluded.context,
  address = excluded.address;

insert into public.circle_members (care_circle_id, user_id, member_role)
values
  ('circle-mum', 'rachel', 'primary'),
  ('circle-mum', 'ming', 'sibling'),
  ('circle-mum', 'lina', 'sibling')
on conflict (care_circle_id, user_id) do update set member_role = excluded.member_role;

insert into public.documents (id, care_circle_id, document_type, title, summary, uploaded_by_id, uploaded_at, important_dates, institutions, care_items)
values
  (
    'doc-hdb-ease',
    'circle-mum',
    'HDB EASE letter',
    'HDB EASE application letter',
    'HDB acknowledged the EASE application for bathroom grab bars and anti-slip flooring. A contractor quote is needed for the next step.',
    'lina',
    now() - interval '2 days',
    array[(now() + interval '3 days')::text],
    array['HDB', 'EASE'],
    array['Grab bars', 'Anti-slip bathroom treatment']
  ),
  (
    'doc-aic-letter',
    'circle-mum',
    'AIC grant letter',
    'AIC grant follow-up letter',
    'AIC requested supporting income documents and a signed caregiver declaration.',
    'lina',
    now() - interval '5 days',
    array[(now() + interval '10 days')::text],
    array['AIC'],
    array['Caregiver declaration', 'Income documents']
  )
on conflict (id) do update set summary = excluded.summary;

insert into public.timeline_items (id, care_circle_id, type, title, description, author_id, timestamp, linked_task_ids, linked_record_id, severity)
values
  ('tl-rehab', 'circle-mum', 'appointment', 'Rehab appointment tomorrow, 10:30am', 'SGH outpatient rehab confirmed. Please arrive 20 minutes early for registration.', 'rachel', now() - interval '1 day', array['task-rehab-transport'], null, null),
  ('tl-medication', 'circle-mum', 'task', 'Medication refill due in 2 days', 'Pharmacy says donepezil stock is available. Rachel has the prescription photo.', 'rachel', now() - interval '1 day' + interval '2 hours', array['task-med-refill'], null, null),
  ('tl-hdb', 'circle-mum', 'document', 'HDB EASE application letter uploaded', 'Letter confirms request for grab bars and anti-slip bathroom treatment. Contractor quote still needed.', 'lina', now() - interval '2 days', array['task-hdb-ease','task-grab-bars'], 'doc-hdb-ease', null),
  ('tl-no-movement', 'circle-mum', 'care signal', 'No usual morning movement detected by 10:30am', 'Kitchen and hallway sensors were quiet longer than Mum''s usual routine. Rachel completed a video check-in.', 'rachel', date_trunc('day', now()) + interval '10 hours 30 minutes', array['task-morning-check'], null, 'alert'),
  ('tl-doctor-note', 'circle-mum', 'note', 'Doctor asked us to watch for dizziness', 'After the recent fall, SGH doctor said to note dizzy spells, missed meals, and new confusion.', 'rachel', now() - interval '3 days', '{}', null, null),
  ('tl-meeting', 'circle-mum', 'meeting summary', 'Family call summary', 'Agreed to split transport, admin, and medication reminders more clearly for the next two weeks.', 'ming', now() - interval '4 days', '{}', null, null),
  ('tl-voice', 'circle-mum', 'voice update', 'Voice note: Mum walked slower today', 'Rachel noticed Mum taking smaller steps after lunch. No pain reported, but worth mentioning at rehab.', 'rachel', now() - interval '2 days' + interval '4 hours', '{}', null, null),
  ('tl-aic', 'circle-mum', 'document', 'AIC grant letter received', 'Letter requests income documents and a caregiver declaration before the next review.', 'lina', now() - interval '5 days', array['task-aic-call'], 'doc-aic-letter', null)
on conflict (id) do update set description = excluded.description;

insert into public.tasks (id, care_circle_id, title, category, assignee_id, due_date, status, priority, linked_record_id, linked_timeline_id, notes)
values
  ('task-rehab-transport', 'circle-mum', 'Confirm transport for SGH rehab appointment', 'transport', null, now() + interval '1 day', 'unclaimed', 'high', null, 'tl-rehab', 'Appointment starts at 10:30am. Mum needs help getting from the taxi drop-off to rehab.'),
  ('task-med-refill', 'circle-mum', 'Refill donepezil and blood pressure medication', 'medication', 'rachel', now() + interval '2 days', 'claimed', 'medium', null, 'tl-medication', null),
  ('task-hdb-ease', 'circle-mum', 'Upload HDB EASE contractor quote', 'admin', null, now() + interval '3 days', 'unclaimed', 'medium', 'doc-hdb-ease', null, null),
  ('task-aic-call', 'circle-mum', 'Call AIC about interim caregiving grant eligibility', 'admin', 'lina', now() + interval '4 days', 'claimed', 'medium', 'doc-aic-letter', null, null),
  ('task-polyclinic-review', 'circle-mum', 'Book polyclinic review after fall follow-up', 'appointment', 'rachel', now() + interval '5 days', 'claimed', 'medium', null, null, null),
  ('task-helper-roster', 'circle-mum', 'Check helper roster for night medication reminder', 'medication', null, date_trunc('day', now()) + interval '21 hours', 'unclaimed', 'medium', null, null, null),
  ('task-rehab-bill', 'circle-mum', 'Pay rehab invoice and upload receipt', 'finance', 'ming', now() + interval '6 days', 'claimed', 'low', null, null, null),
  ('task-morning-check', 'circle-mum', 'Morning video check-in after unusual movement alert', 'check-in', 'rachel', date_trunc('day', now()) + interval '11 hours', 'done', 'high', null, 'tl-no-movement', null),
  ('task-grab-bars', 'circle-mum', 'Schedule bathroom grab bar installation', 'home safety', 'lina', now() + interval '8 days', 'blocked', 'medium', 'doc-hdb-ease', null, 'Waiting for HDB EASE confirmation letter.'),
  ('task-memory-questions', 'circle-mum', 'Prepare questions for memory clinic review', 'appointment', 'rachel', now() + interval '7 days', 'claimed', 'medium', null, null, null)
on conflict (id) do update set
  title = excluded.title,
  assignee_id = excluded.assignee_id,
  status = excluded.status,
  due_date = excluded.due_date;

insert into public.care_signals (id, care_circle_id, label, description, timestamp, severity)
values
  ('signal-kitchen', 'circle-mum', 'Kitchen motion detected', 'Usual breakfast movement at 8:12am', date_trunc('day', now()) + interval '8 hours 12 minutes', 'normal'),
  ('signal-meds', 'circle-mum', 'Medication drawer opened', 'Drawer opened at 9:04am during the normal reminder window', date_trunc('day', now()) + interval '9 hours 4 minutes', 'normal'),
  ('signal-no-movement', 'circle-mum', 'No usual morning movement detected', 'No kitchen or hallway movement by 10:30am', date_trunc('day', now()) + interval '10 hours 30 minutes', 'alert'),
  ('signal-bp', 'circle-mum', 'Blood pressure photo recorded', 'Photo uploaded for family review, not clinical interpretation', now() - interval '1 day', 'watch'),
  ('signal-door', 'circle-mum', 'Front door opened', 'Front door opened at 7:45am, likely helper arrival', date_trunc('day', now()) + interval '7 hours 45 minutes', 'normal')
on conflict (id) do update set description = excluded.description;

insert into public.handovers (
  id,
  care_circle_id,
  range_label,
  current_situation,
  upcoming_appointments,
  active_tasks,
  medication_reminders,
  unresolved_admin,
  recent_concerns,
  who_is_doing_what,
  suggested_next_actions
)
values (
  'handover-demo',
  'circle-mum',
  'Next 7 days',
  'Mum is recovering from a recent fall and has mild dementia. Rehab, medication refill, and HDB EASE admin are the main coordination points.',
  array['SGH rehab tomorrow at 10:30am', 'Polyclinic review to be booked'],
  array['Confirm transport', 'Refill medication', 'Upload contractor quote'],
  array['Medication refill due in 2 days', 'Night reminder coverage needs helper roster confirmation'],
  array['HDB EASE contractor quote', 'AIC caregiver declaration'],
  array['No usual morning movement detected today; Rachel completed video check-in'],
  array['Rachel: medication and appointment prep', 'Ming: rehab invoice', 'Lina: AIC and HDB paperwork'],
  array['Assign rehab transport', 'Confirm AIC documents', 'Keep rehab notes in timeline']
)
on conflict (id) do update set current_situation = excluded.current_situation;
