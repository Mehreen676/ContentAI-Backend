import { Router, Request, Response } from 'express'
import prisma from '../db'

const router = Router()

// GET /api/content?userId=xxx&type=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, type } = req.query

    if (!userId) {
      res.status(400).json({ error: 'userId is required' })
      return
    }

    const where: Record<string, string> = { userId: userId as string }
    if (type) where.type = type as string

    const contents = await prisma.content.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })

    res.json({ contents })
  } catch (error) {
    console.error('Content fetch error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/content/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const content = await prisma.content.findUnique({ where: { id: req.params.id } })
    if (!content) {
      res.status(404).json({ error: 'Content not found' })
      return
    }
    res.json({ content })
  } catch (error) {
    console.error('Content fetch error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/content
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, title, type, body, tone, metadata, isFavorite } = req.body

    if (!userId || !title || !type || !body) {
      res.status(400).json({ error: 'userId, title, type, and body are required' })
      return
    }

    const content = await prisma.content.create({
      data: {
        userId,
        title,
        type,
        body,
        tone: tone || 'professional',
        metadata: metadata || '{}',
        isFavorite: isFavorite || false,
      },
    })

    res.status(201).json({ content })
  } catch (error) {
    console.error('Content create error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/content/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const content = await prisma.content.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json({ content })
  } catch (error) {
    console.error('Content update error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/content/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.content.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Content delete error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
