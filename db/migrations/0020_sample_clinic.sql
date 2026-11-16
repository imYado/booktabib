-- Adds the booktabib Sample Clinic, a clearly labelled example page to show visitors until real
-- clinics join. It starts hidden, so only administrators see it until one makes it public in the
-- clinic editor. As a migration it runs once: deploys never add it back, and an administrator can
-- edit or delete it like any other clinic.
INSERT INTO "clinics" ("id","name","city","address","phone","lat","lng","specialties","about","hours","info","hidden") VALUES (
  'booktabib-sample-clinic',
  '{"en":"booktabib Sample Clinic","ar":"عيادة booktabib التجريبية","ckb":"کلینیکی نموونەیی booktabib"}'::jsonb,
  'erbil',
  '{"en":"Sample Street, Erbil (example address)","ar":"شارع تجريبي، أربيل (عنوان للتجربة)","ckb":"شەقامی نموونە، هەولێر (ناونیشانی نموونە)"}'::jsonb,
  '07730304703',
  36.191, 44.009,
  '["family","pediatrics","dentistry"]'::jsonb,
  '{"en":"A sample clinic that shows how booktabib works: browse the doctors, request an appointment and follow your place in line live. Real clinics are joining soon.","ar":"عيادة تجريبية تُظهر كيف يعمل booktabib: تصفّح الأطباء، اطلب موعدًا، وتابع دورك في الطابور مباشرة. العيادات الحقيقية تنضم قريبًا.","ckb":"کلینیکێکی نموونەییە بۆ پیشاندانی چۆنیەتی کارکردنی booktabib: پزیشکەکان ببینە، داوای نۆرە بکە و ڕاستەوخۆ شوێنی خۆت لە ڕیزدا ببینە. کلینیکە ڕاستەقینەکان بەم زووانە دێن."}'::jsonb,
  '{"en":"Saturday – Thursday: 9:00 AM – 5:00 PM\nFriday: closed\n(sample hours)","ar":"السبت – الخميس: ٩:٠٠ ص – ٥:٠٠ م\nالجمعة: مغلق\n(أوقات تجريبية)","ckb":"شەممە – پێنجشەممە: ٩:٠٠ی بەیانی – ٥:٠٠ی ئێوارە\nهەینی: داخراوە\n(کاتی نموونە)"}'::jsonb,
  '[{"title":{"en":"This is a sample clinic","ar":"هذه عيادة تجريبية","ckb":"ئەمە کلینیکێکی نموونەییە"},"body":{"en":"Everything on this page is example content to show how booktabib works. The doctors, prices and hours are not real.","ar":"كل ما في هذه الصفحة محتوى تجريبي لعرض طريقة عمل booktabib. الأطباء والأسعار والأوقات ليست حقيقية.","ckb":"هەموو ناوەڕۆکی ئەم پەڕەیە نموونەیە بۆ پیشاندانی چۆنیەتی کارکردنی booktabib. پزیشک و نرخ و کاتەکان ڕاستەقینە نین."}},{"title":{"en":"Want your clinic here?","ar":"هل تريد عيادتك هنا؟","ckb":"دەتەوێت کلینیکەکەت لێرە بێت؟"},"body":{"en":"Contact booktabib and your clinic can have a page like this one.","ar":"تواصل مع booktabib لتحصل عيادتك على صفحة مثل هذه.","ckb":"پەیوەندی بە booktabib بکە بۆ ئەوەی کلینیکەکەت پەڕەیەکی وەک ئەمەی هەبێت."}}]'::jsonb,
  true
) ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "clinic_settings" ("clinic_id","accent") VALUES ('booktabib-sample-clinic','sky') ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "doctors" ("id","clinic_id","name","honorific","specialty","title","years","fee","services","room","bio","sort") VALUES
  ('sample-doctor-1','booktabib-sample-clinic',
   '{"en":"Sample Doctor 1","ar":"الطبيب التجريبي ١","ckb":"پزیشکی نموونەیی ١"}'::jsonb,'none','family',
   '{"en":"Family physician (sample)","ar":"طبيب عائلة (تجريبي)","ckb":"پزیشکی خێزان (نموونە)"}'::jsonb,10,15000,
   '[{"name":{"en":"Consultation","ar":"كشف","ckb":"پشکنین"},"fee":25000},{"name":{"en":"Follow-up visit","ar":"مراجعة","ckb":"سەردانی دووبارە"},"fee":15000}]'::jsonb,'1',
   '{"en":"A sample doctor profile that shows how a doctor''s page looks on booktabib. Not a real doctor.","ar":"ملف طبيب تجريبي يُظهر شكل صفحة الطبيب على booktabib. ليس طبيبًا حقيقيًا.","ckb":"پرۆفایلی پزیشکێکی نموونەییە بۆ پیشاندانی شێوەی پەڕەی پزیشک لە booktabib. پزیشکی ڕاستەقینە نییە."}'::jsonb,100),
  ('sample-doctor-2','booktabib-sample-clinic',
   '{"en":"Sample Doctor 2","ar":"الطبيب التجريبي ٢","ckb":"پزیشکی نموونەیی ٢"}'::jsonb,'none','pediatrics',
   '{"en":"Pediatrician (sample)","ar":"طبيب أطفال (تجريبي)","ckb":"پزیشکی منداڵان (نموونە)"}'::jsonb,8,10000,
   '[{"name":{"en":"Consultation","ar":"كشف","ckb":"پشکنین"},"fee":25000},{"name":{"en":"Vaccination","ar":"لقاح","ckb":"کوتان"},"fee":10000}]'::jsonb,'2',
   '{"en":"A sample doctor profile that shows how a doctor''s page looks on booktabib. Not a real doctor.","ar":"ملف طبيب تجريبي يُظهر شكل صفحة الطبيب على booktabib. ليس طبيبًا حقيقيًا.","ckb":"پرۆفایلی پزیشکێکی نموونەییە بۆ پیشاندانی شێوەی پەڕەی پزیشک لە booktabib. پزیشکی ڕاستەقینە نییە."}'::jsonb,101),
  ('sample-doctor-3','booktabib-sample-clinic',
   '{"en":"Sample Doctor 3","ar":"الطبيب التجريبي ٣","ckb":"پزیشکی نموونەیی ٣"}'::jsonb,'none','dentistry',
   '{"en":"Dentist (sample)","ar":"طبيب أسنان (تجريبي)","ckb":"پزیشکی ددان (نموونە)"}'::jsonb,6,15000,
   '[{"name":{"en":"Dental check-up","ar":"فحص الأسنان","ckb":"پشکنینی ددان"},"fee":15000},{"name":{"en":"Filling","ar":"حشوة","ckb":"پڕکردنەوەی ددان"},"fee":35000}]'::jsonb,'3',
   '{"en":"A sample doctor profile that shows how a doctor''s page looks on booktabib. Not a real doctor.","ar":"ملف طبيب تجريبي يُظهر شكل صفحة الطبيب على booktabib. ليس طبيبًا حقيقيًا.","ckb":"پرۆفایلی پزیشکێکی نموونەییە بۆ پیشاندانی شێوەی پەڕەی پزیشک لە booktabib. پزیشکی ڕاستەقینە نییە."}'::jsonb,102)
ON CONFLICT DO NOTHING;
