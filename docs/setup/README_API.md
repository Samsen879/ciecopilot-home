# OpenAI API Integration

## Overview

This project integrates AI chat + RAG through a canonical API surface under `apps/api-node/api`. The frontend uses `/api/*` routes, and legacy endpoints remain available but are deprecated.

## Canonical API Surface (apps/api-node/api)

**Primary entrypoint**: `POST /api/ask`  
**Health check**: `GET /api/health`

Legacy endpoints (deprecated; thin wrappers to `/api/ask`):
- `POST /api/chat`
- `POST /api/rag/chat`
- `POST /api/rag/chat-v2`
- `POST /api/ai/tutor/chat`

**Root `/api/` directory** is legacy-only and forwards to `apps/api-node/api`. Do not add business logic there.

## Project Structure

**Important Note**: This is a **Vite + React project** running on **Aliyun ECS**. The API endpoint is served by the Node server in `apps/api-node/server.js`.

```
/apps/api-node/api/ask.js      # Canonical AI entrypoint (routing facade)
/apps/api-node/api/health.js   # Health check
/api/*.js                       # Legacy wrappers (deprecated)
/src/components/ChatWidget.jsx  # Chat UI component with live AI integration
/src/utils/openai.js      # Utility functions for API calls
```

## API Endpoint

**URL**: `/api/ask`  
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

### 1. Using the ChatWidget Component

The ChatWidget is already integrated in your Landing page. It provides:
- Real-time AI conversations
- Context-aware responses
- CIE curriculum specialization
- Beautiful UI with animations

### 2. Using Utility Functions

```javascript
import { askCIETutor, askAI, callOpenAI } from './src/utils/openai.js';

// Simple CIE tutoring question
const response = await askCIETutor(
  "Explain the chain rule in calculus", 
  "Mathematics"
);

// General AI question
const answer = await askAI("What is photosynthesis?");

// Advanced usage with conversation history
const messages = [
  { role: "system", content: "You are a physics tutor." },
  { role: "user", content: "What is Newton's first law?" },
  { role: "assistant", content: "Newton's first law states..." },
  { role: "user", content: "Can you give me an example?" }
];
const result = await callOpenAI(messages);
```

### 3. Frontend Fetch Example

```javascript
// Direct API call from any React component
const callChatAPI = async (userMessage) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are a CIE A-Level tutor specializing in Mathematics, Physics, and Economics."
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content;
  } catch (error) {
    console.error('Error:', error);
    return 'Sorry, something went wrong.';
  }
};
```

## Security Features

✅ **API Key Protection**: Stored as environment variable, never exposed to frontend  
✅ **Method Validation**: Only POST requests allowed  
✅ **Input Validation**: Validates message format and content  
✅ **Error Handling**: Comprehensive error responses without exposing internal details  
✅ **Rate Limiting**: Handled by Vercel and OpenAI  

## Testing

### 1. Test the API endpoint directly

```bash
curl -X POST https://your-site.vercel.app/api/ask \
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
   - Check Vercel environment variables
   - Ensure key name is exactly `OPENAI_API_KEY`

2. **"Method not allowed"**
   - Ensure you're making POST requests only
   - Check Content-Type header

3. **"Invalid request"**
   - Verify messages array format
   - Ensure messages array is not empty

4. **Chat shows "technical difficulties"**
   - Check browser console for errors
   - Verify API endpoint is accessible
   - Check OpenAI API key validity

## Next Steps

1. **Monitor Usage**: Track OpenAI API costs in your OpenAI dashboard
2. **Rate Limiting**: Consider implementing rate limiting for production
3. **Caching**: Add response caching for common questions
4. **Analytics**: Track conversation patterns and user engagement

## API Key Security Reminder

🔐 **Critical**: The API key you shared in your message should be **immediately revoked** and regenerated for security reasons. Never share API keys in plain text communications. 
