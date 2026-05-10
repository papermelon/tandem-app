-- Align existing demo rows with the named Ah Muay persona.

update public.care_circles
set name = 'Ah Muay care circle'
where id = 'circle-mum';

update public.care_recipients
set name = 'Ah Muay'
where id = 'mum';

update public.timeline_items
set description = 'Kitchen and hallway sensors were quiet longer than Ah Muay''s usual routine. Rachel completed a video check-in.'
where id = 'tl-no-movement';

update public.timeline_items
set
  title = 'Voice note: Ah Muay walked slower today',
  description = 'Rachel noticed Ah Muay taking smaller steps after lunch. No pain reported, but worth mentioning at rehab.'
where id = 'tl-voice';

update public.tasks
set notes = 'Appointment starts at 10:30am. Ah Muay needs help getting from the taxi drop-off to rehab.'
where id = 'task-rehab-transport';

update public.handovers
set current_situation = 'Ah Muay is recovering from a recent fall and has mild dementia. Rehab, medication refill, and HDB EASE admin are the main coordination points.'
where id = 'handover-demo';
