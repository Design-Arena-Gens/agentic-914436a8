import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export async function POST(req: NextRequest) {
  try {
    const { messages, catalogData, referenceData } = await req.json()

    let systemPrompt = `You are JARVIS, an advanced personal AI agent designed to help users with:

1. Daily task management and assistance
2. E-commerce catalog management for Amazon, Flipkart, Meesho, and Myntra
3. Processing raw product data and filling catalog sheets

Key capabilities:
- Understand voice commands and text instructions
- Parse and structure product data
- Fill in missing catalog information
- Optimize product listings for different platforms
- Provide recommendations for pricing, descriptions, and categorization

When working with catalogs:
- Analyze the uploaded CSV structure
- Use reference/raw data provided by the user to fill in missing information
- Extract product details like title, description, price, category, SKU, brand, etc.
- Adapt information for platform-specific requirements (Amazon, Flipkart, Meesho, Myntra)
- Suggest improvements for SEO and conversions

Be helpful, efficient, and proactive in assisting the user.`

    if (catalogData) {
      systemPrompt += `\n\nCurrent catalog structure:\nHeaders: ${catalogData.headers.join(', ')}\nNumber of products: ${catalogData.rows.length}`
    }

    if (referenceData) {
      systemPrompt += `\n\nReference/Raw Data provided:\n${referenceData.substring(0, 2000)}`
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }))
    })

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'I apologize, I could not process that request.'

    // Process catalog updates if needed
    let updatedCatalog = null
    if (catalogData && assistantMessage.includes('CATALOG_UPDATE:')) {
      // Extract catalog update instructions from response
      // This is a simplified example - in production, you'd parse structured data
      updatedCatalog = catalogData
    }

    return NextResponse.json({
      response: assistantMessage,
      updatedCatalog
    })

  } catch (error: any) {
    console.error('Chat API Error:', error)
    return NextResponse.json({
      error: error.message || 'An error occurred processing your request'
    }, { status: 500 })
  }
}
