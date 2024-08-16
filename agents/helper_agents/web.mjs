import { chromium } from 'playwright'
import { z } from 'zod'
import { openai, createOpenAI } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import LLMScraper from 'llm-scraper'
// Launch a browser instance
const browser = await chromium.launch()

// Initialize LLM provider
const llm = anthropic('claude-3-5-sonnet-20240620')

// Create a new LLMScraper
const scraper = new LLMScraper(llm)
const q="how do i use the openai chat completions api"
// Open new page
const page = await browser.newPage()
await page.goto('https://google.com/search?hl=en&q='+q)

// Define schema to extract contents into
const schema = z.object({
  search_results: z.array(
    z.object({
      title: z.string(),
      desc: z.string(),
      link: z.string(),
    })
  ).length(3).describe("Top 3 results: "+q)
})


// Generate code and run it on the page

const { data } = await scraper.run(page, schema, {format: "markdown"})
console.log('data', data)

const s = data.search_results[0].link  
await page.goto(s)
const page_schema=z.object({
  contents: z.object({useful_text: z.string()}).describe("The semantically useful text on the page")
})

const {scraped} = await scraper.run(page, schema, {format: "markdown"})
console.log(scraped)

const messages=[{role:"user", content: `Based on the context, answer the question. <question>${q}</question><context>${scraped.contents}</context>`}]

console.log(JSON.stringify(messages))

await page.close()
await browser.close()