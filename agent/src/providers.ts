export interface ProviderConfig {
  name: string
  baseUrl: string
  apiKey: string
  model: string
}

export interface RouterProviderOptions {
  url: string
  apiKey: string
  model: string
}

export function createRouterProvider(
  options: RouterProviderOptions,
): ProviderConfig {
  return {
    name: 'router',
    baseUrl: options.url,
    apiKey: options.apiKey,
    model: options.model,
  }
}
