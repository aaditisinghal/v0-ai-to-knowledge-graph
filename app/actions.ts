"use server"

export interface Entity {
  id: string
  name: string
  type: "person" | "place" | "concept" | "organization" | "event" | "technology" | "other"
  description?: string
}

export interface Relationship {
  source: string
  target: string
  label: string
  strength: number
}

export interface KnowledgeGraphData {
  question: string
  answer: string
  entities: Entity[]
  relationships: Relationship[]
}

export async function generateKnowledgeGraph(question: string): Promise<KnowledgeGraphData> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set")
  }

  try {
    const answerResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant. Provide clear, detailed, and informative answers.",
          },
          {
            role: "user",
            content: question,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    })

    if (!answerResponse.ok) {
      throw new Error(`OpenAI API error: ${answerResponse.statusText}`)
    }

    const answerData = await answerResponse.json()
    const answer = answerData.choices[0].message.content

    const graphResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a knowledge graph extraction expert. Extract entities and their relationships from the given text.
            
Rules:
- Extract 6-12 meaningful entities (people, places, concepts, organizations, events, technologies)
- Create 8-15 relationships that show how entities connect
- Use clear, descriptive relationship labels (e.g., "invented", "located in", "part of", "influences")
- Include the question topic as an entity
- Ensure relationships form a connected graph
- Return valid JSON only`,
          },
          {
            role: "user",
            content: `Question: ${question}\n\nAnswer: ${answer}\n\nExtract entities and relationships in this exact JSON format:
{
  "entities": [
    {
      "id": "entity_1",
      "name": "Entity Name",
      "type": "concept|person|place|organization|event|technology|other",
      "description": "Brief description"
    }
  ],
  "relationships": [
    {
      "source": "entity_1",
      "target": "entity_2",
      "label": "relationship type",
      "strength": 0.8
    }
  ]
}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    })

    if (!graphResponse.ok) {
      throw new Error(`OpenAI API error: ${graphResponse.statusText}`)
    }

    const graphData = await graphResponse.json()
    const extractedGraph = JSON.parse(graphData.choices[0].message.content)

    return {
      question,
      answer,
      entities: extractedGraph.entities || [],
      relationships: extractedGraph.relationships || [],
    }
  } catch (error) {
    console.error("Error generating knowledge graph:", error)
    throw error
  }
}
