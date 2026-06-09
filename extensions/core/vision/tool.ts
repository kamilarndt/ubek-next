import { z } from 'zod'

export const name = 'vision'

export const description = 'Analyze an image from a URL. Returns a description of what is visible in the image.'

export const schema = z.object({
  imageUrl: z.string().url().describe('The URL of the image to analyze'),
  prompt: z.string().default('Describe this image in detail.').describe('Optional instruction for what to look for'),
})

export type Params = z.infer<typeof schema>

export async function execute(_params: Params): Promise<{ content: { type: string; text: string }[] }> {
  const params = schema.parse(_params)

  const response = `[Vision Analysis]\n\nImage URL: ${params.imageUrl}\nPrompt: ${params.prompt}\n\nNote: Vision analysis requires a multimodal model. The image URL has been captured and will be processed by the LLM during the next response.`

  return {
    content: [{ type: 'text', text: response }],
  }
}
