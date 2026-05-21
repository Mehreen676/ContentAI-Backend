// Simple in-memory storage for Vercel serverless deployment
// Data persists during the lifetime of the serverless function container
// For production, replace with PostgreSQL (Supabase, Neon, PlanetScale)

interface User {
  id: string
  email: string
  name: string
  plan: string
  createdAt: string
}

interface Content {
  id: string
  userId: string
  title: string
  type: string
  body: string
  tone: string
  metadata: string
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

// Global storage - persists across requests in the same serverless instance
const globalForStorage = globalThis as unknown as {
  users: Map<string, User>
  contents: Map<string, Content>
}

if (!globalForStorage.users) {
  globalForStorage.users = new Map()
  globalForStorage.contents = new Map()
}

const users = globalForStorage.users
const contents = globalForStorage.contents

let idCounter = 1
function generateId(): string {
  return `id_${Date.now()}_${idCounter++}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const pathParam = req.query.path
  const route = Array.isArray(pathParam) ? pathParam.join('/') : (pathParam as string) || ''
  const segments = route.split('/').filter(Boolean)

  try {
    // Health check
    if (route === 'health') {
      res.json({
        status: 'ok',
        service: 'ContentAI Backend API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        storage: 'in-memory',
        stats: { users: users.size, contents: contents.size },
      })
      return
    }

    // Auth routes
    if (route === 'auth' || route.startsWith('auth/')) {
      if (req.method === 'POST' && segments[1] === 'signup') {
        const email = req.body.email as string
        const password = req.body.password as string
        const name = req.body.name as string
        if (!email || !password) { res.status(400).json({ error: 'Email and password are required' }); return }
        const existing = [...users.values()].find(u => u.email === email)
        if (existing) { res.status(400).json({ error: 'Email already exists' }); return }
        const id = generateId()
        const user: User = { id, email, name: name || email.split('@')[0], plan: 'free', createdAt: new Date().toISOString() }
        users.set(id, user)
        res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan } })
        return
      }
      if (req.method === 'POST' && segments[1] === 'login') {
        const email = req.body.email as string
        const password = req.body.password as string
        if (!email || !password) { res.status(400).json({ error: 'Email and password are required' }); return }
        const user = [...users.values()].find(u => u.email === email)
        if (!user) { res.status(404).json({ error: 'User not found' }); return }
        res.json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan } })
        return
      }
      if (req.method === 'GET') {
        const allUsers = [...users.values()].map(({ id, email, name, plan }) => ({ id, email, name, plan }))
        res.json({ users: allUsers })
        return
      }
    }

    // Content routes
    if (route === 'content' || route.startsWith('content/')) {
      if (req.method === 'GET' && segments.length === 1) {
        const userId = req.query.userId as string
        const type = req.query.type as string | undefined
        if (!userId) { res.status(400).json({ error: 'userId is required' }); return }
        let userContents = [...contents.values()].filter(c => c.userId === userId)
        if (type) userContents = userContents.filter(c => c.type === type)
        userContents.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        res.json({ contents: userContents })
        return
      }
      if (req.method === 'GET' && segments[1]) {
        const content = contents.get(segments[1])
        if (!content) { res.status(404).json({ error: 'Content not found' }); return }
        res.json({ content })
        return
      }
      if (req.method === 'POST' && segments.length === 1) {
        const userId = req.body.userId as string
        const title = req.body.title as string
        const type = req.body.type as string
        const body = req.body.body as string
        const tone = (req.body.tone as string) || 'professional'
        const metadata = (req.body.metadata as string) || '{}'
        const isFavorite = (req.body.isFavorite as boolean) || false
        if (!userId || !title || !type || !body) { res.status(400).json({ error: 'userId, title, type, and body are required' }); return }
        const id = generateId()
        const now = new Date().toISOString()
        const content: Content = { id, userId, title, type, body, tone, metadata, isFavorite, createdAt: now, updatedAt: now }
        contents.set(id, content)
        res.status(201).json({ content })
        return
      }
      if (req.method === 'PUT' && segments[1]) {
        const existing = contents.get(segments[1])
        if (!existing) { res.status(404).json({ error: 'Content not found' }); return }
        const updated = { ...existing, ...req.body, id: existing.id, updatedAt: new Date().toISOString() }
        contents.set(segments[1], updated)
        res.json({ content: updated })
        return
      }
      if (req.method === 'DELETE' && segments[1]) {
        contents.delete(segments[1])
        res.json({ success: true })
        return
      }
    }

    // AI routes
    if (route.startsWith('ai/')) {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      if (req.method === 'POST' && segments[1] === 'generate') {
        const type = req.body.type as string
        const topic = req.body.topic as string
        const tone = req.body.tone as string | undefined
        const keywords = req.body.keywords as string | undefined
        const platform = req.body.platform as string | undefined
        const targetAudience = req.body.targetAudience as string | undefined
        const wordCount = req.body.wordCount as number | undefined
        const additionalInstructions = req.body.additionalInstructions as string | undefined

        if (!type || !topic) { res.status(400).json({ error: 'type and topic are required' }); return }

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

        res.json({ content: completion.choices[0]?.message?.content || '' })
        return
      }

      if (req.method === 'POST' && segments[1] === 'improve') {
        const content = req.body.content as string
        const action = req.body.action as string
        const tone = req.body.tone as string | undefined
        const instructions = req.body.instructions as string | undefined
        if (!content || !action) { res.status(400).json({ error: 'content and action are required' }); return }

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

        res.json({ content: completion.choices[0]?.message?.content || '' })
        return
      }
    }

    res.status(404).json({ error: 'Route not found' })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) })
  }
}
