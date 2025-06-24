# OpenAI API Integration

## Overview

This project integrates OpenAI's GPT-4 Turbo model through a secure Vercel serverless function. Your ChatWidget component and custom utility functions provide a seamless AI tutoring experience for CIE students.

## Project Structure

**Important Note**: This is a **Vite + React project** deployed on **Vercel**, not a Next.js project. The API endpoint uses Vercel's serverless functions format.

```
/api/chat.js              # Vercel serverless function (OpenAI API proxy)
/src/components/ChatWidget.jsx  # Chat UI component with live AI integration
/src/utils/openai.js      # Utility functions for API calls
```

## API Endpoint

**URL**: `/api/chat`  
**Method**: `POST`  
**Content-Type**: `application/json`

### Request Format
```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Explain calculus differentiation." }
  ]
}
```

### Response Format
```json
{
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
```

## Environment Setup

### 1. Vercel Environment Variables

⚠️ **Security Warning**: Never commit API keys to your repository!

1. Go to your Vercel dashboard
2. Navigate to your project settings
3. Add environment variable:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-proj-...`)

### 2. Local Development

Create a `.env.local` file in your project root:
```bash
OPENAI_API_KEY=your_openai_api_key_here
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
curl -X POST https://your-site.vercel.app/api/chat \
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