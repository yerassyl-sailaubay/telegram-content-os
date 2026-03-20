/**
 * RU → EN literal translation prompt.
 *
 * Emphasizes faithful, literal translation that preserves the original
 * meaning, structure, and nuance — no adaptation or rewriting.
 */

import type { OpenRouterMessage } from "../types";

interface TranslatePromptInput {
  content: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  ru: "Russian",
  en: "English",
  uk: "Ukrainian",
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}

/**
 * Builds the message array for a literal translation request.
 * The system prompt emphasizes literal, faithful translation.
 */
export function buildTranslatePrompt(input: TranslatePromptInput): OpenRouterMessage[] {
  const sourceLang = getLanguageName(input.sourceLanguage ?? "ru");
  const targetLang = getLanguageName(input.targetLanguage ?? "en");

  return [
    {
      role: "system",
      content: `You are a professional translator specializing in literal, faithful translation from ${sourceLang} to ${targetLang}.

Your task is to produce a LITERAL translation that:
- Preserves the exact meaning of the original text
- Maintains the original sentence structure where possible
- Keeps the same tone and register
- Does NOT add, remove, or rephrase content
- Does NOT adapt for any platform or audience
- Does NOT add commentary or explanations
- Preserves any formatting (line breaks, lists, etc.)

This translation will be used as input for a separate adaptation step. Your job is ONLY to translate — accurately and literally.

Output ONLY the translated text, nothing else.`,
    },
    {
      role: "user",
      content: `Translate the following text from ${sourceLang} to ${targetLang}. Provide a literal, faithful translation only:

${input.content}`,
    },
  ];
}
