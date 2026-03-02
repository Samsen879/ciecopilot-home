-- A1-T3 quick verification for question_concept_links

-- Total link rows
SELECT COUNT(*) AS total_links
FROM public.question_concept_links;

-- Distinct linked questions
SELECT COUNT(DISTINCT storage_key) AS distinct_questions
FROM public.question_concept_links;

-- Link type distribution
SELECT link_type, COUNT(*) AS cnt
FROM public.question_concept_links
GROUP BY link_type
ORDER BY link_type;

-- Orphan links (node_id not found in curriculum_nodes)
SELECT COUNT(*) AS orphan_node_links
FROM public.question_concept_links l
LEFT JOIN public.curriculum_nodes n ON n.node_id = l.node_id
WHERE n.node_id IS NULL;

-- Orphan links (storage_key not found in question_descriptions_prod_v1)
SELECT COUNT(*) AS orphan_question_links_prod_v1
FROM public.question_concept_links l
LEFT JOIN public.question_descriptions_prod_v1 q ON q.storage_key = l.storage_key
WHERE q.storage_key IS NULL;

-- Orphan links (storage_key not found in question_descriptions_v0, backward check)
SELECT COUNT(*) AS orphan_question_links_v0
FROM public.question_concept_links l
LEFT JOIN public.question_descriptions_v0 q ON q.storage_key = l.storage_key
WHERE q.storage_key IS NULL;

-- Questions with multiple primary links (should be 0 after scoped replace-upsert)
SELECT COUNT(*) AS questions_with_multi_primary
FROM (
  SELECT storage_key
  FROM public.question_concept_links
  WHERE link_type = 'primary'
  GROUP BY storage_key
  HAVING COUNT(*) > 1
) t;
