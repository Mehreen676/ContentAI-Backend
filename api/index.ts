import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface RequestLike {
  method?: string
  query: Record<string, string | string[] | undefined>
  body: Record<string, unknown>
}

interface ResponseLike {
  setHeader: (key: string, value: string) => void
  status: (code: number) => ResponseLike
  json: (data: unknown) => void
  end: () => void
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const { path } = req.query
  const route = Array.isArray(path) ? path.join('/') : path || ''
  const segments = route.split('/').filter(Boolean)

  try {
    // Health check
    if (route === 'health') {
      return res.json({
        status: 'ok',
        service: 'ContentAI Backend API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      })
    }

    // Auth routes
    if (route === 'auth' || route.startsWith('auth/')) {
      if (req.method === 'POST' && segments[1] === 'signup') {
        const { email, password, name } = req.body
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) return res.status(400).json({ error: 'Email already exists' })
        const user = await prisma.user.create({ data: { email, name: name || email.split('@')[0] } })
        return res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan } })
      }
      if (req.method === 'POST' && segments[1] === 'login') {
        const { email, password } = req.body
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return res.status(404).json({ error: 'User not found' })
        return res.json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan } })
      }
      if (req.method === 'GET') {
        const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, plan: true } })
        return res.json({ users })
      }
    }

    // Content routes
    if (route === 'content' || route.startsWith('content/')) {
      // GET /api/content?userId=xxx
      if (req.method === 'GET' && segments.length === 1) {
        const { userId, type } = req.query
        if (!userId) return res.status(400).json({ error: 'userId is required' })
        const where: Record<string, string> = { userId: userId as string }
        if (type) where.type = type as string
        const contents = await prisma.content.findMany({ where, orderBy: { updatedAt: 'desc' } })
        return res.json({ contents })
      }
      // GET /api/content/:id
      if (req.method === 'GET' && segments[1]) {
        const content = await prisma.content.findUnique({ where: { id: segments[1] } })
        if (!content) return res.status(404).json({ error: 'Content not found' })
        return res.json({ content })
      }
      // POST /api/content
      if (req.method === 'POST' && segments.length === 1) {
        const { userId, title, type, body, tone, metadata, isFavorite } = req.body
        if (!userId || !title || !type || !body) return res.status(400).json({ error: 'userId, title, type, and body are required' })
        const content = await prisma.content.create({
          data: { userId, title, type, body, tone: tone || 'professional', metadata: metadata || '{}', isFavorite: isFavorite || false },
        })
        return res.status(201).json({ content })
      }
      // PUT /api/content/:id
      if (req.method === 'PUT' && segments[1]) {
        const content = await prisma.content.update({ where: { id: segments[1] }, data: req.body })
        return res.json({ content })
      }
      // DELETE /api/content/:id
      if (req.method === 'DELETE' && segments[1]) {
        await prisma.content.delete({ where: { id: segments[1] } })
        return res.json({ success: true })
      }
    }

    // AI routes
    if (route.startsWith('ai/')) {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      // POST /api/ai/generate
      if (req.method === 'POST' && segments[1] === 'generate') {
        const { type, topic, tone, keywords, platform, targetAudience, wordCount, additionalInstructions } = req.body
        if (!type || !topic) return res.status(400).json({ error: 'type and topic are required' })

        const toneInst = `Write in a ${tone || 'professional'} tone.`
        const kwInst = keywords ? `Include these keywords naturally: ${keywords}.` : ''
        const audInst = targetAudience ? `Target audience: ${targetAudience}.` : ''
        const wcInst = wordCount ? `Aim for approximately ${wordCount} words.` : ''
        const extraInst = additionalInstructions ? `Additional instructions: ${additionalInstructions}.` : ''

        const prompts: Record<string, { sys: string; user: string }> = {
          blog: { sys: 'You are an expert content writer and SEO specialist.', user: `Write a comprehensive blog post about "${topic}". ${toneInst} ${kwInst} ${audInst} ${wcInst} ${extraInst}` },
          social: { sys: 'You are a social media expert who creates viral content.', user: `Create social media content about "${topic}". Platform: ${platform || 'General'}. ${toneInst} ${kwInst} ${extraInst}. Generate 3 variations with hashtags.` },
          ad: { sys: 'You are a master copywriter specializing in advertising.', user: `Write high-converting ad copy for "${topic}". ${toneInst} ${kwInst} ${audInst} ${extraInst}. Create 3 variations using AIDA, PAS, BAB frameworks.` },
          email: { sys: 'You are an email marketing expert.', user: `Write a professional email about "${topic}". ${toneInst} ${kwInst} ${audInst} ${extraInst}. Include 3 subject lines, body, and CTA.` },
          product: { sys: 'You are an expert product description writer.', user: `Write a compelling product description for "${topic}". ${toneInst} ${kwInst} ${audInst} ${extraInst}. Include headline, features, benefits, and CTA.` },
          seo: { sys: 'You are an SEO content specialist.', user: `Create SEO-optimized content for "${topic}". ${toneInst} ${kwInst} ${audInst} ${extraInst}. Include title tag, meta description, headings, and optimized content.` },
        }

        const p = prompts[type] || { sys: 'You are an expert content writer.', user: `Write content about "${topic}". ${toneInst} ${kwInst} ${extraInst}` }

        const completion = await zai.chat.completions.create({
          messages: [{ role: 'system', content: p.sys }, { role: 'user', content: p.user }],
          temperature: 0.8,
          max_tokens: 4000,
        })

        return res.json({ content: completion.choices[0]?.message?.content || '' })
      }

      // POST /api/ai/improve
      if (req.method === 'POST' && segments[1] === 'improve') {
        const { content, action, tone, instructions } = req.body
        if (!content || !action) return res.status(400).json({ error: 'content and action are required' })

        const actionPrompts: Record<string, string> = {
          improve: `Improve the following content. Make it more engaging and impactful. ${tone ? `Adjust tone to ${tone}.` : ''} ${instructions ? `Additional: ${instructions}` : ''}`,
          rewrite: `Completely rewrite with fresh language. ${tone ? `Use ${tone} tone.` : ''} ${instructions ? `Additional: ${instructions}` : ''}`,
          expand: `Expand with more details and depth. ${tone ? `Maintain ${tone} tone.` : ''} ${instructions ? `Additional: ${instructions}` : ''}`,
          shorten: `Shorten while keeping key points. ${instructions ? `Additional: ${instructions}` : ''}`,
          grammar: `Fix all grammar, spelling, and punctuation errors. Improve sentence structure.`,
        }

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are an expert content editor. Improve content while maintaining its core message.' },
            { role: 'user', content: `${actionPrompts[action] || actionPrompts.improve}\n\nContent:\n${content}` },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        })

        return res.json({ content: completion.choices[0]?.message?.content || '' })
      }
    }

    return res.status(404).json({ error: 'Route not found' })
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  } finally {
    await prisma.$disconnect()
  }
}
