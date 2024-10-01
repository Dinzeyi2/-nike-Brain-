import { ExperimentalMessage, experimental_generateObject } from 'ai'
import { OpenAI } from 'ai/openai'
import { nextActionSchema } from '../schema/next-action'

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

// Decide whether inquiry is required for the user input
export async function taskManager(messages: ExperimentalMessage[]) {
  const openai = new OpenAI({
    baseUrl: process.env.OPENAI_API_BASE, // optional base URL for proxies etc.
    apiKey: process.env.OPENAI_API_KEY, // optional API key, default to env property OPENAI_API_KEY
    organization: '' // optional organization
  });

  try {
    const result = await experimental_generateObject({
      model: openai.chat(process.env.OPENAI_API_MODEL || 'gpt-4o-mini'),
      system: `Hello, ChatGPT. From now on, you will act as "ECHOS" which means "Master of all investor contact " ...`, // Your existing system message here
      messages,
      schema: nextActionSchema
    });

    // Example of how to check and fetch contact information
    if (result.userRequest) {
      const contacts = await fetchContactInfo(result.userRequest);
      if (contacts && contacts.length > 0) {
        // Respond with the contact information
        console.log(`Contact found: ${contacts[0].name}, ${contacts[0].emails.join(', ')}, ${contacts[0].phones.join(', ')}`);
      } else {
        console.log("No contact found for the given request.");
      }
    }

    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
}
