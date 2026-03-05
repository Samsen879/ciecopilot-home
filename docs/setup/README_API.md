# OpenAI API Integration

## Overview

This project integrates AI chat + RAG through the active API gateway under `api/`. The frontend uses `/api/*` routes. Production no longer uses Vercel; the current deployment target is **Aliyun ECS**.

## Active API Surface

Current active entrypoints:

- `GET /api/info`
- `GET /api/health`
- `GET /api/routes`
- `POST /api/rag/ask`
- `POST /api/rag/search`
- `POST /api/chat` (compatibility endpoint, deprecated)
- `POST /api/rag/chat` (compatibility endpoint, deprecated)
- `POST /api/ai/tutor/chat` (compatibility endpoint, deprecated)

`api/index.js` is the active gateway/runtime entry for local development and ECS deployment.

## Project Structure

Important paths:

```
/api/index.js                   # Active API gateway / local ECS runtime entry
/api/rag/ask.js                 # Current ask endpoint
/api/rag/search.js              # RAG retrieval endpoint
/api/chat.js                    # Compatibility chat endpoint
/src/api/ragApi.js              # Frontend API wrapper
/src/hooks/useChat.js           # Frontend chat hook
/src/components/ChatWidget.jsx  # Chat UI component
```

Historical compatibility code still exists under `apps/api-node/api`, but it is not the active deployment runtime described by this document.

## API Endpoint

**URL**: `/api/rag/ask`  
**Method**: `POST`  
**Content-Type**: `application/json`

### Request Format
```json
{
  "mode": "chat",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Explain calculus differentiation." }
  ]
}
```

### Response Format
```json
{
  "deprecated": false,
  "route": "ask",
  "data": {
    "id": "chatcmpl-...",
    "object": "chat.completion",
    "choices": [
      {
        "message": {
          "role": "assistant",
          "content": "Calculus differentiation is..."
        }
      }
    ]
  }
}
```

## Environment Setup

### 1. Server Environment Variables

⚠️ **Security Warning**: Never commit API keys to your repository!

- **OPENAI_API_KEY**: OpenAI API key (starts with `sk-proj-...`)
- **SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY**: Supabase credentials

### 2. Local Development

Create a `.env.local` file in your project root:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Database Migrations

Canonical migrations live in `supabase/migrations` (the `database/migrations` directory is deprecated). Use:

```bash
node scripts/run-sql-migration.js --list
node scripts/run-sql-migration.js --file <migration_file.sql>
node scripts/run-sql-migration.js --all
```

**P0 minimal (fixed order):**
1) `20260118093000_add_learning_records_errors_quiz_sessions.sql`  
2) `20260118093100_curriculum_nodes_topic_path.sql`  
3) `20260118093200_recreate_hybrid_search_v2.sql`

⚠️ **Warning**: Do NOT run `--all` on production unless you fully understand ordering.
This repository contains both numbered migrations (e.g., `012_*`) and timestamped migrations.

PowerShell examples:
```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
node scripts/run-sql-migration.js --list
node scripts/run-sql-migration.js --file 20260118093000_add_learning_records_errors_quiz_sessions.sql
node scripts/run-sql-migration.js --all --dry-run
```

Supabase RPC backend (only if exec_sql exists):
```powershell
$env:SUPABASE_URL="https://<project>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="..."
node scripts/run-sql-migration.js --url $env:SUPABASE_URL --service-key $env:SUPABASE_SERVICE_ROLE_KEY --file 20260118093000_add_learning_records_errors_quiz_sessions.sql
```

## Usage Examples

### 1. Frontend Fetch Example

```javascript
const callAskAPI = async (messages) => {
  try {
    const response = await fetch('/api/rag/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

## Security Features

✅ **API Key Protection**: Stored as environment variable, never exposed to frontend  
✅ **Method Validation**: Only POST requests allowed  
✅ **Input Validation**: Validates message format and content  
✅ **Error Handling**: Comprehensive error responses without exposing internal details  
✅ **Rate Limiting**: Handled by server-side gateway and route policy  

## Testing

### 1. Test the API endpoint directly

```bash
curl -X POST https://your-domain/api/rag/ask \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, can you help me with math?"}
    ]
  }'
```

### 2. Test through the ChatWidget

1. Visit your deployed site
2. Click the blue chat button in the bottom-right corner
3. Ask a question like "Explain quadratic equations"
4. Verify you get a real AI response (not demo text)

## Model Configuration

Currently using **GPT-4 Turbo** (`gpt-4-1106-preview`) with these settings:
- **Temperature**: 0.7 (balanced creativity/accuracy)
- **Max Tokens**: 2048 (sufficient for detailed explanations)
- **Top P**: 1 (full vocabulary consideration)

## Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Check environment variables on Aliyun ECS
   - Ensure key name is exactly `OPENAI_API_KEY`

2. **"Method not allowed"**
   - Ensure you're making POST requests only
   - Check Content-Type header

3. **"Invalid request"**
   - Verify messages array format
   - Ensure messages array is not empty

4. **Chat shows "technical difficulties"**
   - Check browser console for errors
   - Verify `/api/rag/ask` or compatibility endpoint is accessible
   - Check OpenAI API key validity

## Next Steps

1. **Monitor Usage**: Track OpenAI API costs in your OpenAI dashboard
2. **Rate Limiting**: Consider implementing rate limiting for production
3. **Caching**: Add response caching for common questions
4. **Analytics**: Track conversation patterns and user engagement

## API Key Security Reminder

🔐 **Critical**: The API key you shared in your message should be **immediately revoked** and regenerated for security reasons. Never share API keys in plain text communications. 
