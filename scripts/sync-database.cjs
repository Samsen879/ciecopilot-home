const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL or Key is not defined. Please check your .env file.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const REPORT_PATH = path.join(__dirname, '../data/organization-report.json');

async function syncDatabase() {
    console.log('Starting database synchronization...');

    // 1. Read the organization report
    if (!fs.existsSync(REPORT_PATH)) {
        console.error(`Organization report not found at ${REPORT_PATH}`);
        return;
    }
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));

    // 2. Sync subjects
    console.log('Syncing subjects...');
    const subjectsToUpsert = Object.keys(report.subjects).map(code => ({
        code: code,
        name: `Subject ${code}` // Placeholder name
    }));

    if (subjectsToUpsert.length > 0) {
        const { data: subjects, error: subjectsError } = await supabase
            .from('subjects')
            .upsert(subjectsToUpsert, { onConflict: 'code', ignoreDuplicates: false });

        if (subjectsError) {
            console.error('Error syncing subjects:', subjectsError);
            return;
        }
        console.log('Subjects synced successfully.');
    } else {
        console.log('No subjects to sync.');
    }

    // Fetch all subjects again to get their IDs
    const { data: allSubjects, error: fetchError } = await supabase.from('subjects').select('id, code');
    if (fetchError) {
        console.error('Error fetching subjects after sync:', fetchError);
        return;
    }

    const subjectCodeToId = allSubjects.reduce((acc, subject) => {
        acc[subject.code] = subject.id;
        return acc;
    }, {});


    // 3. Sync papers
    console.log('Syncing papers...');
    const papersToUpsert = [];
    for (const subjectCode in report.subjects) {
        const subjectId = subjectCodeToId[subjectCode];
        if (subjectId) {
            const subjectPapers = report.subjects[subjectCode].papers;
            for (const paperKey in subjectPapers) {
                const paperCode = paperKey.replace(' ', '').toLowerCase();
                const filePath = subjectPapers[paperKey].files[0]; // Assuming one file per paper for now
                
                papersToUpsert.push({
                    subject_id: subjectId,
                    code: paperCode,
                    name: paperCode, // Set name to code to satisfy NOT NULL constraint
                    file_path: filePath
                });
            }
        }
    }

    if (papersToUpsert.length > 0) {
        // Upsert in chunks to avoid hitting payload size limits
        const chunkSize = 500;
        for (let i = 0; i < papersToUpsert.length; i += chunkSize) {
            const chunk = papersToUpsert.slice(i, i + chunkSize);
            console.log(`Upserting papers chunk ${i / chunkSize + 1}...`);
            const { error: papersError } = await supabase
                .from('papers')
                .upsert(chunk, { onConflict: 'subject_id, code', ignoreDuplicates: false });

            if (papersError) {
                console.error('Error syncing papers:', papersError);
                // Continue to next chunk
            }
        }
        console.log('Papers synced successfully.');
    } else {
        console.log('No papers to sync.');
    }

    console.log('Database synchronization complete.');
}

syncDatabase();

