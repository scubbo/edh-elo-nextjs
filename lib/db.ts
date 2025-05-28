import { PrismaClient } from './generated/prisma'

const prisma = new PrismaClient()

export async function getGames() {
  return prisma.game.findMany({
    include: {
      winType: true,
      format: true,
      scores: {
        include: {
          deck: {
            include: {
              owner: true
            }
          }
        }
      }
    },
    orderBy: {
      date: 'desc'
    }
  })
}

export { prisma } 