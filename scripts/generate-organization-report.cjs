const fs = require('fs');
const path = require('path');

const PAST_PAPERS_DIR = path.join(__dirname, '../data/past-papers');
const REPORT_PATH = path.join(__dirname, '../data/organization-report.json');

const subjectCodeMapping = {
    '9709': 'Mathematics',
    '9702': 'Physics',
    '9231': 'Further Mathematics'
};

const paperTypeMapping = {
    'qp': 'Question Paper',
    'ms': 'Mark Scheme',
    'er': 'Examiner Report',
    'gt': 'Grade Thresholds',
    'ci': 'Confidential Instructions',
    'in': 'Insert',
};

const sessionMapping = {
    's': 'Summer (May/June)',
    'w': 'Winter (Oct/Nov)',
    'm': 'March',
};

function parseFilename(filename) {
    // Regex to handle standard (9709_s22_qp_11.pdf) and non-standard (WM_9709_s20_qp_12.pdf) formats
    const regex = /^(?:WM_)?(\d{4})_([a-z]\d{2})_([a-z]{2})_(\d{1,2})\.pdf$/i;
    const match = filename.match(regex);

    if (!match) {
        return { error: 'Invalid filename format', filename };
    }

    const [, subjectCode, sessionStr, paperType, paperInfo] = match;
    
    const year = parseInt(`20${sessionStr.slice(1)}`, 10);
    const sessionCode = sessionStr.charAt(0);
    
    const paperNumber = paperInfo.charAt(0);
    const variant = paperInfo.length > 1 ? paperInfo.slice(1) : '0';

    return {
        subjectCode,
        subjectName: subjectCodeMapping[subjectCode] || 'Unknown',
        year,
        session: sessionMapping[sessionCode] || 'Unknown',
        sessionCode,
        paperType: paperTypeMapping[paperType.toLowerCase()] || 'Unknown',
        paperTypeCode: paperType.toLowerCase(),
        paperNumber,
        variant,
        filename,
    };
}


function generateOrganizationReport() {
    console.log('Starting to scan past papers directory...');
    const report = {
        scanDate: new Date().toISOString(),
        totalFiles: 0,
        unrecognizedFiles: 0,
        subjects: {},
    };

    const subjectDirs = fs.readdirSync(PAST_PAPERS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    for (const subjectDirName of subjectDirs) {
        const subjectCode = subjectDirName.match(/^\d{4}/)?.[0];
        if (!subjectCode) continue;

        const subjectName = subjectCodeMapping[subjectCode] || 'Unknown Subject';
        if (!report.subjects[subjectCode]) {
            report.subjects[subjectCode] = { name: subjectName, papers: {} };
        }

        const subjectPath = path.join(PAST_PAPERS_DIR, subjectDirName);
        const paperDirs = fs.readdirSync(subjectPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const paperDirName of paperDirs) {
            const paperPath = path.join(subjectPath, paperDirName);
            const files = fs.readdirSync(paperPath).filter(f => f.endsWith('.pdf'));

            for (const file of files) {
                report.totalFiles++;
                const filePath = path.join(paperPath, file);
                const parsed = parseFilename(file);
                
                if (parsed.error) {
                    report.unrecognizedFiles++;
                    if (!report.subjects[subjectCode].unrecognized) {
                        report.subjects[subjectCode].unrecognized = [];
                    }
                    report.subjects[subjectCode].unrecognized.push({ ...parsed, path: filePath });
                    continue;
                }

                const paperKey = `Paper ${parsed.paperNumber}`;
                if (!report.subjects[subjectCode].papers[paperKey]) {
                    report.subjects[subjectCode].papers[paperKey] = { files: [] };
                }

                report.subjects[subjectCode].papers[paperKey].files.push({
                    ...parsed,
                    path: filePath,
                });
            }
        }
    }

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`Report generated successfully at ${REPORT_PATH}`);
    console.log(`- Total files scanned: ${report.totalFiles}`);
    console.log(`- Unrecognized files: ${report.unrecognizedFiles}`);
}

// Execute the function
generateOrganizationReport();