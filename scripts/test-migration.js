// scripts/test-migration.js
import fs from 'fs';
import pdf from 'pdf-parse';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths to our sample files
const qpPath = path.join(__dirname, '../data/past-papers/9709Mathematics/paper1/9709_s23_qp_12.pdf');
const msPath = path.join(__dirname, '../data/mark-schemes/9709Mathematics/9709_s23_ms_12.pdf');

async function testPdfParsing() {
    console.log('--- Starting PDF Parsing Test ---');

    try {
        console.log(`Resolved QP Path: ${qpPath}`);
        console.log(`Resolved MS Path: ${msPath}`);

        // --- Process Question Paper ---
        console.log(`\nReading Question Paper: ${qpPath}`);
        const qpDataBuffer = fs.readFileSync(qpPath);
        const qpData = await pdf(qpDataBuffer);
        
        console.log('\n--- Question Paper (QP) Text ---');
        console.log(qpData.text.substring(0, 2000)); // Print first 2000 chars for brevity
        console.log('---------------------------------');


        // --- Process Mark Scheme ---
        console.log(`\nReading Mark Scheme: ${msPath}`);
        const msDataBuffer = fs.readFileSync(msPath);
        const msData = await pdf(msDataBuffer);

        console.log('\n--- Mark Scheme (MS) Text ---');
        console.log(msData.text.substring(0, 2000)); // Print first 2000 chars for brevity
        console.log('-------------------------------');


        console.log('\n--- PDF Parsing Test Finished ---');

    } catch (error) {
        console.error('An error occurred during the parsing test:', error);
    }
}

testPdfParsing();
