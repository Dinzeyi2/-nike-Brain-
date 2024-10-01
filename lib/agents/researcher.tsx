import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import {
  ExperimentalMessage,
  ToolCallPart,
  ToolResultPart,
  experimental_streamText
} from 'ai'
import { searchSchema } from '@/lib/schema/search'
import { Section } from '@/components/section'
import { OpenAI } from 'ai/openai'
import { ToolBadge } from '@/components/tool-badge'
import { SearchSkeleton } from '@/components/search-skeleton'
import { SearchResults } from '@/components/search-results'
import { BotMessage } from '@/components/message'
import Exa from 'exa-js'
import { SearchResultsImageSection } from '@/components/search-results-image'
import { Card } from '@/components/ui/card'

const APOLLO_API_KEY = '7o7_toj6urWcd1rlYsqIkA'; // Your Apollo.io API key

async function fetchContactInfo(keyword) {
  try {
    const response = await fetch('https://api.apollo.io/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': APOLLO_API_KEY,
      },
      body: JSON.stringify({
        query: `
          query GetContactInfo($keyword: String!) {
            contacts(query: $keyword) {
              name
              title
              emails
              phones
              description
            }
          }
        `,
        variables: {
          keyword: keyword,
        },
      }),
    });

    const data = await response.json();
    if (response.ok) {
      return data.contacts; // Return the list of contacts
    } else {
      throw new Error(data.error || 'Failed to fetch contacts');
    }
  } catch (error) {
    console.error('Error fetching contact info:', error);
    throw error;
  }
}

export async function researcher(
  uiStream: ReturnType<typeof createStreamableUI>,
  streamText: ReturnType<typeof createStreamableValue<string>>,
  messages: ExperimentalMessage[]
) {
  const openai = new OpenAI({
    baseUrl: process.env.OPENAI_API_BASE,
    apiKey: process.env.OPENAI_API_KEY,
    organization: ''
  });

  const searchAPI: 'tavily' | 'exa' = 'tavily'

  let fullResponse = ''
  let hasError = false
  const answerSection = (
    <Section title="Answer">
      <BotMessage content={streamText.value} />
    </Section>
  )

  const result = await experimental_streamText({
    model: openai.chat(process.env.OPENAI_API_MODEL || 'gpt-4o-mini'),
    maxTokens: 2500,
    system: `Hello, ChatGPT. From now on, you will act as "ECHOS" ...`, // Your existing system message here
    messages,
    schema: searchSchema
  });

   // Check if user requested contact information
   if (result.userRequest) {
      const contacts = await fetchContactInfo(result.userRequest);
      if (contacts && contacts.length > 0) {
        // Respond with the contact information
        console.log(`Contact found: ${contacts[0].name}, ${contacts[0].emails.join(', ')}, ${contacts[0].phones.join(', ')}`);
      } else {
        console.log("No contact found for the given request.");
      }
    }

  const toolCalls: ToolCallPart[] = []
  const toolResponses: ToolResultPart[] = []
  for await (const delta of result.fullStream) {
    switch (delta.type) {
      case 'text-delta':
        if (delta.textDelta) {
          if (fullResponse.length === 0 && delta.textDelta.length > 0) {
            uiStream.update(answerSection)
          }

          fullResponse += delta.textDelta
          streamText.update(fullResponse)
        }
        break
      case 'tool-call':
        toolCalls.push(delta)
        break
      case 'tool-result':
        toolResponses.push(delta)
        break
      case 'error':
        hasError = true
        fullResponse += `\nError occurred while executing the tool`
        break
    }
  }

  messages.push({
    role: 'assistant',
    content: [{ type: 'text', text: fullResponse }, ...toolCalls]
  })

  if (toolResponses.length > 0) {
    messages.push({ role: 'tool', content: toolResponses })
  }

  return { result, fullResponse, hasError }
}

async function tavilySearch(
  query: string,
  maxResults: number = 10,
  searchDepth: 'basic' | 'advanced' = 'basic'
): Promise<any> {
  const apiKey = process.env.TAVILY_API_KEY
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults < 5 ? 5 : maxResults,
      search_depth: searchDepth,
      include_images: true,
      include_answers: true
    })
  })

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`)
  }

  const data = await response.json()
  return data
}

async function exaSearch(query: string, maxResults: number = 10): Promise<any> {
  const apiKey = process.env.EXA_API_KEY
  const exa = new Exa(apiKey)
  return exa.searchAndContents(query, {
    highlights: true,
    numResults: maxResults
  })
}
