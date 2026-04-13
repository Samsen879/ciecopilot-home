import { getServiceClient } from '../../api/lib/supabase/client.js';
import { runQuestionAnalysisBackfill } from './lib/question-analysis-backfill.js';

function printUsage() {
  console.log('Usage: node scripts/learning/run_question_analysis_backfill.js [--force]');
}

async function loadCandidateQuestions(client) {
  const { data, error } = await client
    .from('question_bank')
    .select(
      'question_id, source_kind, subject_code, prompt_representation, paper_scope, provenance_summary, classification_snapshot_ref',
    )
    .eq('source_kind', 'imported_question');

  if (error) {
    throw new Error(`Failed to load question bank rows for backfill: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help')) {
    printUsage();
    return;
  }

  const force = argv.includes('--force');
  const client = getServiceClient();
  const questions = await loadCandidateQuestions(client);
  const summary = await runQuestionAnalysisBackfill(client, {
    questions,
    force,
  });

  console.log(JSON.stringify(summary, null, 2));
}

const isEntrypoint = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isEntrypoint) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
