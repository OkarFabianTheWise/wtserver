import type { AnimationScript } from './types';

export const ANIMATION_SCRIPT_PROMPT = `
You are an animation script generator. Given an article, create a detailed animation script that will be used to generate a 2D illustrated video with voiceover.

Your output must be a JSON object with this exact structure:

{
  "totalDuration": 30000,  // Total video duration in milliseconds
  "voiceover": {
    "text": "Full narration text that explains the article...",
    "segments": [
      {
        "text": "First part of narration",
        "startTime": 0,
        "endTime": 5000,
        "sceneId": "scene_1"
      },
      {
        "text": "Second part of narration",
        "startTime": 5000,
        "endTime": 10000,
        "sceneId": "scene_2"
      }
    ]
  },
  "scenes": [
    {
      "id": "scene_1",
      "startTime": 0,
      "endTime": 5000,
      "description": "Visual description of what should be shown",
      "elements": [
        {
          "type": "shape",  // shape, icon, text, illustration
          "shape": "circle", // circle, rectangle, path, custom
          "x": 400,  // position (relative to 1920x1080 canvas)
          "y": 300,
          "width": 200,
          "height": 200,
          "color": "#3B82F6",
          "animation": {
            "type": "fadeIn",  // fadeIn, slideIn, scaleIn, drawPath, etc.
            "duration": 1000,
            "delay": 0,
            "easing": "easeOut"
          }
        },
        {
          "type": "text",
          "content": "Key Point",
          "x": 960,
          "y": 540,
          "fontSize": 48,
          "fontWeight": "bold",
          "color": "#FFFFFF",
          "align": "center",
          "animation": {
            "type": "typewriter",
            "duration": 2000,
            "delay": 500
          }
        },
        {
          "type": "icon",
          "iconName": "lightbulb",  // descriptive name
          "x": 200,
          "y": 200,
          "size": 64,
          "color": "#FCD34D",
          "animation": {
            "type": "bounce",
            "duration": 1500,
            "delay": 1000
          }
        }
      ],
      "transitions": {
        "out": {
          "type": "fadeOut",  // How this scene exits
          "duration": 500
        }
      }
    },
    {
      "id": "scene_2",
      "startTime": 5000,
      "endTime": 10000,
      "description": "Next visual concept",
      "elements": [
        {
          "type": "illustration",
          "illustrationType": "flowchart",  // flowchart, diagram, graph, infographic
          "data": {
            "nodes": [
              {"id": "A", "label": "Start", "x": 300, "y": 400},
              {"id": "B", "label": "Process", "x": 960, "y": 400},
              {"id": "C", "label": "End", "x": 1620, "y": 400}
            ],
            "edges": [
              {"from": "A", "to": "B"},
              {"from": "B", "to": "C"}
            ]
          },
          "animation": {
            "type": "sequential",  // Draw elements one by one
            "duration": 4000,
            "delay": 0
          }
        }
      ]
    }
  ],
  "style": {
    "backgroundColor": "#1F2937",
    "primaryColor": "#3B82F6",
    "secondaryColor": "#10B981",
    "accentColor": "#F59E0B",
    "fontFamily": "Inter, sans-serif",
    "theme": "modern"  // modern, minimal, playful, corporate, etc.
  }
}

IMPORTANT RULES:
1. Each voiceover segment must be perfectly synced with its scene using startTime/endTime
2. Scene durations must match voiceover segment durations exactly
3. Keep animations smooth and purposeful - only animate what supports the narration
4. Use simple, clear visual metaphors that match the spoken content
5. Avoid random or decorative animations that don't serve the narrative
6. Element positions are for 1920x1080 canvas
7. All times are in milliseconds
8. Transitions between scenes should be seamless
9. Total duration should be realistic for the content (typically 20-60 seconds)

ANIMATION TYPES AVAILABLE:
- fadeIn/fadeOut: Smooth opacity changes
- slideIn: direction (left/right/top/bottom)
- scaleIn: Grows from small to full size
- typewriter: Text appears character by character
- drawPath: SVG path draws progressively
- bounce: Gentle bounce effect
- pulse: Subtle scale pulse
- sequential: Elements appear one after another
- simultaneous: Elements animate together

ELEMENT TYPES:
- shape: Basic geometric shapes (circle, rectangle, triangle, path)
- text: Text labels, titles, body copy
- icon: Simple icons (use descriptive names)
- illustration: Complex visuals (flowcharts, diagrams, graphs, infographics)

Now, analyze this article and generate the animation script:

ARTICLE:
{ARTICLE_TEXT}

Respond ONLY with the JSON object, no other text or explanation.
`;

// Usage example:
export async function generateAnimationScript(article: string): Promise<AnimationScript> {
  const prompt = ANIMATION_SCRIPT_PROMPT.replace('{ARTICLE_TEXT}', article);

  // Call your AI model (Claude, GPT, etc.)
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
    })
  });

  const data = await response.json();
  const jsonText = data.choices[0].message.content;

  // Parse and validate
  const script: AnimationScript = JSON.parse(jsonText);

  return script;
}