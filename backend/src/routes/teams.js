const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireSubscription } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// All team routes require premium subscription
router.use(authenticateToken);
router.use(requireSubscription('premium'));

// Get user's teams
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    res.json({ teams });

  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch teams'
    });
  }
});

// Create team (enterprise feature)
router.post('/', requireSubscription('enterprise'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    const team = await prisma.team.create({
      data: {
        name,
        description,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'owner'
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Team created successfully',
      team
    });

  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create team'
    });
  }
});

module.exports = router;