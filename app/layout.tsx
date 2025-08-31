
import './globals.css'
import { ReactNode } from 'react'
import { Providers } from './providers'

export const metadata = {
  title: 'ordförrådet.se',
  description: 'Testa ditt ordförråd och följ utvecklingen över tid.'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
