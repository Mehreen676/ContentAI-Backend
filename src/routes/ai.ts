import { Router, Request, Response } from 'express'
import ZAI from 'z-ai-web-dev-sdk'

const router = Router()

// POST /api/ai/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { type, topic, tone, keywords, platform, targetAudience, wordCount, additionalInstructions } = req.body

    if (!type || !topic) {
      res.status(400).json({ error: 'type and topic are required' })
      return
    }

    const zai = await ZAI.create()

    let systemPrompt = ''
    let userPrompt = ''

    const toneInstruction = `Write in a ${tone || 'professional'} tone.`
    const keywordsInstruction = keywords ? `Include these keywords naturally: ${keywords}.` : ''
    const audienceInstruction = targetAudience ? `Target audience: ${targetAudience}.` : ''
    const wordCountInstruction = wordCount ? `Aim for approximately ${wordCount} words.` : ''
    const extraInstructions = additionalInstructions ? `Additional instructions: ${additionalInstructions}.` : ''

    switch (type) {
      case 'blog':
        systemPrompt = 'You are an expert content writer and SEO specialist. Write engaging, well-structured blog posts that are informative and optimized for search engines.'
        userPrompt = `Write a comprehensive blog post about "${topic}". ${toneInstruction} ${keywordsInstruction} ${audienceInstruction} ${wordCountInstruction} ${extraInstructions}\n\nStructure with: attention-grabbing title, engaging introduction, well-organized sections with subheadings, actionable takeaways, compelling conclusion with CTA.`
        break
      case 'social':
        systemPrompt = 'You are a social media expert who creates viral, engaging content.'
        const platformContext = platform ? `Platform: ${platform}.` : 'Platform: General social media.'
        userPrompt = `Create social media content about "${topic}". ${platformContext} ${toneInstruction} ${keywordsInstruction} ${extraInstructions}\n\nGenerate: 3 post variations (short, medium, long), relevant hashtags, CTA, appropriate emoji usage.`
        break
      case 'ad':
        systemPrompt = 'You are a master copywriter specializing in advertising. Write compelling ad copy that converts.'
        userPrompt = `Write high-converting ad copy for "${topic}". ${toneInstruction} ${keywordsInstruction} ${audienceInstruction} ${extraInstructions}\n\nCreate 3 variations using AIDA, PAS, and BAB frameworks. Each with: powerful headline, body copy, CTA, key benefits.`
        break
      case 'email':
        systemPrompt = 'You are an email marketing expert who writes high-converting email sequences.'
        userPrompt = `Write a professional email about "${topic}". ${toneInstruction} ${keywordsInstruction} ${audienceInstruction} ${extraInstructions}\n\nInclude: 3 subject line options, preview text, email body, CTA, sign-off.`
        break
      case 'product':
        systemPrompt = 'You are an expert product description writer who creates compelling, conversion-focused copy.'
        userPrompt = `Write a compelling product description for "${topic}". ${toneInstruction} ${keywordsInstruction} ${audienceInstruction} ${extraInstructions}\n\nInclude: headline, opening statement, features and benefits (5+), social proof, specifications, CTA.`
        break
      case 'seo':
        systemPrompt = 'You are an SEO content specialist who writes content that ranks.'
        userPrompt = `Create SEO-optimized content for "${topic}". ${toneInstruction} ${keywordsInstruction} ${audienceInstruction} ${extraInstructions}\n\nGenerate: SEO title tag (under 60 chars), meta description (under 160 chars), heading suggestions, optimized body content, internal linking suggestions.`
        break
      default:
        systemPrompt = 'You are an expert content writer. Write high-quality, engaging content.'
        userPrompt = `Write content about "${topic}". ${toneInstruction} ${keywordsInstruction} ${extraInstructions}`
    }

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    })

    const generatedContent = completion.choices[0]?.message?.content || ''

    res.json({ content: generatedContent })
  } catch (error) {
    console.error('AI generation error:', error)
    res.status(500).json({ error: 'Failed to generate content' })
  }
})

// POST /api/ai/improve
router.post('/improve', async (req: Request, res: Response) => {
  try {
    const { content, action, tone, instructions } = req.body

    if (!content || !action) {
      res.status(400).json({ error: 'content and action are required' })
      return
    }

    const zai = await ZAI.create()

    let systemPrompt = 'You are an expert content editor and copywriter. Improve the given content while maintaining its core message and purpose.'
    let userPrompt = ''

    switch (action) {
      case 'improve':
        userPrompt = `Improve the following content. Make it more engaging, clear, and impactful. ${tone ? `Adjust the tone to be more ${tone}.` : ''} ${instructions ? `Additional instructions: ${instructions}` : ''}\n\nContent:\n${content}`
        break
      case 'rewrite':
        userPrompt = `Completely rewrite the following content with fresh language and structure while keeping the same message. ${tone ? `Use a ${tone} tone.` : ''} ${instructions ? `Additional instructions: ${instructions}` : ''}\n\nContent:\n${content}`
        break
      case 'expand':
        userPrompt = `Expand the following content by adding more details, examples, and depth. ${tone ? `Maintain a ${tone} tone.` : ''} ${instructions ? `Additional instructions: ${instructions}` : ''}\n\nContent:\n${content}`
        break
      case 'shorten':
        userPrompt = `Shorten the following content while keeping the key message intact. Remove any fluff or redundancy. ${instructions ? `Additional instructions: ${instructions}` : ''}\n\nContent:\n${content}`
        break
      case 'grammar':
        userPrompt = `Fix all grammar, spelling, and punctuation errors in the following content. Also improve sentence structure where needed.\n\nContent:\n${content}`
        break
      default:
        userPrompt = `Improve the following content:\n\n${content}`
    }

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    })

    const improvedContent = completion.choices[0]?.message?.content || ''

    res.json({ content: improvedContent })
  } catch (error) {
    console.error('AI improve error:', error)
    res.status(500).json({ error: 'Failed to improve content' })
  }
})

export default router
