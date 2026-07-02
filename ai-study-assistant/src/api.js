/**
 * AI Study Assistant - Gemini API Handler
 * Handles client-side fetch requests to the official Google Gemini API using local state keys.
 */

const STORAGE_KEY = 'ai_study_assistant_gemini_key';

/**
 * Retrieve the saved Gemini API key from localStorage
 */
export function getGeminiApiKey() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

/**
 * Save the Gemini API key to localStorage
 */
export function setGeminiApiKey(key) {
  if (key) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Check if the Gemini API key is configured
 */
export function hasGeminiApiKey() {
  // Since we've integrated our robust Express backend with automatic fallback to the platform's
  // server-side process.env.GEMINI_API_KEY, AI capabilities are always available.
  return true;
}

/**
 * Send a generation prompt to the Gemini API via our secure full-stack backend
 * @param {string} prompt - The user or template prompt
 * @param {string} [systemInstruction] - Optional instruction guiding model persona
 * @param {boolean} [jsonMode] - Optional flag requesting a structured JSON response
 */
export async function generateStudyContent(prompt, systemInstruction = '', jsonMode = false) {
  const customKey = getGeminiApiKey();

  const requestBody = {
    prompt,
    systemInstruction,
    jsonMode
  };

  const headers = {
    'Content-Type': 'application/json'
  };

  if (customKey && !customKey.includes('•')) {
    headers['X-Custom-Gemini-Key'] = customKey;
  }

  // Implement clear timeout capability
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds timeout for server-side processing

  try {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || response.statusText || 'SERVER_ERROR';
      
      if (errorMsg === 'INVALID_API_KEY' || errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API_KEY_MISSING')) {
        throw new Error('INVALID_API_KEY');
      } else if (errorMsg === 'RATE_LIMIT_EXCEEDED') {
        throw new Error('RATE_LIMIT_EXCEEDED');
      } else {
        throw new Error(`API_ERROR: ${errorMsg}`);
      }
    }

    const data = await response.json();
    const resultText = data?.text;

    if (!resultText) {
      throw new Error('EMPTY_RESPONSE');
    }

    return resultText;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    throw error;
  }
}
