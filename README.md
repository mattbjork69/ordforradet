
# ordförrådet.se (demo)

Fullstack Next.js-app med:
- **NextAuth (Credentials)** för enkel inloggning (skapar användare vid första inloggning)
- **Prisma + SQLite** för lagring av resultat
- **Tailwind** för UI
- **Framer Motion + Recharts** för animationer och grafer

## Kom igång
```bash
npm install
cp .env.example .env
npx prisma db push
npm run dev
```
Öppna http://localhost:3000

### Inloggning
Välj valfri e-post (ny användare skapas automatiskt). Lösenord är valfritt; anges det första gången lagras det hashat och krävs därefter.

### Databas
- Prisma schema: `prisma/schema.prisma`
- SQLite-fil: `dev.db` (skapas efter `prisma db push`)

### Bygg & kör
```bash
npm run build
npm start
```
