
'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/Select'

type Q = { id: string, prompt: string, options: string[], correctIndex: number, difficulty: number, word: string }

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

const WORD_BANK: Record<number, { w: string, correct: string, opts: string[] }[]> = {
  1: [
    { w: 'stol', correct: 'sittmöbel', opts: ['frukt','fisk','berg']},
    { w: 'hund', correct: 'djur', opts: ['färg','verktyg','väder']},
    { w: 'glas', correct: 'dryckeskärl', opts: ['kläder','krydda','maskin']},
    { w: 'bok', correct: 'läsning', opts: ['mat','fågel','metall']},
  ],
  2: [
    { w: 'kust', correct: 'havsnära område', opts: ['träd','maskin','stad']},
    { w: 'stjälk', correct: 'växtdel', opts: ['djurart','hushåll','kyrka']},
    { w: 'karg', correct: 'utan växtlighet', opts: ['blommande','lyxig','söt']},
    { w: 'mätt', correct: 'inte hungrig', opts: ['arg','snabb','tung']},
  ],
  3: [
    { w: 'förnuft', correct: 'tänkandets förmåga', opts: ['hunger','färg','ljud']},
    { w: 'förespråka', correct: 'tala för', opts: ['förbjuda','glömma','förkasta']},
    { w: 'skiftning', correct: 'nyans', opts: ['storm','sjukdom','frö']},
    { w: 'påtaglig', correct: 'tydlig', opts: ['hemlig','svag','sporadisk']},
  ],
  4: [
    { w: 'ambivalent', correct: 'kluven', opts: ['självklar','ointresserad','övertygad']},
    { w: 'idiosynkrasi', correct: 'särdrag', opts: ['rutin','tillfällighet','standard']},
    { w: 'prediktera', correct: 'förutsäga', opts: ['förhindra','reparera','betrakta']},
    { w: 'konciliant', correct: 'samförstående', opts: ['fientlig','arg','oberörd']},
  ],
  5: [
    { w: 'obskurantism', correct: 'mörkläggning av kunskap', opts: ['vetgirighet','öppenhet','lärdom']},
    { w: 'apokryfisk', correct: 'tvivelaktig äkthet', opts: ['äkta','laglig','enkel']},
    { w: 'epistemologi', correct: 'kunskapsteori', opts: ['växtlära','sjukdomslära','språklära']},
    { w: 'parsimonisk', correct: 'sparsam', opts: ['slösaktig','överflödig','skrymmande']},
  ],
}

function shuffle<T>(arr: T[]) { return arr.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]) }

function sampleUniqueQuestions(num=20, mix:'adaptiv'|'lätt'|'svår'='adaptiv'): Q[] {
  // build a flat pool with difficulty tags and ensure word uniqueness
  const pool: Q[] = []
  for (const d of Object.keys(WORD_BANK).map(Number)) {
    for (const q of WORD_BANK[d]) {
      const opts = shuffle([q.correct, ...q.opts])
      pool.push({ id: uid(), prompt: `Vad betyder ordet "${q.w}"?`, options: opts, correctIndex: opts.indexOf(q.correct), difficulty: d, word: q.w })
    }
  }
  // Adaptive ordering to approximate rising difficulty, then take first N unique words
  let ordered: Q[] = []
  if (mix === 'lätt') {
    ordered = pool.filter(p=>p.difficulty<=2)
  } else if (mix === 'svår') {
    ordered = pool.filter(p=>p.difficulty>=4)
  } else {
    ordered = shuffle(pool).sort((a,b)=>a.difficulty-b.difficulty)
  }
  const seen = new Set<string>()
  const out: Q[] = []
  for (const q of ordered) {
    if (seen.has(q.word)) continue
    seen.add(q.word)
    out.push(q)
    if (out.length>=num) break
  }
  // If not enough unique items (small demo bank), cycle remaining from entire pool without duplicates
  if (out.length < num) {
    for (const q of shuffle(pool)) {
      if (seen.has(q.word)) continue
      seen.add(q.word); out.push(q)
      if (out.length>=num) break
    }
  }
  return out.slice(0, num)
}

function roundToNearest(n: number, step=100) { return Math.round(n/step)*step }
function ageBaseline(age?: number) {
  if (!age) return { mean: 20000, width: 12000 }
  if (age <= 7) return { mean: 2000, width: 2000 }
  if (age <= 12) return { mean: 8000, width: 7000 }
  if (age <= 17) return { mean: 15000, width: 12000 }
  if (age <= 25) return { mean: 25000, width: 12000 }
  if (age <= 40) return { mean: 27000, width: 12000 }
  return { mean: 26000, width: 12000 }
}
function estimateVocabulary(total:number, correct:number, avgDifficulty:number, age?:number) {
  const { mean: baseMean, width: baseWidth } = ageBaseline(age)
  const accuracy = total>0 ? correct/total : 0
  const difficultyFactor = 0.9 + 0.05 * (avgDifficulty - 3)
  const weighted = Math.min(1, Math.max(0, accuracy * difficultyFactor))
  const width = baseWidth * (0.9 / Math.sqrt(Math.max(1, total / 20)))
  const mean = baseMean * (0.7 + 0.6 * weighted)
  let lo = Math.max(300, mean - width/2)
  let hi = mean + width/2
  lo = roundToNearest(lo, 100); hi = roundToNearest(hi, 100)
  return { lo, hi, mean: Math.round(mean), accuracy: Math.round(accuracy*100) }
}

function Header({ onRoute }: { onRoute: (s:string)=>void }) {
  const { data: session } = useSession()
  return (
    <div className="w-full sticky top-0 z-40 backdrop-blur bg-white/70 border-b">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <span className="text-2xl font-extrabold">ordförrådet<span className="text-indigo-600">.se</span></span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" onClick={()=>onRoute('home')}>Hem</Button>
          <Button variant="ghost" onClick={()=>onRoute('quiz')}>Starta test</Button>
          <Button variant="ghost" onClick={()=>onRoute('progress')}>Utveckling</Button>
          {!session?.user ? (
            <Button onClick={()=>onRoute('login')}>Logga in</Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm muted hidden sm:block">{session.user.name} {(session.user as any).age ? `(${(session.user as any).age})` : ''}</span>
              <Button variant="secondary" onClick={()=>signOut()}>Logga ut</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Home({ onRoute }: { onRoute: (r:string)=>void }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Testa ditt ordförråd</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p>Svara på 20–100 ordförståelsefrågor. Baserat på antal rätt, svårighetsgrad och ålder beräknar vi ett troligt intervall.</p>
          <Button onClick={()=>onRoute('quiz')}>Starta test</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Se utveckling över tid</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p>Dina resultat sparas i databasen (SQLite i utveckling). Följ kurvan och exportera data.</p>
          <Button variant="secondary" onClick={()=>onRoute('progress')}>Visa grafer</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function Login({ onDone }: { onDone: ()=>void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [age, setAge] = useState<number>(16)
  const [password, setPassword] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = await signIn('credentials', { redirect: false, name, email, age, password })
    if (!res?.error) onDone()
    else alert('Inloggning misslyckades: ' + res.error)
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader><CardTitle>Logga in / Skapa konto</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div><label>Namn</label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="För- och efternamn" /></div>
          <div><label>E-post</label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="namn@example.com" /></div>
          <div><label>Ålder</label><Input type="number" min={5} max={100} value={age} onChange={e=>setAge(Number(e.target.value))} /></div>
          <div><label>Lösenord (valfritt)</label><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••" /></div>
          <div className="flex gap-2"><Button type="submit">Fortsätt</Button></div>
        </form>
      </CardContent>
    </Card>
  )
}

function Quiz({ onFinish }: { onFinish: (r:any)=>void }) {
  const { data: session } = useSession()
  const [numQuestions, setNumQuestions] = useState(20)
  const [mix, setMix] = useState<'adaptiv'|'lätt'|'svår'>('adaptiv')
  const [started, setStarted] = useState(false)
  const [qIndex, setQIndex] = useState(0)
  const [questions, setQuestions] = useState<Q[]>([])
  const [answers, setAnswers] = useState<Record<number, number|undefined>>({})

  function start() {
    const qs = sampleUniqueQuestions(numQuestions, mix)
    setQuestions(qs); setAnswers({}); setQIndex(0); setStarted(true)
  }
  function answer(idx:number) {
    setAnswers(a=>({ ...a, [qIndex]: idx }))
    setTimeout(()=> setQIndex(i=> Math.min(i+1, questions.length-1)), 200)
  }
  async function finish() {
    const total = questions.length
    let correct = 0; let sumD = 0
    questions.forEach((q,i)=> { if (answers[i] === q.correctIndex) correct++; sumD += q.difficulty })
    const avgDifficulty = sumD / Math.max(1, total)
    const est = estimateVocabulary(total, correct, avgDifficulty, (session?.user as any)?.age)
    const payload = { total, correct, avgDifficulty: Number(avgDifficulty.toFixed(2)), estMean: est.mean, estLo: est.lo, estHi: est.hi }
    // Save to DB
    await fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    onFinish({ ...payload, accuracy: Math.round((correct/total)*100) })
  }

  if (!started) {
    return (
      <Card>
        <CardHeader><CardTitle>Ställ in test</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <label>Antal frågor</label>
              <Input type="number" min={20} max={100} value={numQuestions} onChange={e=>setNumQuestions(Number(e.target.value))} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <label>Svårighetsmix</label>
              <Select value={mix} onChange={(e:any)=>setMix(e.target.value)}>
                <SelectItem value="adaptiv">Adaptiv (ökande svårighet)</SelectItem>
                <SelectItem value="lätt">Lätt</SelectItem>
                <SelectItem value="svår">Svår</SelectItem>
              </Select>
            </div>
          </div>
          <Button onClick={start}>Starta</Button>
        </CardContent>
      </Card>
    )
  }

  const q = questions[qIndex]
  const answered = answers[qIndex] !== undefined
  const isLast = qIndex === questions.length - 1
  const progress = Math.round((qIndex / questions.length) * 100)

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-indigo-100"><div className="h-full bg-indigo-600" style={{ width: `${progress}%` }} /></div>
      <CardHeader><CardTitle>Fråga {qIndex+1} / {questions.length} <span className="text-sm muted">(Svårighet {q.difficulty})</span></CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-lg font-medium">{q.prompt}</motion.div>
        <div className="grid gap-2">
          {q.options.map((opt, i) => {
            const chosen = answers[qIndex] === i
            const correct = i === q.correctIndex
            const showFeedback = answered
            const variant = showFeedback ? (correct ? 'primary' : chosen ? 'destructive' : 'outline') : 'outline'
            return (
              <Button key={i} variant={variant} className="justify-start" onClick={()=>answer(i)} disabled={answered}>{opt}</Button>
            )
          })}
        </div>
        <div className="flex justify-between items-center pt-2">
          <div className="text-sm muted">Svarade: {Object.keys(answers).length} / {questions.length}</div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={()=>setQIndex(i=>Math.max(0, i-1))} disabled={qIndex===0}>Föregående</Button>
            {!isLast && <Button onClick={()=>setQIndex(i=>Math.min(questions.length-1, i+1))}>Nästa</Button>}
            {isLast && <Button onClick={finish}>Avsluta & beräkna</Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ResultsView({ result, onNew }: { result: any, onNew: ()=>void }) {
  if (!result) return null
  const { total, correct, avgDifficulty, estLo, estHi, estMean } = result
  return (
    <Card>
      <CardHeader><CardTitle>Ditt resultat</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-indigo-50 rounded-xl">
            <div className="text-sm text-indigo-700">Rätt svar</div>
            <div className="text-3xl font-bold">{correct} / {total} <span className="text-base muted">({Math.round((correct/total)*100)}%)</span></div>
            <div className="text-sm muted">Snittsvårighet: {avgDifficulty}</div>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl">
            <div className="text-sm text-emerald-700">Uppskattat ordförråd</div>
            <div className="text-3xl font-bold">{estLo} – {estHi} ord</div>
            <div className="text-sm muted">(mittvärde ~{estMean})</div>
          </div>
        </div>
        <div className="flex gap-2"><Button onClick={onNew}>Gör om test</Button></div>
      </CardContent>
    </Card>
  )
}

function Progress() {
  const [data, setData] = useState<any[]>([])
  useEffect(()=>{
    fetch('/api/results').then(r=> r.ok ? r.json() : []).then(setData).catch(()=>{})
  }, [])
  const hasData = data && data.length>0
  return (
    <Card>
      <CardHeader><CardTitle>Utveckling över tid</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {!hasData && <p className="muted">Inga resultat ännu. Gör ett test så visas grafer här.</p>}
        {hasData && (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.map((r:any)=>({ ts: r.createdAt.slice(0,10), mean: r.estMean }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ts" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="mean" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function App() {
  const [route, setRoute] = useState<'home'|'login'|'quiz'|'results'|'progress'>('home')
  const [lastResult, setLastResult] = useState<any>(null)
  const { data: session } = useSession()

  return (
    <div className="min-h-screen">
      <Header onRoute={setRoute} />
      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <AnimatePresence mode="wait">
          {route === 'home' && (<motion.div key="home" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Home onRoute={setRoute} />
          </motion.div>)}
          {route === 'login' && (<motion.div key="login" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {session?.user ? (
              <Card><CardHeader><CardTitle>Du är inloggad</CardTitle></CardHeader><CardContent><Button onClick={()=>setRoute('quiz')}>Gå till test</Button></CardContent></Card>
            ) : (
              <Login onDone={()=>setRoute('home')} />
            )}
          </motion.div>)}
          {route === 'quiz' && (<motion.div key="quiz" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {session?.user ? <Quiz onFinish={(r)=>{ setLastResult(r); setRoute('results') }} /> : (
              <Card><CardHeader><CardTitle>Du behöver logga in</CardTitle></CardHeader><CardContent><Button onClick={()=>setRoute('login')}>Logga in</Button></CardContent></Card>
            )}
          </motion.div>)}
          {route === 'results' && (<motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <ResultsView result={lastResult} onNew={()=>setRoute('quiz')} />
          </motion.div>)}
          {route === 'progress' && (<motion.div key="progress" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {session?.user ? <Progress /> : <Card><CardHeader><CardTitle>Du behöver logga in</CardTitle></CardHeader><CardContent><Button onClick={()=>setRoute('login')}>Logga in</Button></CardContent></Card>}
          </motion.div>)}
        </AnimatePresence>

        <Card>
          <CardHeader><CardTitle>Tekniskt</CardTitle></CardHeader>
          <CardContent className="text-sm muted space-y-2">
            <p>Denna version använder Next.js (App Router), NextAuth Credentials, Prisma (SQLite) och Tailwind.</p>
            <p>Kör lokalt: <code>npm install</code> → <code>npm run db:push</code> → <code>npm run dev</code>.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
