
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const credentialsSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  age: z.coerce.number().optional(),
  password: z.string().min(1).optional(),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Demo inloggning',
      credentials: {
        name: { label: 'Namn', type: 'text' },
        email: { label: 'E-post', type: 'email' },
        age: { label: 'Ålder', type: 'number' },
        password: { label: 'Lösenord (valfritt)', type: 'password' },
      },
      async authorize(creds) {
        const parsed = credentialsSchema.safeParse(creds)
        if (!parsed.success) return null
        const { email, name, age, password } = parsed.data
        let user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          const hashed = password ? await bcrypt.hash(password, 10) : null
          user = await prisma.user.create({
            data: { email, name: name ?? 'Elev', age: age ?? 16, password: hashed ?? undefined },
          })
        } else if (password && user.password) {
          const ok = await bcrypt.compare(password, user.password)
          if (!ok) return null
        }
        return { id: user.id, email: user.email, name: user.name, age: user.age } as any
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as any).id
        token.age = (user as any).age
      }
      return token
    },
    async session({ session, token }) {
      (session as any).user.id = token.userId as string
      ;(session as any).user.age = token.age as number | undefined
      return session
    }
  }
})
