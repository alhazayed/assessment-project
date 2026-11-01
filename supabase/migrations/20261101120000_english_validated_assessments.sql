-- Five English-validated assessments with unvalidated Arabic translations:
-- IPIP-NEO-120 (replaces the earlier IPIP120 item set), ACSI-28, A-DES, BPQ, DSS.
-- Items, keys and subscales are transcribed from the source forms; the Arabic
-- text is a working translation that has NOT been validated.
--
-- Safe to re-run. It refuses to touch an assessment that already has saved
-- results, drafts or assignments, because replacing items would orphan them.

begin;

do $$
declare n int;
begin
  select count(*) into n from (
    select 1 from assessment_submissions s join assessment_definitions d on d.id = s.definition_id where d.code in ('IPIP120', 'ACSI28', 'ADES', 'BPQ', 'DSS')
    union all
    select 1 from assessment_drafts x join assessment_definitions d on d.id = x.definition_id where d.code in ('IPIP120', 'ACSI28', 'ADES', 'BPQ', 'DSS')
    union all
    select 1 from assessment_assignments a join assessment_definitions d on d.id = a.definition_id where d.code in ('IPIP120', 'ACSI28', 'ADES', 'BPQ', 'DSS')
  ) t;
  if n > 0 then
    raise exception 'Refusing to replace items: % saved result/draft/assignment rows exist for these assessments', n;
  end if;
end $$;

insert into assessment_definitions (code, name_en, name_ar, description_en, description_ar, total_questions, scoring_logic, high_risk_threshold, is_active)
values ('IPIP120', 'IPIP-NEO-120 Personality Inventory', 'قائمة الشخصية IPIP-NEO-120', 'A 120-item public-domain measure of the five broad personality domains (Neuroticism, Extraversion, Openness, Agreeableness, Conscientiousness) and 30 facets (Johnson, 2014). For ages 16+. Rate how accurately each statement describes you as you generally are now, compared with people you know of the same sex and roughly your age. Validated in English only. An Arabic translation is offered for convenience but has not been validated.', 'مقياس من 120 بنداً في الملكية العامة يقيس المجالات الخمسة الكبرى للشخصية (العصابية، الانبساطية، الانفتاح، القبول، يقظة الضمير) و30 سمة فرعية (Johnson, 2014). للأعمار 16 سنة فأكثر. قيّم مدى دقة وصف كل عبارة لك كما أنت عادةً الآن، مقارنةً بأشخاص تعرفهم من الجنس نفسه وفي عمرك تقريباً. هذا المقياس مُعتمد علمياً باللغة الإنجليزية فقط. الترجمة العربية متاحة للتيسير لكنها غير مُعتمدة علمياً.', 120, '[{"min": 120, "max": 600, "severity_en": "Personality profile", "severity_ar": "ملف الشخصية", "color": "#6366f1"}]'::jsonb, null, true)
on conflict (code) do update set
  name_en = excluded.name_en, name_ar = excluded.name_ar,
  description_en = excluded.description_en, description_ar = excluded.description_ar,
  total_questions = excluded.total_questions, scoring_logic = excluded.scoring_logic,
  high_risk_threshold = excluded.high_risk_threshold, is_active = excluded.is_active;

insert into assessment_definitions (code, name_en, name_ar, description_en, description_ar, total_questions, scoring_logic, high_risk_threshold, is_active)
values ('ACSI28', 'Athletic Coping Skills Inventory (ACSI-28)', 'قائمة مهارات التكيّف الرياضي (ACSI-28)', 'A 28-item measure of an athlete''s psychological coping skills across seven areas, such as coping with adversity, performing under pressure, concentration and coachability (Smith et al., 1995). Indicate how often you have each experience when playing sport. Validated in English only. An Arabic translation is offered for convenience but has not been validated.', 'مقياس من 28 بنداً لمهارات التكيّف النفسي لدى الرياضي في سبعة مجالات، مثل التعامل مع الشدائد والأداء تحت الضغط والتركيز وتقبّل التوجيه (Smith et al., 1995). حدّد كم مرة تمر بكل تجربة أثناء ممارسة الرياضة. هذا المقياس مُعتمد علمياً باللغة الإنجليزية فقط. الترجمة العربية متاحة للتيسير لكنها غير مُعتمدة علمياً.', 28, '[{"min": 0, "max": 84, "severity_en": "Coping skills profile", "severity_ar": "ملف مهارات التكيّف", "color": "#0ea5e9"}]'::jsonb, null, true)
on conflict (code) do update set
  name_en = excluded.name_en, name_ar = excluded.name_ar,
  description_en = excluded.description_en, description_ar = excluded.description_ar,
  total_questions = excluded.total_questions, scoring_logic = excluded.scoring_logic,
  high_risk_threshold = excluded.high_risk_threshold, is_active = excluded.is_active;

insert into assessment_definitions (code, name_en, name_ar, description_en, description_ar, total_questions, scoring_logic, high_risk_threshold, is_active)
values ('ADES', 'Adolescent Dissociative Experiences Scale (A-DES)', 'مقياس التجارب الانفصالية لدى المراهقين (A-DES)', 'A 30-item screening measure of dissociative experiences (memory gaps, absorption, passive influence, depersonalisation and derealisation) developed for adolescents aged 11 to 18 (Armstrong et al., 1997). For each statement, choose how much the experience happens to you, from 0 (never) to 10 (always). Validated in English only. An Arabic translation is offered for convenience but has not been validated.', 'مقياس فحص من 30 بنداً للتجارب الانفصالية (فجوات الذاكرة، الاستغراق، التأثير السلبي، تبدد الشخصية والواقع) صُمم للمراهقين من 11 إلى 18 سنة (Armstrong et al., 1997). لكل عبارة، اختر مدى حدوث هذه التجربة لك من 0 (أبداً) إلى 10 (دائماً). هذا المقياس مُعتمد علمياً باللغة الإنجليزية فقط. الترجمة العربية متاحة للتيسير لكنها غير مُعتمدة علمياً.', 30, '[{"min": 0, "max": 59, "severity_en": "Low dissociation", "severity_ar": "تجارب انفصالية منخفضة", "color": "green"}, {"min": 60, "max": 89, "severity_en": "Mild dissociation", "severity_ar": "تجارب انفصالية خفيفة", "color": "yellow"}, {"min": 90, "max": 119, "severity_en": "Moderate dissociation", "severity_ar": "تجارب انفصالية متوسطة", "color": "amber"}, {"min": 120, "max": 300, "severity_en": "High dissociation", "severity_ar": "تجارب انفصالية مرتفعة", "color": "red"}]'::jsonb, null, false)
on conflict (code) do update set
  name_en = excluded.name_en, name_ar = excluded.name_ar,
  description_en = excluded.description_en, description_ar = excluded.description_ar,
  total_questions = excluded.total_questions, scoring_logic = excluded.scoring_logic,
  high_risk_threshold = excluded.high_risk_threshold, is_active = excluded.is_active;

insert into assessment_definitions (code, name_en, name_ar, description_en, description_ar, total_questions, scoring_logic, high_risk_threshold, is_active)
values ('BPQ', 'Borderline Personality Questionnaire (BPQ)', 'استبيان الشخصية الحدّية (BPQ)', 'An 80-item true/false screening questionnaire for borderline personality traits, with nine subscales based on the DSM criteria (Poreh et al., 2006). Answer for how you have usually been over the past two years or longer. It includes questions about self-harm and suicide. Validated in English only. An Arabic translation is offered for convenience but has not been validated.', 'استبيان فحص من 80 بنداً (صحيح/خطأ) لسمات الشخصية الحدّية، بتسعة مقاييس فرعية مبنية على معايير DSM (Poreh et al., 2006). أجب عن كيف كنت عادةً خلال السنتين الماضيتين أو أكثر. يتضمن أسئلة عن إيذاء النفس والانتحار. هذا المقياس مُعتمد علمياً باللغة الإنجليزية فقط. الترجمة العربية متاحة للتيسير لكنها غير مُعتمدة علمياً.', 80, '[{"min": 0, "max": 29, "severity_en": "Subclinical range", "severity_ar": "ضمن النطاق دون السريري", "color": "green"}, {"min": 30, "max": 34, "severity_en": "Mild", "severity_ar": "خفيف", "color": "yellow"}, {"min": 35, "max": 42, "severity_en": "Moderate", "severity_ar": "متوسط", "color": "amber"}, {"min": 43, "max": 80, "severity_en": "Severe", "severity_ar": "شديد", "color": "red"}]'::jsonb, 43, true)
on conflict (code) do update set
  name_en = excluded.name_en, name_ar = excluded.name_ar,
  description_en = excluded.description_en, description_ar = excluded.description_ar,
  total_questions = excluded.total_questions, scoring_logic = excluded.scoring_logic,
  high_risk_threshold = excluded.high_risk_threshold, is_active = excluded.is_active;

insert into assessment_definitions (code, name_en, name_ar, description_en, description_ar, total_questions, scoring_logic, high_risk_threshold, is_active)
values ('DSS', 'Digital Stress Scale (DSS)', 'مقياس الضغط الرقمي (DSS)', 'A 24-item measure of stress linked to phone and social media use across five areas: availability stress, approval anxiety, fear of missing out, connection overload and online vigilance (Hall et al., 2021). For ages 14+. Answer for how often you felt this way over the past 7 days. Validated in English only. An Arabic translation is offered for convenience but has not been validated.', 'مقياس من 24 بنداً للضغط المرتبط باستخدام الهاتف ووسائل التواصل الاجتماعي في خمسة مجالات: ضغط الإتاحة، القلق من الاستحسان، الخوف من تفويت الأحداث، الإرهاق من كثرة التواصل، واليقظة الدائمة على الإنترنت (Hall et al., 2021). للأعمار 14 سنة فأكثر. أجب عن مدى شعورك بذلك خلال الأيام السبعة الماضية. هذا المقياس مُعتمد علمياً باللغة الإنجليزية فقط. الترجمة العربية متاحة للتيسير لكنها غير مُعتمدة علمياً.', 24, '[{"min": 24, "max": 120, "severity_en": "Digital stress profile", "severity_ar": "ملف الضغط الرقمي", "color": "#0ea5e9"}]'::jsonb, null, true)
on conflict (code) do update set
  name_en = excluded.name_en, name_ar = excluded.name_ar,
  description_en = excluded.description_en, description_ar = excluded.description_ar,
  total_questions = excluded.total_questions, scoring_logic = excluded.scoring_logic,
  high_risk_threshold = excluded.high_risk_threshold, is_active = excluded.is_active;

delete from assessment_items where definition_id in (select id from assessment_definitions where code in ('IPIP120', 'ACSI28', 'ADES', 'BPQ', 'DSS'));

insert into assessment_items (definition_id, item_number, question_en, question_ar, response_options, is_safety_item, score_weight, subscale)
select d.id, v.n, v.qen, v.qar,
  case v.k when 0 then '[{"value": 1, "label_en": "Very Inaccurate", "label_ar": "غير دقيق تماماً"}, {"value": 2, "label_en": "Moderately Inaccurate", "label_ar": "غير دقيق إلى حد ما"}, {"value": 3, "label_en": "Neither Accurate nor Inaccurate", "label_ar": "لا دقيق ولا غير دقيق"}, {"value": 4, "label_en": "Moderately Accurate", "label_ar": "دقيق إلى حد ما"}, {"value": 5, "label_en": "Very Accurate", "label_ar": "دقيق تماماً"}]'::jsonb when 1 then '[{"value": 5, "label_en": "Very Inaccurate", "label_ar": "غير دقيق تماماً"}, {"value": 4, "label_en": "Moderately Inaccurate", "label_ar": "غير دقيق إلى حد ما"}, {"value": 3, "label_en": "Neither Accurate nor Inaccurate", "label_ar": "لا دقيق ولا غير دقيق"}, {"value": 2, "label_en": "Moderately Accurate", "label_ar": "دقيق إلى حد ما"}, {"value": 1, "label_en": "Very Accurate", "label_ar": "دقيق تماماً"}]'::jsonb end,
  v.safety, 1.0, v.sub
from assessment_definitions d, (values
  (1, 'Worry about things.', 'أقلق بشأن الأمور.', 0, false, 'N-Anxiety'),
  (2, 'Make friends easily.', 'أكوّن صداقات بسهولة.', 0, false, 'E-Friendliness'),
  (3, 'Have a vivid imagination.', 'لديّ خيال واسع.', 0, false, 'O-Imagination'),
  (4, 'Trust others.', 'أثق بالآخرين.', 0, false, 'A-Trust'),
  (5, 'Complete tasks successfully.', 'أنجز المهام بنجاح.', 0, false, 'C-Self-Efficacy'),
  (6, 'Get angry easily.', 'أغضب بسهولة.', 0, false, 'N-Anger'),
  (7, 'Love large parties.', 'أحب الحفلات الكبيرة.', 0, false, 'E-Gregariousness'),
  (8, 'Believe in the importance of art.', 'أؤمن بأهمية الفن.', 0, false, 'O-Artistic'),
  (9, 'Use others for my own ends.', 'أستغل الآخرين لتحقيق غاياتي.', 1, false, 'A-Morality'),
  (10, 'Like to tidy up.', 'أحب الترتيب والتنظيف.', 0, false, 'C-Orderliness'),
  (11, 'Often feel blue.', 'كثيراً ما أشعر بالحزن.', 0, false, 'N-Depression'),
  (12, 'Take charge.', 'أتولى زمام الأمور.', 0, false, 'E-Assertiveness'),
  (13, 'Experience my emotions intensely.', 'أعيش مشاعري بشدة.', 0, false, 'O-Emotionality'),
  (14, 'Love to help others.', 'أحب مساعدة الآخرين.', 0, false, 'A-Altruism'),
  (15, 'Keep my promises.', 'أفي بوعودي.', 0, false, 'C-Dutifulness'),
  (16, 'Find it difficult to approach others.', 'أجد صعوبة في التقرّب من الآخرين.', 0, false, 'N-Self-Consciousness'),
  (17, 'Am always busy.', 'أنا مشغول دائماً.', 0, false, 'E-Activity'),
  (18, 'Prefer variety to routine.', 'أفضّل التنوع على الروتين.', 0, false, 'O-Adventurousness'),
  (19, 'Love a good fight.', 'أحب الشجار الحامي.', 1, false, 'A-Cooperation'),
  (20, 'Work hard.', 'أعمل بجد.', 0, false, 'C-Achievement'),
  (21, 'Go on binges.', 'أفرط في الأكل أو الشرب أو الإنفاق على فترات.', 0, false, 'N-Immoderation'),
  (22, 'Love excitement.', 'أحب الإثارة.', 0, false, 'E-Excitement-Seeking'),
  (23, 'Love to read challenging material.', 'أحب قراءة المواد الصعبة والمعقدة.', 0, false, 'O-Intellect'),
  (24, 'Believe that I am better than others.', 'أعتقد أنني أفضل من الآخرين.', 1, false, 'A-Modesty'),
  (25, 'Am always prepared.', 'أنا مستعد دائماً.', 0, false, 'C-Self-Discipline'),
  (26, 'Panic easily.', 'أصاب بالذعر بسهولة.', 0, false, 'N-Vulnerability'),
  (27, 'Radiate joy.', 'أشعّ بالبهجة.', 0, false, 'E-Cheerfulness'),
  (28, 'Tend to vote for liberal (progressive) political candidates.', 'أميل إلى التصويت للمرشحين السياسيين الليبراليين (التقدميين).', 0, false, 'O-Liberalism'),
  (29, 'Sympathise with the homeless.', 'أتعاطف مع المشرّدين.', 0, false, 'A-Sympathy'),
  (30, 'Jump into things without thinking.', 'أندفع في الأمور دون تفكير.', 1, false, 'C-Cautiousness'),
  (31, 'Fear for the worst.', 'أتوقع الأسوأ.', 0, false, 'N-Anxiety'),
  (32, 'Feel comfortable around people.', 'أشعر بالارتياح بين الناس.', 0, false, 'E-Friendliness'),
  (33, 'Enjoy wild flights of fantasy.', 'أستمتع بالخيالات الجامحة.', 0, false, 'O-Imagination'),
  (34, 'Believe that others have good intentions.', 'أعتقد أن للآخرين نوايا حسنة.', 0, false, 'A-Trust'),
  (35, 'Excel in what I do.', 'أتفوق فيما أفعله.', 0, false, 'C-Self-Efficacy'),
  (36, 'Get irritated easily.', 'أنزعج بسهولة.', 0, false, 'N-Anger'),
  (37, 'Talk to a lot of different people at parties.', 'أتحدث مع أشخاص كثيرين ومختلفين في الحفلات.', 0, false, 'E-Gregariousness'),
  (38, 'See beauty in things that others might not notice.', 'أرى الجمال في أشياء قد لا يلاحظها الآخرون.', 0, false, 'O-Artistic'),
  (39, 'Cheat to get ahead.', 'أغش لأتقدّم على الآخرين.', 1, false, 'A-Morality'),
  (40, 'Often forget to put things back in their proper place.', 'كثيراً ما أنسى إعادة الأشياء إلى أماكنها الصحيحة.', 1, false, 'C-Orderliness'),
  (41, 'Dislike myself.', 'أكره نفسي.', 0, false, 'N-Depression'),
  (42, 'Try to lead others.', 'أحاول قيادة الآخرين.', 0, false, 'E-Assertiveness'),
  (43, 'Feel others'' emotions.', 'أشعر بمشاعر الآخرين.', 0, false, 'O-Emotionality'),
  (44, 'Am concerned about others.', 'أهتم بأمر الآخرين.', 0, false, 'A-Altruism'),
  (45, 'Tell the truth.', 'أقول الحقيقة.', 0, false, 'C-Dutifulness'),
  (46, 'Am afraid to draw attention to myself.', 'أخشى أن ألفت الانتباه إلى نفسي.', 0, false, 'N-Self-Consciousness'),
  (47, 'Am always on the go.', 'أنا في حركة دائمة.', 0, false, 'E-Activity'),
  (48, 'Prefer to stick with things that I know.', 'أفضّل التمسك بالأشياء التي أعرفها.', 1, false, 'O-Adventurousness'),
  (49, 'Yell at people.', 'أصرخ في وجه الناس.', 1, false, 'A-Cooperation'),
  (50, 'Do more than what''s expected of me.', 'أبذل أكثر مما هو متوقع مني.', 0, false, 'C-Achievement'),
  (51, 'Rarely overindulge.', 'نادراً ما أفرط في الانغماس.', 1, false, 'N-Immoderation'),
  (52, 'Seek adventure.', 'أسعى إلى المغامرة.', 0, false, 'E-Excitement-Seeking'),
  (53, 'Avoid philosophical discussions.', 'أتجنب النقاشات الفلسفية.', 1, false, 'O-Intellect'),
  (54, 'Think highly of myself.', 'لديّ رأي عالٍ في نفسي.', 1, false, 'A-Modesty'),
  (55, 'Carry out my plans.', 'أنفّذ خططي.', 0, false, 'C-Self-Discipline'),
  (56, 'Become overwhelmed by events.', 'تغمرني الأحداث وتربكني.', 0, false, 'N-Vulnerability'),
  (57, 'Have a lot of fun.', 'أستمتع كثيراً.', 0, false, 'E-Cheerfulness'),
  (58, 'Believe that there is no absolute right or wrong.', 'أعتقد أنه لا يوجد صواب أو خطأ مطلق.', 0, false, 'O-Liberalism'),
  (59, 'Feel sympathy for those who are worse off than myself.', 'أتعاطف مع من هم أسوأ حالاً مني.', 0, false, 'A-Sympathy'),
  (60, 'Make rash decisions.', 'أتخذ قرارات متسرعة.', 1, false, 'C-Cautiousness'),
  (61, 'Am afraid of many things.', 'أخاف من أشياء كثيرة.', 0, false, 'N-Anxiety'),
  (62, 'Avoid contact with others.', 'أتجنب التواصل مع الآخرين.', 1, false, 'E-Friendliness'),
  (63, 'Love to daydream.', 'أحب أحلام اليقظة.', 0, false, 'O-Imagination'),
  (64, 'Trust what people say.', 'أثق بما يقوله الناس.', 0, false, 'A-Trust'),
  (65, 'Handle tasks smoothly.', 'أتعامل مع المهام بسلاسة.', 0, false, 'C-Self-Efficacy'),
  (66, 'Lose my temper.', 'أفقد أعصابي.', 0, false, 'N-Anger'),
  (67, 'Prefer to be alone.', 'أفضّل أن أكون وحدي.', 1, false, 'E-Gregariousness'),
  (68, 'Do not like poetry.', 'لا أحب الشعر.', 1, false, 'O-Artistic'),
  (69, 'Take advantage of others.', 'أستغل الآخرين.', 1, false, 'A-Morality'),
  (70, 'Leave a mess in my room.', 'أترك الفوضى في غرفتي.', 1, false, 'C-Orderliness'),
  (71, 'Am often down in the dumps.', 'كثيراً ما أكون محبطاً ومكتئب المزاج.', 0, false, 'N-Depression'),
  (72, 'Take control of things.', 'أتحكم في زمام الأمور.', 0, false, 'E-Assertiveness'),
  (73, 'Rarely notice my emotional reactions.', 'نادراً ما ألاحظ ردود أفعالي العاطفية.', 1, false, 'O-Emotionality'),
  (74, 'Am indifferent to the feelings of others.', 'لا أبالي بمشاعر الآخرين.', 1, false, 'A-Altruism'),
  (75, 'Break rules.', 'أخالف القواعد.', 1, false, 'C-Dutifulness'),
  (76, 'Only feel comfortable with friends.', 'لا أشعر بالارتياح إلا مع أصدقائي.', 0, false, 'N-Self-Consciousness'),
  (77, 'Do a lot in my spare time.', 'أقوم بالكثير في وقت فراغي.', 0, false, 'E-Activity'),
  (78, 'Dislike changes.', 'أكره التغيير.', 1, false, 'O-Adventurousness'),
  (79, 'Insult people.', 'أهين الناس.', 1, false, 'A-Cooperation'),
  (80, 'Do just enough work to get by.', 'أبذل من الجهد ما يكفي بالكاد لتسيير أموري.', 1, false, 'C-Achievement'),
  (81, 'Easily resist temptations.', 'أقاوم الإغراءات بسهولة.', 1, false, 'N-Immoderation'),
  (82, 'Enjoy being reckless.', 'أستمتع بالتهوّر.', 0, false, 'E-Excitement-Seeking'),
  (83, 'Have difficulty understanding abstract ideas.', 'أجد صعوبة في فهم الأفكار المجردة.', 1, false, 'O-Intellect'),
  (84, 'Have a high opinion of myself.', 'لديّ رأي مرتفع جداً في نفسي.', 1, false, 'A-Modesty'),
  (85, 'Waste my time.', 'أضيّع وقتي.', 1, false, 'C-Self-Discipline'),
  (86, 'Feel that I''m unable to deal with things.', 'أشعر بأنني غير قادر على التعامل مع الأمور.', 0, false, 'N-Vulnerability'),
  (87, 'Love life.', 'أحب الحياة.', 0, false, 'E-Cheerfulness'),
  (88, 'Tend to vote for conservative political candidates.', 'أميل إلى التصويت للمرشحين السياسيين المحافظين.', 1, false, 'O-Liberalism'),
  (89, 'Am not interested in other people''s problems.', 'لا أهتم بمشكلات الآخرين.', 1, false, 'A-Sympathy'),
  (90, 'Rush into things.', 'أتسرّع في الأمور.', 1, false, 'C-Cautiousness'),
  (91, 'Get stressed out easily.', 'أتوتر بسهولة.', 0, false, 'N-Anxiety'),
  (92, 'Keep others at a distance.', 'أبقي الآخرين على مسافة مني.', 1, false, 'E-Friendliness'),
  (93, 'Like to get lost in thought.', 'أحب الاستغراق في التفكير.', 0, false, 'O-Imagination'),
  (94, 'Distrust people.', 'لا أثق بالناس.', 1, false, 'A-Trust'),
  (95, 'Know how to get things done.', 'أعرف كيف أنجز الأمور.', 0, false, 'C-Self-Efficacy'),
  (96, 'Am not easily annoyed.', 'لا أنزعج بسهولة.', 1, false, 'N-Anger'),
  (97, 'Avoid crowds.', 'أتجنب الزحام.', 1, false, 'E-Gregariousness'),
  (98, 'Do not enjoy going to art museums.', 'لا أستمتع بزيارة المتاحف الفنية.', 1, false, 'O-Artistic'),
  (99, 'Obstruct others'' plans.', 'أعرقل خطط الآخرين.', 1, false, 'A-Morality'),
  (100, 'Leave my belongings around.', 'أترك أغراضي مبعثرة.', 1, false, 'C-Orderliness'),
  (101, 'Feel comfortable with myself.', 'أشعر بالارتياح تجاه نفسي.', 1, false, 'N-Depression'),
  (102, 'Wait for others to lead the way.', 'أنتظر أن يتولى الآخرون القيادة.', 1, false, 'E-Assertiveness'),
  (103, 'Don''t understand people who get emotional.', 'لا أفهم الأشخاص الذين ينفعلون عاطفياً.', 1, false, 'O-Emotionality'),
  (104, 'Take no time for others.', 'لا أخصص وقتاً للآخرين.', 1, false, 'A-Altruism'),
  (105, 'Break my promises.', 'أُخلف وعودي.', 1, false, 'C-Dutifulness'),
  (106, 'Am not bothered by difficult social situations.', 'لا تزعجني المواقف الاجتماعية الصعبة.', 1, false, 'N-Self-Consciousness'),
  (107, 'Like to take it easy.', 'أحب أن آخذ الأمور ببساطة وهدوء.', 1, false, 'E-Activity'),
  (108, 'Am attached to conventional ways.', 'أتمسك بالطرق التقليدية.', 1, false, 'O-Adventurousness'),
  (109, 'Get back at others.', 'أنتقم من الآخرين.', 1, false, 'A-Cooperation'),
  (110, 'Put little time and effort into my work.', 'أبذل القليل من الوقت والجهد في عملي.', 1, false, 'C-Achievement'),
  (111, 'Am able to control my cravings.', 'أستطيع التحكم في رغباتي الملحّة.', 1, false, 'N-Immoderation'),
  (112, 'Act wild and crazy.', 'أتصرف بجنون وطيش.', 0, false, 'E-Excitement-Seeking'),
  (113, 'Am not interested in theoretical discussions.', 'لا أهتم بالنقاشات النظرية.', 1, false, 'O-Intellect'),
  (114, 'Boast about my virtues.', 'أتباهى بفضائلي.', 1, false, 'A-Modesty'),
  (115, 'Have difficulty starting tasks.', 'أجد صعوبة في البدء بالمهام.', 1, false, 'C-Self-Discipline'),
  (116, 'Remain calm under pressure.', 'أبقى هادئاً تحت الضغط.', 1, false, 'N-Vulnerability'),
  (117, 'Look at the bright side of life.', 'أنظر إلى الجانب المشرق من الحياة.', 0, false, 'E-Cheerfulness'),
  (118, 'Believe that we should be tough on crime.', 'أعتقد أنه يجب التشدد في مواجهة الجريمة.', 1, false, 'O-Liberalism'),
  (119, 'Try not to think about the needy.', 'أحاول ألا أفكر في المحتاجين.', 1, false, 'A-Sympathy'),
  (120, 'Act without thinking.', 'أتصرف دون تفكير.', 1, false, 'C-Cautiousness')
) as v(n, qen, qar, k, safety, sub)
where d.code = 'IPIP120';

insert into assessment_items (definition_id, item_number, question_en, question_ar, response_options, is_safety_item, score_weight, subscale)
select d.id, v.n, v.qen, v.qar,
  case v.k when 0 then '[{"value": 0, "label_en": "Almost never", "label_ar": "نادراً جداً"}, {"value": 1, "label_en": "Sometimes", "label_ar": "أحياناً"}, {"value": 2, "label_en": "Often", "label_ar": "غالباً"}, {"value": 3, "label_en": "Almost always", "label_ar": "دائماً تقريباً"}]'::jsonb when 1 then '[{"value": 3, "label_en": "Almost never", "label_ar": "نادراً جداً"}, {"value": 2, "label_en": "Sometimes", "label_ar": "أحياناً"}, {"value": 1, "label_en": "Often", "label_ar": "غالباً"}, {"value": 0, "label_en": "Almost always", "label_ar": "دائماً تقريباً"}]'::jsonb end,
  v.safety, 1.0, v.sub
from assessment_definitions d, (values
  (1, 'On a daily or weekly basis, I set very specific goals for myself that guide what I do.', 'أضع لنفسي يومياً أو أسبوعياً أهدافاً محددة جداً توجّه ما أقوم به.', 0, false, 'goal_setting'),
  (2, 'I get the most out of my talent and skill.', 'أستفيد إلى أقصى حد من موهبتي ومهارتي.', 0, false, 'confidence'),
  (3, 'When a coach or manager tells me how to correct a mistake I''ve made, I tend to take it personally and feel upset.', 'عندما يخبرني المدرب أو المدير كيف أصحح خطأً ارتكبته، أميل إلى أخذ الأمر بشكل شخصي وأشعر بالانزعاج.', 1, false, 'coachability'),
  (4, 'When I''m playing sports, I can focus my attention and block out distractions.', 'عندما أمارس الرياضة، أستطيع تركيز انتباهي وتجاهل المشتتات.', 0, false, 'concentration'),
  (5, 'I remain positive and enthusiastic during competition, no matter how badly things are going.', 'أبقى إيجابياً ومتحمساً أثناء المنافسة مهما ساءت الأمور.', 0, false, 'coping_adversity'),
  (6, 'I tend to play better under pressure because I think more clearly.', 'أميل إلى اللعب بشكل أفضل تحت الضغط لأنني أفكر بوضوح أكبر.', 0, false, 'peaking_pressure'),
  (7, 'I worry quite a bit about what others think of my performance.', 'أقلق كثيراً بشأن ما يظنه الآخرون عن أدائي.', 1, false, 'freedom_worry'),
  (8, 'I tend to do lots of planning about how to reach my goals.', 'أميل إلى التخطيط كثيراً لكيفية الوصول إلى أهدافي.', 0, false, 'goal_setting'),
  (9, 'I feel confident that I will play well.', 'أشعر بالثقة بأنني سألعب جيداً.', 0, false, 'confidence'),
  (10, 'When a coach or manager criticizes me, I become upset rather than feel helped.', 'عندما ينتقدني المدرب أو المدير، أنزعج بدلاً من أن أشعر بأن ذلك يساعدني.', 1, false, 'coachability'),
  (11, 'It is easy for me to keep distracting thoughts from interfering with something I am watching or listening to.', 'من السهل عليّ منع الأفكار المشتتة من التدخل في شيء أشاهده أو أستمع إليه.', 0, false, 'concentration'),
  (12, 'I put a lot of pressure on myself by worrying about how I will perform.', 'أضع على نفسي ضغطاً كبيراً بالقلق حول كيف سيكون أدائي.', 1, false, 'freedom_worry'),
  (13, 'I set my own performance goals for each practice', 'أضع أهداف أدائي الخاصة لكل حصة تدريبية.', 0, false, 'goal_setting'),
  (14, 'I don''t have to be pushed to practice or play hard; I give 100%.', 'لا أحتاج إلى من يدفعني للتدرب أو اللعب بجدية؛ فأنا أبذل 100%.', 0, false, 'confidence'),
  (15, 'If a coach criticizes or yells at me, I correct the mistake without getting upset about it.', 'إذا انتقدني المدرب أو صرخ عليّ، أصحح الخطأ دون أن أنزعج من ذلك.', 0, false, 'coachability'),
  (16, 'I handle unexpected situations in my sport very well.', 'أتعامل بشكل جيد جداً مع المواقف غير المتوقعة في رياضتي.', 0, false, 'concentration'),
  (17, 'When things are going badly, I tell myself to keep calm, and this works for me.', 'عندما تسوء الأمور، أقول لنفسي أن أبقى هادئاً، وينجح ذلك معي.', 0, false, 'coping_adversity'),
  (18, 'The more pressure there is during a game, the more I enjoy it.', 'كلما زاد الضغط أثناء المباراة، زاد استمتاعي بها.', 0, false, 'peaking_pressure'),
  (19, 'While competing, I worry about making mistakes or failing to come through.', 'أثناء المنافسة، أقلق من ارتكاب الأخطاء أو الإخفاق في تحقيق المطلوب.', 1, false, 'freedom_worry'),
  (20, 'I have my own game plan worked out in my head long before the game begins.', 'تكون خطة لعبي الخاصة جاهزة في ذهني قبل بدء المباراة بوقت طويل.', 0, false, 'goal_setting'),
  (21, 'When I feel myself getting too tense, I can quickly relax my body and calm myself.', 'عندما أشعر بأنني متوتر جداً، أستطيع بسرعة إرخاء جسمي وتهدئة نفسي.', 0, false, 'coping_adversity'),
  (22, 'To me, pressure situations are challenges that I welcome.', 'بالنسبة لي، مواقف الضغط تحديات أرحب بها.', 0, false, 'peaking_pressure'),
  (23, 'I think about and imagine what will happen if I fail or screw up.', 'أفكر وأتخيل ما سيحدث إذا فشلت أو أخفقت.', 1, false, 'freedom_worry'),
  (24, 'I maintain emotional control regardless of how things are going for me.', 'أحافظ على تحكمي بانفعالاتي بغض النظر عن سير الأمور معي.', 0, false, 'coping_adversity'),
  (25, 'It is easy for me to direct my attention and focus on a single object or person.', 'من السهل عليّ توجيه انتباهي والتركيز على شيء واحد أو شخص واحد.', 0, false, 'concentration'),
  (26, 'When I fail to reach my goals, it makes me try even harder.', 'عندما أفشل في الوصول إلى أهدافي، يدفعني ذلك إلى بذل جهد أكبر.', 0, false, 'confidence'),
  (27, 'I improve my skills by listening carefully to advice and instruction from coaches and managers.', 'أطوّر مهاراتي بالاستماع بعناية إلى نصائح وتوجيهات المدربين والمديرين.', 0, false, 'coachability'),
  (28, 'I make fewer mistakes when the pressure is on because I concentrate better.', 'أرتكب أخطاء أقل عندما يشتد الضغط لأنني أركز بشكل أفضل.', 0, false, 'peaking_pressure')
) as v(n, qen, qar, k, safety, sub)
where d.code = 'ACSI28';

insert into assessment_items (definition_id, item_number, question_en, question_ar, response_options, is_safety_item, score_weight, subscale)
select d.id, v.n, v.qen, v.qar,
  case v.k when 0 then '[{"value": 0, "label_en": "0 – Never", "label_ar": "0 – أبداً"}, {"value": 1, "label_en": "1", "label_ar": "1"}, {"value": 2, "label_en": "2", "label_ar": "2"}, {"value": 3, "label_en": "3", "label_ar": "3"}, {"value": 4, "label_en": "4", "label_ar": "4"}, {"value": 5, "label_en": "5", "label_ar": "5"}, {"value": 6, "label_en": "6", "label_ar": "6"}, {"value": 7, "label_en": "7", "label_ar": "7"}, {"value": 8, "label_en": "8", "label_ar": "8"}, {"value": 9, "label_en": "9", "label_ar": "9"}, {"value": 10, "label_en": "10 – Always", "label_ar": "10 – دائماً"}]'::jsonb end,
  v.safety, 1.0, v.sub
from assessment_definitions d, (values
  (1, 'I get so wrapped up in watching TV, reading, or playing a video game that I don''t have any idea what''s going on around me.', 'أنغمس في مشاهدة التلفاز أو القراءة أو ألعاب الفيديو لدرجة أنني لا أعرف ما يحدث من حولي.', 0, false, 'absorption'),
  (2, 'I get back tests or homework that I don''t remember doing.', 'تُعاد إليّ اختبارات أو واجبات منزلية لا أتذكر أنني قمت بها.', 0, false, 'amnesia'),
  (3, 'I have strong feelings that don''t seem like they are mine.', 'تنتابني مشاعر قوية لا تبدو وكأنها مشاعري.', 0, false, 'depersonalisation'),
  (4, 'I can do something really well one time and then I can''t do it at all another time.', 'أستطيع أن أفعل شيئاً بشكل جيد جداً مرة، ثم لا أستطيع فعله إطلاقاً مرة أخرى.', 0, false, 'passive_influence'),
  (5, 'People tell me I do or say things that I don''t remember doing or saying.', 'يخبرني الناس أنني أفعل أو أقول أشياء لا أتذكر أنني فعلتها أو قلتها.', 0, false, 'amnesia'),
  (6, 'I feel like I am in a fog or spaced out and things around me seem unreal.', 'أشعر وكأنني في ضباب أو شارد الذهن، وتبدو الأشياء من حولي غير حقيقية.', 0, false, 'depersonalisation'),
  (7, 'I get confused about whether I have done something or only thought about doing it.', 'أرتبك فيما إذا كنت قد فعلت شيئاً ما أم أنني فكرت فقط في فعله.', 0, false, 'absorption'),
  (8, 'I look at the clock and realize that time has gone by and I can''t remember what has happened.', 'أنظر إلى الساعة وأدرك أن الوقت قد مضى ولا أستطيع تذكر ما حدث.', 0, false, 'amnesia'),
  (9, 'I hear voices in my head that are not mine.', 'أسمع أصواتاً في رأسي ليست صوتي.', 0, false, 'depersonalisation'),
  (10, 'When I am somewhere that I don''t want to be, I can go away in my mind.', 'عندما أكون في مكان لا أريد أن أكون فيه، أستطيع أن أغيب عنه في ذهني.', 0, false, 'absorption'),
  (11, 'I am so good at lying and acting that I believe it myself.', 'أنا بارع في الكذب والتمثيل لدرجة أنني أصدّق ذلك بنفسي.', 0, false, 'depersonalisation'),
  (12, 'I catch myself "waking up" in the middle of doing something.', 'أجد نفسي وكأنني "أستيقظ" في منتصف قيامي بشيء ما.', 0, false, 'amnesia'),
  (13, 'I don''t recognize myself in the mirror.', 'لا أتعرّف على نفسي في المرآة.', 0, false, 'depersonalisation'),
  (14, 'I find myself going somewhere or doing something and I don''t know why.', 'أجد نفسي ذاهباً إلى مكان ما أو أفعل شيئاً ما ولا أعرف السبب.', 0, false, 'passive_influence'),
  (15, 'I find myself someplace and I don''t remember how I got there.', 'أجد نفسي في مكان ما ولا أتذكر كيف وصلت إليه.', 0, false, 'amnesia'),
  (16, 'I have thoughts that don''t really seem to belong to me.', 'تراودني أفكار لا يبدو أنها تخصني حقاً.', 0, false, 'passive_influence'),
  (17, 'I find that I can make physical pain go away.', 'أجد أنني أستطيع جعل الألم الجسدي يختفي.', 0, false, 'depersonalisation'),
  (18, 'I can''t figure out if things really happened or if I only dreamed or thought about them.', 'لا أستطيع أن أحدد إن كانت الأشياء قد حدثت فعلاً أم أنني حلمت بها أو فكرت فيها فقط.', 0, false, 'absorption'),
  (19, 'I find myself doing something that I know is wrong, even when I really don''t want to do it.', 'أجد نفسي أفعل شيئاً أعرف أنه خطأ، حتى عندما لا أريد فعله حقاً.', 0, false, 'passive_influence'),
  (20, 'People tell me that I sometimes act so differently that I seem like a different person.', 'يخبرني الناس أنني أتصرف أحياناً بشكل مختلف جداً لدرجة أنني أبدو شخصاً آخر.', 0, false, 'depersonalisation'),
  (21, 'It feels like there are walls inside of my mind.', 'أشعر وكأن هناك جدراناً داخل عقلي.', 0, false, 'depersonalisation'),
  (22, 'I find writings, drawings or letters that I must have done but I can''t remember doing.', 'أجد كتابات أو رسومات أو رسائل لا بد أنني قمت بها لكنني لا أتذكر أنني فعلت ذلك.', 0, false, 'amnesia'),
  (23, 'Something inside of me seems to make me do things that I don''t want to do.', 'يبدو أن شيئاً ما بداخلي يجعلني أفعل أشياء لا أريد فعلها.', 0, false, 'passive_influence'),
  (24, 'I find that I can''t tell whether I am just remembering something or if it is actually happening to me.', 'أجد أنني لا أستطيع التمييز بين ما إذا كنت أتذكر شيئاً فقط أم أنه يحدث لي فعلاً.', 0, false, 'absorption'),
  (25, 'I find myself standing outside of my body, watching myself as if I were another person.', 'أجد نفسي واقفاً خارج جسدي، أراقب نفسي كما لو كنت شخصاً آخر.', 0, false, 'depersonalisation'),
  (26, 'My relationships with my family and friends change suddenly and I don''t know why.', 'تتغير علاقاتي مع عائلتي وأصدقائي فجأة ولا أعرف السبب.', 0, false, 'depersonalisation'),
  (27, 'I feel like my past is a puzzle and some of the pieces are missing.', 'أشعر وكأن ماضيّ أحجية وبعض قطعها مفقودة.', 0, false, 'amnesia'),
  (28, 'I get so wrapped up in my toys or stuffed animals that they seem alive.', 'أنغمس في ألعابي أو دُماي المحشوة لدرجة أنها تبدو حيّة.', 0, false, 'absorption'),
  (29, 'I feel like there are different people inside of me.', 'أشعر وكأن هناك أشخاصاً مختلفين بداخلي.', 0, false, 'depersonalisation'),
  (30, 'My body feels as if it doesn''t belong to me.', 'أشعر وكأن جسدي لا ينتمي إليّ.', 0, false, 'depersonalisation')
) as v(n, qen, qar, k, safety, sub)
where d.code = 'ADES';

insert into assessment_items (definition_id, item_number, question_en, question_ar, response_options, is_safety_item, score_weight, subscale)
select d.id, v.n, v.qen, v.qar,
  case v.k when 0 then '[{"value": 1, "label_en": "True", "label_ar": "صحيح"}, {"value": 0, "label_en": "False", "label_ar": "خطأ"}]'::jsonb when 1 then '[{"value": 0, "label_en": "True", "label_ar": "صحيح"}, {"value": 1, "label_en": "False", "label_ar": "خطأ"}]'::jsonb end,
  v.safety, 1.0, v.sub
from assessment_definitions d, (values
  (1, 'I often do things without thinking them through.', 'كثيراً ما أفعل أشياء دون التفكير فيها جيداً.', 0, false, 'impulsivity'),
  (2, 'I often become depressed or anxious ''out of the blue''.', 'كثيراً ما أصبح مكتئباً أو قلقاً فجأة ودون سبب واضح.', 0, false, 'affective_instability'),
  (3, 'People often leave me.', 'كثيراً ما يتركني الناس.', 0, false, 'abandonment'),
  (4, 'I am rarely disappointed by my friends.', 'نادراً ما يخيّب أصدقائي أملي.', 1, false, 'relationships'),
  (5, 'I feel inferior to other people.', 'أشعر بأنني أقل شأناً من الآخرين.', 0, false, 'self_image'),
  (6, 'I have threatened to hurt myself in the past.', 'هددت في الماضي بإيذاء نفسي.', 0, true, 'suicide_self_harm'),
  (7, 'I do not believe that I have the skills to do anything with my life.', 'لا أعتقد أن لديّ المهارات لأفعل أي شيء في حياتي.', 0, false, 'emptiness'),
  (8, 'I rarely get angry at other people.', 'نادراً ما أغضب من الآخرين.', 1, false, 'intense_anger'),
  (9, 'Sometimes I feel like I am not real.', 'أشعر أحياناً وكأنني لست حقيقياً.', 0, false, 'quasi_psychotic'),
  (10, 'I will not have sex with someone unless I have known them for quite some time.', 'لن أقيم علاقة جنسية مع شخص ما إلا إذا كنت أعرفه منذ وقت طويل.', 1, false, 'impulsivity'),
  (11, 'I sometimes feel anxious or irritable and become sad a few hours later.', 'أشعر أحياناً بالقلق أو العصبية ثم أصبح حزيناً بعد بضع ساعات.', 0, false, 'affective_instability'),
  (12, 'When people close to me die or leave me, I feel abandoned.', 'عندما يموت أشخاص مقربون مني أو يتركونني، أشعر بأنني مهجور.', 0, false, 'abandonment'),
  (13, 'I often exaggerate the potential of friendships only to find out later that they will not work out.', 'كثيراً ما أبالغ في تقدير ما يمكن أن تصبح عليه الصداقات، ثم أكتشف لاحقاً أنها لن تنجح.', 0, false, 'relationships'),
  (14, 'If I were more like other people I would feel better about myself.', 'لو كنت أشبه الآخرين أكثر لشعرت بشكل أفضل تجاه نفسي.', 0, false, 'self_image'),
  (15, 'I have deliberately tried to hurt myself without trying to kill myself.', 'حاولت عمداً إيذاء نفسي دون أن أحاول قتل نفسي.', 0, true, 'suicide_self_harm'),
  (16, 'In general, my life is pretty boring.', 'بشكل عام، حياتي مملة إلى حد كبير.', 0, false, 'emptiness'),
  (17, 'I frequently get into physical fights.', 'كثيراً ما أدخل في شجارات جسدية.', 0, false, 'intense_anger'),
  (18, 'People are sometimes out to get me.', 'يسعى الناس أحياناً إلى إيذائي.', 0, false, 'quasi_psychotic'),
  (19, 'My friends have told me that my mood changes very quickly.', 'أخبرني أصدقائي أن مزاجي يتغير بسرعة كبيرة.', 0, false, 'affective_instability'),
  (20, 'I am afraid to spend time alone.', 'أخاف من قضاء الوقت وحدي.', 0, false, 'abandonment'),
  (21, 'People who seem trustworthy often disappoint me.', 'كثيراً ما يخيّب أملي أشخاص يبدون جديرين بالثقة.', 0, false, 'relationships'),
  (22, 'I have made a suicide attempt in the past.', 'قمت بمحاولة انتحار في الماضي.', 0, true, 'suicide_self_harm'),
  (23, 'I often feel like I have nothing to offer others.', 'كثيراً ما أشعر بأنه ليس لديّ ما أقدمه للآخرين.', 0, false, 'emptiness'),
  (24, 'I have trouble controlling my temper.', 'أجد صعوبة في التحكم في أعصابي.', 0, false, 'intense_anger'),
  (25, 'I can read other people''s minds.', 'أستطيع قراءة أفكار الآخرين.', 0, false, 'quasi_psychotic'),
  (26, 'I have tried ''hard'' street drugs (e.g. cocaine, heroin).', 'جرّبت مخدرات "قوية" (مثل الكوكايين أو الهيروين).', 0, false, 'impulsivity'),
  (27, 'My mood frequently alternates throughout the day between happiness, anger, anxiety and depression.', 'يتقلب مزاجي كثيراً خلال اليوم بين السعادة والغضب والقلق والاكتئاب.', 0, false, 'affective_instability'),
  (28, 'When my friends leave, I am confident I will see them again.', 'عندما يغادر أصدقائي، أكون واثقاً من أنني سأراهم مرة أخرى.', 1, false, 'abandonment'),
  (29, 'My friends often disappoint me.', 'كثيراً ما يخيّب أصدقائي أملي.', 0, false, 'relationships'),
  (30, 'I have cut myself on purpose.', 'جرحت نفسي عمداً.', 0, true, 'suicide_self_harm'),
  (31, 'I often feel lonely and deserted.', 'كثيراً ما أشعر بالوحدة والهجران.', 0, false, 'emptiness'),
  (32, 'I have no difficulty controlling my temper.', 'لا أجد صعوبة في التحكم في أعصابي.', 1, false, 'intense_anger'),
  (33, 'I sometimes see or hear things that others cannot see or hear.', 'أرى أو أسمع أحياناً أشياء لا يستطيع الآخرون رؤيتها أو سماعها.', 0, false, 'quasi_psychotic'),
  (34, 'It is not unusual for me to have sex on the first date.', 'ليس من غير المعتاد بالنسبة لي إقامة علاقة جنسية من أول موعد.', 0, false, 'impulsivity'),
  (35, 'I sometimes feel very sad but this feeling can change quickly.', 'أشعر أحياناً بحزن شديد لكن هذا الشعور قد يتغير بسرعة.', 0, false, 'affective_instability'),
  (36, 'People often let me down.', 'كثيراً ما يخذلني الناس.', 0, false, 'relationships'),
  (37, 'I wish I could be more like some of my friends.', 'أتمنى لو كنت أشبه بعض أصدقائي أكثر.', 0, false, 'self_image'),
  (38, 'I used to try to hurt myself to get attention.', 'كنت أحاول إيذاء نفسي لجذب الانتباه.', 0, true, 'suicide_self_harm'),
  (39, 'I am often different with different people in different situations so that sometimes I am not sure who I am.', 'كثيراً ما أكون مختلفاً مع أشخاص مختلفين وفي مواقف مختلفة، لدرجة أنني أحياناً لا أكون متأكداً من أنا.', 0, false, 'emptiness'),
  (40, 'I easily become irritated by others.', 'أنزعج من الآخرين بسهولة.', 0, false, 'intense_anger'),
  (41, 'Sometimes I can actually hear what other people are thinking.', 'أستطيع أحياناً أن أسمع فعلاً ما يفكر فيه الآخرون.', 0, false, 'quasi_psychotic'),
  (42, 'I get high on drugs whenever I feel like it.', 'أتعاطى المخدرات متى ما رغبت في ذلك.', 0, false, 'impulsivity'),
  (43, 'I rarely feel sad or anxious.', 'نادراً ما أشعر بالحزن أو القلق.', 1, false, 'affective_instability'),
  (44, 'No one loves me.', 'لا أحد يحبني.', 0, false, 'abandonment'),
  (45, 'When I trust people, they rarely disappoint me.', 'عندما أثق بالناس، نادراً ما يخيّبون أملي.', 1, false, 'relationships'),
  (46, 'I feel that people would not like me if they really knew me well.', 'أشعر بأن الناس لن يحبوني لو عرفوني حقاً معرفة جيدة.', 0, false, 'self_image'),
  (47, 'I get angry easily.', 'أغضب بسهولة.', 0, false, 'intense_anger'),
  (48, 'It is impossible to read others'' minds.', 'من المستحيل قراءة أفكار الآخرين.', 1, false, 'quasi_psychotic'),
  (49, 'I sometimes feel very happy but this feeling can change quickly.', 'أشعر أحياناً بسعادة كبيرة لكن هذا الشعور قد يتغير بسرعة.', 0, false, 'affective_instability'),
  (50, 'I find it difficult to depend on others because they will not be there when I need them.', 'أجد صعوبة في الاعتماد على الآخرين لأنهم لن يكونوا موجودين عندما أحتاجهم.', 0, false, 'abandonment'),
  (51, 'The relationships with people I care about have lots of ups and downs.', 'علاقاتي بالأشخاص الذين أهتم بهم مليئة بالتقلبات.', 0, false, 'relationships'),
  (52, 'I feel comfortable acting like myself.', 'أشعر بالارتياح عندما أتصرف على طبيعتي.', 1, false, 'self_image'),
  (53, 'I have never made an attempt to hurt myself.', 'لم أحاول أبداً إيذاء نفسي.', 1, true, 'suicide_self_harm'),
  (54, 'I rarely feel lonely.', 'نادراً ما أشعر بالوحدة.', 1, false, 'emptiness'),
  (55, 'I often find that the littlest things make me angry.', 'كثيراً ما أجد أن أصغر الأشياء تغضبني.', 0, false, 'intense_anger'),
  (56, 'Sometimes I can''t tell between what is real and what I have imagined.', 'أحياناً لا أستطيع التمييز بين ما هو حقيقي وما تخيلته.', 0, false, 'quasi_psychotic'),
  (57, 'When I drink, I drink too much.', 'عندما أشرب الكحول، أشرب أكثر من اللازم.', 0, false, 'impulsivity'),
  (58, 'I consider myself to be a moody person.', 'أعتبر نفسي شخصاً متقلب المزاج.', 0, false, 'affective_instability'),
  (59, 'I have difficulty developing close relationships because people often abandon me.', 'أجد صعوبة في تكوين علاقات وثيقة لأن الناس كثيراً ما يتخلون عني.', 0, false, 'abandonment'),
  (60, 'My friends are always there when I need them.', 'أصدقائي موجودون دائماً عندما أحتاجهم.', 1, false, 'relationships'),
  (61, 'I wish I were someone else.', 'أتمنى لو كنت شخصاً آخر.', 0, false, 'self_image'),
  (62, 'I feel like my life is not interesting.', 'أشعر بأن حياتي ليست مثيرة للاهتمام.', 0, false, 'emptiness'),
  (63, 'When I am angry, I sometimes hit objects and break them.', 'عندما أغضب، أضرب الأشياء أحياناً وأكسرها.', 0, false, 'intense_anger'),
  (64, 'I often receive speeding tickets.', 'كثيراً ما أتلقى مخالفات سرعة.', 0, false, 'impulsivity'),
  (65, 'I often feel like I am on an emotional ''roller coaster''.', 'كثيراً ما أشعر وكأنني في "أفعوانية" عاطفية.', 0, false, 'affective_instability'),
  (66, 'I feel like my family has deserted me.', 'أشعر بأن عائلتي قد تخلّت عني.', 0, false, 'abandonment'),
  (67, 'I am very comfortable with who I am.', 'أنا مرتاح جداً لما أنا عليه.', 1, false, 'self_image'),
  (68, 'I often do things impulsively.', 'كثيراً ما أفعل الأشياء باندفاع.', 0, false, 'impulsivity'),
  (69, 'My life is without purpose.', 'حياتي بلا هدف.', 0, false, 'emptiness'),
  (70, 'I am not sure what I want to do in the future.', 'لست متأكداً مما أريد فعله في المستقبل.', 0, false, 'self_image'),
  (71, 'At times I eat so much that I am in pain or have to force myself to throw up.', 'أحياناً آكل كثيراً لدرجة أنني أتألم أو أضطر إلى إجبار نفسي على التقيؤ.', 0, false, 'impulsivity'),
  (72, 'People tell me that I am a moody person.', 'يخبرني الناس أنني شخص متقلب المزاج.', 0, false, 'affective_instability'),
  (73, 'The people I love often leave me.', 'كثيراً ما يتركني الأشخاص الذين أحبهم.', 0, false, 'abandonment'),
  (74, 'In social situations, I often feel that others will see through me and realise that I don''t have much to offer.', 'في المواقف الاجتماعية، كثيراً ما أشعر بأن الآخرين سيرون حقيقتي ويدركون أنه ليس لديّ الكثير لأقدمه.', 0, false, 'self_image'),
  (75, 'I have been in the hospital for trying to harm myself.', 'دخلت المستشفى بسبب محاولتي إيذاء نفسي.', 0, true, 'suicide_self_harm'),
  (76, 'I often feel empty inside.', 'كثيراً ما أشعر بالفراغ في داخلي.', 0, false, 'emptiness'),
  (77, 'Others often make me angry.', 'كثيراً ما يغضبني الآخرون.', 0, false, 'intense_anger'),
  (78, 'I often become frantic when I think that someone I care about will leave me.', 'كثيراً ما أصاب بالهلع عندما أعتقد أن شخصاً أهتم به سيتركني.', 0, false, 'abandonment'),
  (79, 'I am confused about my long-term goals.', 'أنا مشوش بشأن أهدافي بعيدة المدى.', 0, false, 'emptiness'),
  (80, 'Others say I''m quick tempered.', 'يقول الآخرون إنني سريع الغضب.', 0, false, 'intense_anger')
) as v(n, qen, qar, k, safety, sub)
where d.code = 'BPQ';

insert into assessment_items (definition_id, item_number, question_en, question_ar, response_options, is_safety_item, score_weight, subscale)
select d.id, v.n, v.qen, v.qar,
  case v.k when 0 then '[{"value": 1, "label_en": "Never", "label_ar": "أبداً"}, {"value": 2, "label_en": "Rarely", "label_ar": "نادراً"}, {"value": 3, "label_en": "Sometimes", "label_ar": "أحياناً"}, {"value": 4, "label_en": "Often", "label_ar": "غالباً"}, {"value": 5, "label_en": "Always", "label_ar": "دائماً"}]'::jsonb end,
  v.safety, 1.0, v.sub
from assessment_definitions d, (values
  (1, 'My friends expect me to be constantly available online', 'يتوقع أصدقائي أن أكون متاحاً على الإنترنت باستمرار', 0, false, 'availability'),
  (2, 'On top of the other things I must do, keeping up with notifications is a chore', 'إضافة إلى الأشياء الأخرى التي يجب أن أقوم بها، تصبح متابعة الإشعارات عبئاً', 0, false, 'overload'),
  (3, 'I am nervous about how people will respond to my posts and photos', 'أشعر بالتوتر بشأن كيف سيتفاعل الناس مع منشوراتي وصوري', 0, false, 'approval'),
  (4, 'I feel socially unavailable when I do not have my phone', 'أشعر بأنني غير متاح اجتماعياً عندما لا يكون هاتفي معي', 0, false, 'vigilance'),
  (5, 'I fear my friends are having more rewarding experiences than me', 'أخشى أن أصدقائي يعيشون تجارب أكثر إمتاعاً مني', 0, false, 'fomo'),
  (6, 'I have to check too many notifications', 'عليّ أن أتفقد عدداً كبيراً جداً من الإشعارات', 0, false, 'overload'),
  (7, 'I must have my phone with me to know what is going on', 'يجب أن يكون هاتفي معي لأعرف ما يجري', 0, false, 'vigilance'),
  (8, 'For my friends, it is important that I am constantly available online', 'من المهم بالنسبة لأصدقائي أن أكون متاحاً على الإنترنت باستمرار', 0, false, 'availability'),
  (9, 'I feel anxious about how others will respond when I share a new photo on social media', 'أشعر بالقلق بشأن كيف سيتفاعل الآخرون عندما أنشر صورة جديدة على وسائل التواصل الاجتماعي', 0, false, 'approval'),
  (10, 'I fear that others have more rewarding experiences than me', 'أخشى أن لدى الآخرين تجارب أكثر إمتاعاً مني', 0, false, 'fomo'),
  (11, 'I feel overwhelmed with the flow of messages/notifications on my phone', 'أشعر بالإرهاق من تدفق الرسائل/الإشعارات على هاتفي', 0, false, 'overload'),
  (12, 'I feel lost or “naked” without my phone', 'أشعر بالضياع أو "بالعُري" من دون هاتفي', 0, false, 'vigilance'),
  (13, 'I get worried when I find out my friends are having fun without me', 'أشعر بالقلق عندما أكتشف أن أصدقائي يستمتعون من دوني', 0, false, 'fomo'),
  (14, 'It feels like there is always a reminder – like a flashing light or buzz – that there is some other message that I need to attend to', 'أشعر وكأن هناك دائماً تنبيهاً — مثل ضوء وامض أو اهتزاز — بأن هناك رسالة أخرى يجب أن أهتم بها', 0, false, 'overload'),
  (15, 'I am constantly checking my phone for messages/notifications', 'أتفقد هاتفي باستمرار بحثاً عن الرسائل/الإشعارات', 0, false, 'vigilance'),
  (16, 'Most of my friends approve of me being constantly available online', 'يؤيد معظم أصدقائي أن أكون متاحاً على الإنترنت باستمرار', 0, false, 'availability'),
  (17, 'I feel nervous after I share a post or photo to see how others responded to it', 'أشعر بالتوتر بعد أن أنشر منشوراً أو صورة لأرى كيف تفاعل الآخرون معها', 0, false, 'approval'),
  (18, 'I feel a social obligation to be constantly available online', 'أشعر بالتزام اجتماعي بأن أكون متاحاً على الإنترنت باستمرار', 0, false, 'availability'),
  (19, 'I feel stress because I must sift through a lot of unimportant notifications to get to the important ones', 'أشعر بالضغط لأنني يجب أن أفرز الكثير من الإشعارات غير المهمة للوصول إلى المهمة منها', 0, false, 'overload'),
  (20, 'I put a lot of effort into composing messages and posts I share online', 'أبذل جهداً كبيراً في صياغة الرسائل والمنشورات التي أشاركها على الإنترنت', 0, false, 'approval'),
  (21, 'I get anxious when I don’t know what my friends are up to', 'أشعر بالقلق عندما لا أعرف ما يفعله أصدقائي', 0, false, 'fomo'),
  (22, 'I put a lot of effort into finding or creating a photo that others will approve of when I post it online', 'أبذل جهداً كبيراً في إيجاد أو إنشاء صورة ينال نشرها على الإنترنت استحسان الآخرين', 0, false, 'approval'),
  (23, 'I spend too much time responding to notifications/messages', 'أقضي وقتاً طويلاً جداً في الرد على الإشعارات/الرسائل', 0, false, 'overload'),
  (24, 'I feel nervous about how others will respond when I post new updates on social media', 'أشعر بالتوتر بشأن كيف سيتفاعل الآخرون عندما أنشر تحديثات جديدة على وسائل التواصل الاجتماعي', 0, false, 'approval')
) as v(n, qen, qar, k, safety, sub)
where d.code = 'DSS';

insert into assessment_governance (definition_id, original_author, publisher, license_type, commercial_use_allowed, copyright_status, arabic_validation_status, reference_citations, scoring_method, clinical_limitations, last_review_date)
select id, 'Johnson, J. A. (2014), from the International Personality Item Pool (Goldberg et al.)', 'International Personality Item Pool', 'public domain', true, 'Public domain (IPIP). Items free for any use. Norms and report text from third-party scoring services are not public domain.', 'not_validated', 'Johnson, J. A. (2014). Measuring thirty facets of the five factor model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78-89.', 'Facet = sum of 4 items (4-20); domain = sum of its 6 facets (24-120). Reverse-keyed items are pre-inverted in response options. The 120-600 total is stored only so the platform has one number; it is not interpreted. No norms are loaded, so no percentiles.', 'Descriptive, not diagnostic. Liberalism facet includes items about voting and crime that may read differently outside Western settings.', current_date
from assessment_definitions where code = 'IPIP120'
on conflict (definition_id) do update set
  original_author = excluded.original_author, publisher = excluded.publisher, license_type = excluded.license_type,
  commercial_use_allowed = excluded.commercial_use_allowed, copyright_status = excluded.copyright_status,
  arabic_validation_status = excluded.arabic_validation_status, reference_citations = excluded.reference_citations,
  scoring_method = excluded.scoring_method, clinical_limitations = excluded.clinical_limitations,
  last_review_date = excluded.last_review_date;

insert into assessment_governance (definition_id, original_author, publisher, license_type, commercial_use_allowed, copyright_status, arabic_validation_status, reference_citations, scoring_method, clinical_limitations, last_review_date)
select id, 'Smith, R. E., Schutz, R. W., Smoll, F. L., & Ptacek, J. T. (1995)', 'Journal of Sport and Exercise Psychology (Human Kinetics)', 'copyrighted', false, 'Published in a copyrighted journal. Commonly used in research; permission for commercial use not confirmed. Check with the authors or publisher.', 'not_validated', 'Smith, R. E., Schutz, R. W., Smoll, F. L., & Ptacek, J. T. (1995). Development and validation of a multidimensional measure of sport-specific psychological skills: The Athletic Coping Skills Inventory-28. Journal of Sport and Exercise Psychology, 17(4), 379-398.', 'Items scored 0-3; items 3, 7, 10, 12, 19, 23 reverse-scored (pre-inverted). Seven subscales of 4 items (0-12); total 0-84. No norms loaded, so no percentiles.', 'Designed for athletes. Higher scores mean stronger coping skills. Athletes may over-rate themselves.', current_date
from assessment_definitions where code = 'ACSI28'
on conflict (definition_id) do update set
  original_author = excluded.original_author, publisher = excluded.publisher, license_type = excluded.license_type,
  commercial_use_allowed = excluded.commercial_use_allowed, copyright_status = excluded.copyright_status,
  arabic_validation_status = excluded.arabic_validation_status, reference_citations = excluded.reference_citations,
  scoring_method = excluded.scoring_method, clinical_limitations = excluded.clinical_limitations,
  last_review_date = excluded.last_review_date;

insert into assessment_governance (definition_id, original_author, publisher, license_type, commercial_use_allowed, copyright_status, arabic_validation_status, reference_citations, scoring_method, clinical_limitations, last_review_date)
select id, 'Armstrong, J. G., Putnam, F. W., Carlson, E. B., Libero, D. Z., & Smith, S. R. (1997)', 'Journal of Nervous and Mental Disease', 'free to use (confirm)', true, 'Distributed freely by its developers for clinical and research use; confirm terms before commercial use.', 'not_validated', 'Armstrong, J. G., Putnam, F. W., Carlson, E. B., Libero, D. Z., & Smith, S. R. (1997). Development and validation of a measure of adolescent dissociation: The Adolescent Dissociative Experiences Scale. The Journal of Nervous and Mental Disease, 185(8), 491-497.', 'Items 0-10. Total and subscale scores are item means (0-10); the stored total is the item sum (0-300). Bands on the mean: <2.0 low, 2.0-2.9 mild, 3.0-3.9 moderate, 4.0+ high (NovoPsych guideline, not from the original authors).', 'Developed for ages 11-18; the platform is adults-only, so this is switched off. Screening only.', current_date
from assessment_definitions where code = 'ADES'
on conflict (definition_id) do update set
  original_author = excluded.original_author, publisher = excluded.publisher, license_type = excluded.license_type,
  commercial_use_allowed = excluded.commercial_use_allowed, copyright_status = excluded.copyright_status,
  arabic_validation_status = excluded.arabic_validation_status, reference_citations = excluded.reference_citations,
  scoring_method = excluded.scoring_method, clinical_limitations = excluded.clinical_limitations,
  last_review_date = excluded.last_review_date;

insert into assessment_governance (definition_id, original_author, publisher, license_type, commercial_use_allowed, copyright_status, arabic_validation_status, reference_citations, scoring_method, clinical_limitations, last_review_date)
select id, 'Poreh, A. M., Rawlings, D., Claridge, G., Freeman, J. L., Faulkner, C., & Shelton, C. (2006)', 'Journal of Personality Disorders (Guilford Press)', 'copyrighted', false, 'Published in a copyrighted journal; permission for commercial use not confirmed. Check with the authors or publisher.', 'not_validated', 'Poreh, A. M., Rawlings, D., Claridge, G., Freeman, J. L., Faulkner, C., & Shelton, C. (2006). The BPQ: A scale for the assessment of borderline personality based on DSM-IV criteria. Journal of Personality Disorders, 20(3), 247-260.', 'True/false; keyed answer = 1 (13 items keyed False). Total 0-80: 0-29 subclinical, 30-34 mild, 35-42 moderate, 43-80 severe. Subscales shown as percent of items endorsed. Any keyed answer on the suicide/self-harm subscale raises the high-risk flag.', 'Screening only; does not diagnose BPD. Suicide/self-harm items ask about lifetime history, not current risk. Overlaps with ADHD, eating disorders, substance use, depression and PTSD.', current_date
from assessment_definitions where code = 'BPQ'
on conflict (definition_id) do update set
  original_author = excluded.original_author, publisher = excluded.publisher, license_type = excluded.license_type,
  commercial_use_allowed = excluded.commercial_use_allowed, copyright_status = excluded.copyright_status,
  arabic_validation_status = excluded.arabic_validation_status, reference_citations = excluded.reference_citations,
  scoring_method = excluded.scoring_method, clinical_limitations = excluded.clinical_limitations,
  last_review_date = excluded.last_review_date;

insert into assessment_governance (definition_id, original_author, publisher, license_type, commercial_use_allowed, copyright_status, arabic_validation_status, reference_citations, scoring_method, clinical_limitations, last_review_date)
select id, 'Hall, J. A., Steele, R. G., Christofferson, J. L., & Mihailova, T. (2021)', 'Psychological Assessment (American Psychological Association)', 'copyrighted', false, 'Published in an APA journal; permission for commercial use not confirmed. Check with the authors or APA.', 'not_validated', 'Hall, J. A., Steele, R. G., Christofferson, J. L., & Mihailova, T. (2021). Development and initial evaluation of a multidimensional digital stress scale. Psychological Assessment, 33(3), 230-242.', 'Items 1-5. Total and subscale scores are item means (1-5); the stored total is the item sum (24-120). No norms loaded, so the percentile categories are not shown.', 'Ages 14+. Normed on 735 adolescents and young adults.', current_date
from assessment_definitions where code = 'DSS'
on conflict (definition_id) do update set
  original_author = excluded.original_author, publisher = excluded.publisher, license_type = excluded.license_type,
  commercial_use_allowed = excluded.commercial_use_allowed, copyright_status = excluded.copyright_status,
  arabic_validation_status = excluded.arabic_validation_status, reference_citations = excluded.reference_citations,
  scoring_method = excluded.scoring_method, clinical_limitations = excluded.clinical_limitations,
  last_review_date = excluded.last_review_date;

commit;
