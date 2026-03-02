#!/usr/bin/env python3
"""Migration safety check script - detects dangerous operations in SQL files."""
import json
import re
import sys
from pathlib import Path

DANGEROUS_PATTERNS = [
    (r'\bDROP\s+TABLE\b(?!\s+IF\s+EXISTS)', 'DROP TABLE without IF EXISTS', 'high'),
    (r'\bDROP\s+COLUMN\b', 'DROP COLUMN detected', 'high'),
    (r'\bTRUNCATE\b', 'TRUNCATE detected', 'high'),
    (r'\bDELETE\s+FROM\s+\w+\s*;', 'DELETE without WHERE', 'high'),
    (r'\bALTER\s+TABLE\s+\w+\s+ALTER\s+COLUMN\s+\w+\s+TYPE\b', 'ALTER COLUMN TYPE', 'high'),
    (r'\bDROP\s+CONSTRAINT\b(?!\s+IF\s+EXISTS)', 'DROP CONSTRAINT without IF EXISTS', 'high'),
]

WARNING_PATTERNS = [
    (r'\bADD\s+COLUMN\s+\w+\s+\w+\s+NOT\s+NULL\b(?!\s+DEFAULT)', 'NOT NULL without DEFAULT', 'medium'),
    (r'\bCREATE\s+INDEX\b(?!\s+(CONCURRENTLY|IF))', 'CREATE INDEX without CONCURRENTLY', 'medium'),
    (r'\bALTER\s+TABLE\s+\w+\s+RENAME\b', 'RENAME operation', 'medium'),
]

GOOD_PATTERNS = [
    (r'\bIF\s+NOT\s+EXISTS\b', 'idempotent_create'),
    (r'\bIF\s+EXISTS\b', 'idempotent_drop'),
    (r'\bCREATE\s+OR\s+REPLACE\b', 'idempotent_function'),
    (r'\bDO\s+\$\$', 'plpgsql_block'),
]

def check_migration(filepath: Path) -> dict:
    """Check a single migration file for safety issues."""
    content = filepath.read_text()
    result = {'file': filepath.name, 'issues': [], 'good_practices': [], 'safe': True}
    
    for pattern, msg, severity in DANGEROUS_PATTERNS:
        if re.search(pattern, content, re.I):
            result['issues'].append({'message': msg, 'severity': severity})
            result['safe'] = False
    
    for pattern, msg, severity in WARNING_PATTERNS:
        if re.search(pattern, content, re.I):
            result['issues'].append({'message': msg, 'severity': severity})
    
    for pattern, name in GOOD_PATTERNS:
        if re.search(pattern, content, re.I):
            result['good_practices'].append(name)
    
    return result

def main():
    if len(sys.argv) > 1:
        files = [Path(f) for f in sys.argv[1:]]
    else:
        project_root = Path(__file__).parent.parent.parent
        migrations_dir = project_root / 'supabase' / 'migrations'
        files = sorted(migrations_dir.glob('*.sql'))
    
    results = {'files': [], 'summary': {'total': 0, 'safe': 0, 'unsafe': 0, 'warnings': 0}}
    
    for f in files:
        if not f.exists():
            continue
        check = check_migration(f)
        results['files'].append(check)
        results['summary']['total'] += 1
        if check['safe']:
            results['summary']['safe'] += 1
        else:
            results['summary']['unsafe'] += 1
        results['summary']['warnings'] += len([i for i in check['issues'] if i['severity'] == 'medium'])
    
    results['success'] = results['summary']['unsafe'] == 0
    print(json.dumps(results, indent=2))
    sys.exit(0 if results['success'] else 1)

if __name__ == '__main__':
    main()
