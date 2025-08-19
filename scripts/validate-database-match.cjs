
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

async function validateDatabaseMatch() {
    console.log('Starting database validation...');

    // 1. Read the organization report
    if (!fs.existsSync(REPORT_PATH)) {
        console.error(`Organization report not found at ${REPORT_PATH}`);
        return;
    }
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));

    // 2. Fetch data from Supabase
    const { data: subjects, error: subjectsError } = await supabase.from('subjects').select('id, code');
    if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        return;
    }

    const { data: papers, error: papersError } = await supabase.from('papers').select('subject_id, code');
    if (papersError) {
        console.error('Error fetching papers:', papersError);
        return;
    }
    
    const validationResult = {
        reportDate: new Date().toISOString(),
        subjects: {
            found: new Set(),
            missing: new Set(),
        },
        papers: {
            found: new Set(),
            missing: new Set(),
        },
        unrecognized_files: report.unrecognizedFiles,
    };
    
    const subjectCodeToId = subjects.reduce((acc, subject) => {
        acc[subject.code] = subject.id;
        return acc;
    }, {});

    // 3. Compare report with database
    for (const subjectCode in report.subjects) {
        if (subjectCodeToId[subjectCode]) {
            validationResult.subjects.found.add(subjectCode);
            
            const subjectId = subjectCodeToId[subjectCode];
            const subjectPapers = report.subjects[subjectCode].papers;

            for (const paperKey in subjectPapers) {
                const paperCode = paperKey.replace(' ', '').toLowerCase();
                
                const paperExists = papers.some(p => p.subject_id === subjectId && p.code === paperCode);

                if (paperExists) {
                    validationResult.papers.found.add(`${subjectCode}/${paperCode}`);
                } else {
                    validationResult.papers.missing.add(`${subjectCode}/${paperCode}`);
                }
            }
        } else {
            validationResult.subjects.missing.add(subjectCode);
        }
    }

    // 4. Print summary
    console.log('\n--- Validation Summary ---');
    console.log(`Found Subjects:`, Array.from(validationResult.subjects.found));
    console.log(`Missing Subjects in DB:`, Array.from(validationResult.subjects.missing));
    console.log(`\nFound Papers:`, Array.from(validationResult.papers.found).slice(0, 10).join(', ') + '...');
    console.log(`Missing Papers in DB:`, Array.from(validationResult.papers.missing));
    console.log(`\nUnrecognized Files from Report:`, validationResult.unrecognized_files);
    console.log('--------------------------\n');

    console.log('Validation complete.');
}

validateDatabaseMatch();

