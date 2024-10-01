import { OpenAI } from 'ai/openai'
import { Copilot } from '@/components/copilot'
import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { ExperimentalMessage, experimental_streamObject } from 'ai'
import { PartialInquiry, inquirySchema } from '@/lib/schema/inquiry'

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

export async function inquire(
  uiStream: ReturnType<typeof createStreamableUI>,
  messages: ExperimentalMessage[]
) {
  const openai = new OpenAI({
    baseUrl: process.env.OPENAI_API_BASE,
    apiKey: process.env.OPENAI_API_KEY,
    organization: ''
  });
  
  const objectStream = createStreamableValue<PartialInquiry>();
  uiStream.update(<Copilot inquiry={objectStream.value} />);

  let finalInquiry: PartialInquiry = {};
  await experimental_streamObject({
    model: openai.chat(process.env.OPENAI_API_MODEL || 'gpt-4o-mini'),
    system: `Hello, ChatGPT. From now on, you will act as "ECHOS" ...`, // Your existing system message here
    messages,
    schema: inquirySchema
  })
    .then(async result => {
      for await (const obj of result.partialObjectStream) {
        objectStream.update(obj);
        finalInquiry = obj;

        // Check if user requested contact information
        if (obj.userRequest) {
          const contacts = await fetchContactInfo(obj.userRequest);
          if (contacts && contacts.length > 0) {
            // Respond with the contact information
            console.log(`Contact found: ${contacts[0].name}, ${contacts[0].emails.join(', ')}, ${contacts[0].phones.join(', ')}`);
          } else {
            console.log("No contact found for the given request.");
          }
        }
      }
    })
    .finally(() => {
      objectStream.done();
    });

  return finalInquiry;
}
