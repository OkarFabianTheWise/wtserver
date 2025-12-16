import { OpenAI } from 'openai';
import { config } from 'dotenv';
config();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
export async function generateTitle(script) {
    try {
        const prompt = `Generate a concise, descriptive title (max 8 words) for this code snippet. Focus on what the code does or demonstrates:

${script}

Respond with only the title, no quotes or extra text.`;
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You generate concise, descriptive titles for code snippets. Keep them under 8 words and focus on functionality."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 20
        });
        const title = response.choices[0].message.content?.trim() || 'Code Tutorial';
        return title.length > 50 ? title.substring(0, 47) + '...' : title;
    }
    catch (error) {
        console.error('Error generating title:', error);
        return 'Code Tutorial';
    }
}
export async function analyzeCode(code) {
    const prompt = `Explain the following code as a tutorial for beginners. Include step-by-step reasoning and note the language:

\n\n\`\`\`
${code}
\`\`\``;
    const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
    });
    const response = completion.choices[0].message.content || '';
    return {
        tutorialText: response.trim(),
        language: 'typescript', // optionally detect via code parsing
    };
}
export async function enhanceScript(script, customPrompt) {
    try {
        let prompt;
        if (customPrompt && customPrompt.trim()) {
            // Use the custom prompt provided by the user
            prompt = `${customPrompt}

Code to analyze:
${script}`;
        }
        else {
            // Use the default prompt for scrolling tutorial
            prompt = `
Explain this code in small, natural segments that can be shown on screen. Format your response as segments separated by [PAUSE] markers. Each segment should be 1-2 sentences that explain what's visible on screen at that moment. The video will scroll to show new code only after each segment is narrated.

For example:
"The first line imports the OpenAI client from the openai package, which we'll use to interact with GPT-4. [PAUSE]
Next, we import the config function from dotenv to handle our environment variables. [PAUSE]"

Keep each segment focused and concise. The video will scroll to reveal new code only after each [PAUSE].

Here's the code to explain:

${script}
    `;
        }
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: customPrompt && customPrompt.trim()
                        ? "You are a helpful assistant that answers questions about code. Provide clear, accurate explanations."
                        : "You are a code narrator creating synchronized voice-over for a scrolling code tutorial. Break your explanation into small segments marked with [PAUSE]. Each segment should match what's visible on screen at that moment. Never use phrases like 'as we can see' or 'looking at'. Just explain directly."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: customPrompt && customPrompt.trim() ? 0.3 : 0.3,
            max_tokens: 1500
        });
        return response.choices[0].message.content?.trim() || '';
    }
    catch (error) {
        console.error('Error enhancing script:', error);
        return '';
    }
}
// Alternative version with even more specific constraints
export async function enhanceScriptDirect(script) {
    try {
        const prompt = `
Narrate this code. Start with the first line and explain what's happening:

${script}
    `;
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "Narrate code directly. No introductions like 'This code does...' or 'Let's look at...'. Start immediately with 'Here we're importing...' or 'This line creates...' etc."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.2, // Very low for consistent behavior
            max_tokens: 1000
        });
        return response.choices[0].message.content?.trim() || '';
    }
    catch (error) {
        console.error('Error enhancing script:', error);
        return '';
    }
}
export async function generateNarrativeStoryboard(script) {
    try {
        const prompt = `
You are a storytelling assistant for educational tutorials. 

Input: technical content (code snippet, blockchain concept, or system description).
Output: a narrative short story that explains the concept using simple 2D characters, objects, or shapes, you can use market scenerios, simple kids game scenerio, dad and mum joke scenerios to make it simple to understand.

Guidelines:
- Use stick-figure or simple shapes as characters (circles for heads, lines for bodies, etc).
- Describe visual actions (e.g., "three market women write in their ledgers; lines connect the books to show consensus").
- Include labels or simple props to clarify concepts.
- Divide the story into sequential scenes (5-8 scenes max).
- Keep each scene description concise, 1-2 sentences maximum.
- For each scene, provide both a visual description and narration.
- Emphasize cause-and-effect so a learner can follow the concept.
- Each scene should take about 3 seconds to display.

Respond with ONLY valid JSON in this exact format:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "description": "visual description of what appears on screen",
      "narration": "what the narrator says (1-2 sentences)",
      "visualElements": ["element1", "element2", ...],
      "duration": 3
    }
  ]
}

Technical content to narrate:

${script}
    `;
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a visual storytelling expert. Convert technical concepts into simple 2D animated scenes with stick figures, shapes, and props. Respond ONLY with valid JSON."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });
        const content = response.choices[0].message.content?.trim() || '{}';
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        const parsed = JSON.parse(jsonStr);
        return parsed.scenes || [];
    }
    catch (error) {
        console.error('Error generating narrative storyboard:', error);
        return [];
    }
}
//# sourceMappingURL=codeAnalyzer.js.map