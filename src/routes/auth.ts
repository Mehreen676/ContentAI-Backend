import { Router, Request, Response } from 'express'
import prisma from '../db'

const router = Router()

// GET /api/auth - Get all users (for testing)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, plan: true, createdAt: true } })
    res.json({ users })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(400).json({ error: 'Email already exists' })
      return
    }

    const user = await prisma.user.create({
      data: { email, name: name || email.split('@')[0], plan: 'free' },
    })

    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan } })
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan } })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
