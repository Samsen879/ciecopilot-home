// scripts/test-migration.cjs
const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');
const { OpenAI } = require('openai');

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// --- DEBUGGING STEP ---
// Let's see what key is actually loaded.
const apiKey = process.env.OPENAI_API_KEY;
if (apiKey) {
  console.log(`[DEBUG] API Key Loaded: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
} else {
  console.log('[DEBUG] API Key not found in process.env!');
}
// --- END DEBUGGING STEP ---

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define paths to our sample files
const qpPath = path.join(__dirname, '../data/past-papers/9709Mathematics/paper1/9709_s23_qp_12.pdf');
const msPath = path.join(__dirname, '../data/mark-schemes/9709Mathematics/9709_s23_ms_12.pdf');

/**
 * Sends text to the OpenAI API for parsing based on a specific prompt.
 * @param {string} text - The text to be parsed.
 * @param {string} prompt - The system prompt to guide the AI.
 * @returns {Promise<object>} - The parsed JSON object from the AI.
 */
async function parseWithAI(text, prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Using the specified gpt-4o model
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = response.choices[0].message.content;
    return JSON.parse(result);
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error; // Re-throw the error to be caught by the caller
  }
}

async function testPdfAndAiParsing() {
    console.log('--- Starting PDF and AI Parsing Test ---');
    
    try {
        // --- Step 1: Read and Parse PDF files ---
        console.log(`\nReading Question Paper: ${qpPath}`);
        const qpDataBuffer = fs.readFileSync(qpPath);
        const qpData = await pdf(qpDataBuffer);
        const qpText = qpData.text;

        console.log(`Reading Mark Scheme: ${msPath}`);
        const msDataBuffer = fs.readFileSync(msPath);
        const msData = await pdf(msDataBuffer);
        const msText = msData.text;

        console.log('\n--- PDF Reading Complete ---');

        // --- Step 2: Define Prompts for AI ---
        const qpPrompt = `You are an expert AI assistant specializing in parsing educational documents. Your task is to analyze the text of a Cambridge International A-Level Mathematics (9709) past paper and extract all questions into a structured JSON format.

Please adhere to the following rules for parsing:
1.  **Identify Individual Questions**: Scan the document to locate each distinct question. Questions are typically numbered sequentially (1, 2, 3, etc.).
2.  **Extract Key Information**: For each question, extract the following details:
    *   'questionNumber': The integer number of the question.
    *   'body': The full text of the question, including all parts and sub-questions (e.g., (a), (b), (i), (ii)). Concatenate all parts into a single string.
    *   'marks': The total marks allocated for the question, usually indicated in square brackets at the end (e.g., [3]). Extract only the integer value.
3.  **Handle Multi-Part Questions**: Combine all parts of a question (e.g., parts (a), (b), (c)) into the single 'body' field. Do not create separate entries for sub-questions.
4.  **Clean the Text**: Exclude extraneous information like page numbers, headers (e.g., '© UCLES 2023'), footers, and instructions like '[Turn over]'. Focus only on the question content itself.
5.  **Output Format**: Return the result as a single JSON object containing a key "questions" which is an array of the structured question objects.`;

        const msPrompt = `You are an expert AI assistant specializing in parsing educational documents. Your task is to analyze the text of a Cambridge International A-Level Mathematics (9709) mark scheme and extract the marking instructions for each question into a structured JSON format.

Please adhere to the following rules for parsing:
1.  **Identify Answers**: Scan the document to locate the answer or marking scheme for each question number.
2.  **Extract Key Information**: For each question, extract the following details:
    *   'questionNumber': The integer number of the question.
    *   'answer': The detailed breakdown of the mark allocation and correct steps for that question. Capture all relevant text, including method marks (M1), accuracy marks (A1), etc.
3.  **Output Format**: Return the result as a single JSON object containing a key "solutions" which is an array of the structured solution objects.`;

        // --- Step 3: Send text to AI for parsing ---
        console.log('\n--- Sending QP text to AI for parsing ---');
        const qpResult = await parseWithAI(qpText, qpPrompt);
        
        console.log('\n--- Sending MS text to AI for parsing ---');
        const msResult = await parseWithAI(msText, msPrompt);

        // --- Step 4: Display Results ---
        console.log('\n\n--- AI Parsed Question Paper ---');
        console.log(JSON.stringify(qpResult, null, 2));
        console.log('------------------------------------');

        console.log('\n\n--- AI Parsed Mark Scheme ---');
        console.log(JSON.stringify(msResult, null, 2));
        console.log('---------------------------------');

        console.log('\n--- Test Finished ---');

    } catch (error) {
        console.error('\nAn error occurred during the test run:', error.message);
    }
}

testPdfAndAiParsing();
