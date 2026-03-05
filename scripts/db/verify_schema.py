#!/usr/bin/env python3
"""Schema verification script - executes sql/verify/*.sql and generates JSON report."""
import json
import os
import sys
from pathlib import Path

def get_db_connection():
    """Get database connection using psycopg2."""
    import psycopg2
    return psycopg2.connect(os.environ.get('DATABASE_URL', 'postgresql://localhost/cie_copilot'))

def parse_sql_tests(sql_content: str) -> list[tuple[str, str]]:
    """Extract test_id and query from SQL file."""
    tests = []
    current_query = []
    for line in sql_content.split('\n'):
        line = line.strip()
        if line.startswith('--') or not line:
            if current_query:
                query = ' '.join(current_query)
                if "'A" in query or "'V" in query or "'X" in query:
                    tests.append(query)
                current_query = []
            continue
        current_query.append(line)
    if current_query:
        query = ' '.join(current_query)
        if "'A" in query or "'V" in query or "'X" in query:
            tests.append(query)
    return tests

def run_verification(sql_dir: Path) -> dict:
    """Run all verification SQL files and collect results."""
    results = {'passed': 0, 'failed': 0, 'errors': [], 'details': []}
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
    except Exception as e:
        results['errors'].append(f"Connection failed: {e}")
        return results
    
    for sql_file in sorted(sql_dir.glob('invariants_*.sql')):
        sql_content = sql_file.read_text()
        tests = parse_sql_tests(sql_content)
        
        for query in tests:
            try:
                cur.execute(query)
                rows = cur.fetchall()
                test_id = rows[0][0] if rows else 'UNKNOWN'
                if len(rows) == 0:
                    results['passed'] += 1
                    results['details'].append({'test_id': test_id, 'status': 'PASS', 'rows': 0})
                else:
                    results['failed'] += 1
                    results['details'].append({'test_id': test_id, 'status': 'FAIL', 'rows': len(rows)})
            except Exception as e:
                results['errors'].append(f"Query error: {e}")
    
    conn.close()
    return results

def main():
    project_root = Path(__file__).parent.parent.parent
    sql_dir = project_root / 'sql' / 'verify'
    
    if not sql_dir.exists():
        print(json.dumps({'error': f'Directory not found: {sql_dir}'}))
        sys.exit(1)
    
    results = run_verification(sql_dir)
    results['total'] = results['passed'] + results['failed']
    results['success'] = results['failed'] == 0 and len(results['errors']) == 0
    
    print(json.dumps(results, indent=2))
    sys.exit(0 if results['success'] else 1)

if __name__ == '__main__':
    main()
