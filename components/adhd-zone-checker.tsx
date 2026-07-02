'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, RotateCcw, CheckCircle2, AlertTriangle, XCircle, MinusCircle, Check, Loader2 } from 'lucide-react'

interface CheckinHistoryItem {
  id: string
  zone: Zone
  created_at: string
}

type Zone = 'green' | 'yellow' | 'red' | 'black'

const ZONE_META: Record<Zone, {
  label: string
  emoji: string
  tagline: string
  description: string
  primaryGoal: string
  study: string
  regulation: string
  ifYouPushAnyway: string
  mislabels: string[]
  bg: string
  border: string
  text: string
  headerBg: string
  headerText: string
  optionBorder: string
  optionBg: string
  optionSelected: string
  dot: string
  icon: React.ElementType
}> = {
  green: {
    label: 'Green Zone',
    emoji: '🟢',
    tagline: 'Online · Flexible',
    description: 'Your nervous system is regulated and your brain is online. This is your investment window — the time when real learning and deep work can actually happen.',
    primaryGoal: 'Bank learning. Use your capacity well without turning it into a crash.',
    study: 'Do your highest-value work: active recall, mixed questions, hard-but-doable topics. Keep it structured (timers, targets). Stop while you\'re still steady.',
    regulation: 'Maintain basics: water, protein, sunlight, short movement. Take breaks before fatigue. Leave a little fuel in the tank on purpose.',
    ifYouPushAnyway: 'Green turns into a "mystery crash": sloppy errors, irritability, then Yellow/Red later. Progress gets eaten by recovery time.',
    mislabels: [
      '"I should push harder while I\'m feeling good." — Green is the window, not an invitation to drain it.',
      '"This is just baseline, nothing special." — Green is rarer than you think for ADHD brains. Respect it.',
    ],
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    headerBg: 'bg-green-600',
    headerText: 'text-white',
    optionBorder: 'border-green-300',
    optionBg: 'bg-green-50',
    optionSelected: 'ring-2 ring-green-500 bg-green-100 border-green-400',
    dot: 'bg-green-500',
    icon: CheckCircle2,
  },
  yellow: {
    label: 'Yellow Zone',
    emoji: '🟡',
    tagline: 'Fraying · Early Warning',
    description: 'The early-warning system is activating. Pressure is rising. Your system isn\'t broken — it\'s telling you to shift gears now before it escalates to Red.',
    primaryGoal: 'Downshift early so the day stays usable. Prevent Red.',
    study: 'Shift to lighter tasks: review, pattern recognition, basics, 5–10 easy recalls, small question sets. Short cycles. Quit while it\'s still clean.',
    regulation: 'Immediate state change: water + snack, bathroom, 5–10 min walk, stretch, reduce decisions. Make the next hour smaller.',
    ifYouPushAnyway: 'You get fragmentation: more mistakes, more checking, more panic. Yellow usually flips into Red — then you lose the whole day.',
    mislabels: [
      '"I\'m being dramatic." — Yellow isn\'t drama. It\'s biology saying pressure is rising.',
      '"I just need to push through." — Pushing usually deepens it into Red.',
      '"I\'m just a bit tired." — Yellow has a specific pattern: pressure + the inner critic turning moral.',
    ],
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    headerBg: 'bg-amber-500',
    headerText: 'text-white',
    optionBorder: 'border-amber-300',
    optionBg: 'bg-amber-50',
    optionSelected: 'ring-2 ring-amber-500 bg-amber-100 border-amber-400',
    dot: 'bg-amber-400',
    icon: AlertTriangle,
  },
  red: {
    label: 'Red Zone',
    emoji: '🔴',
    tagline: 'Flooded · Hijacked',
    description: 'The system is prioritizing threat processing. You are not lazy — the brain is hijacked. Pushing through here teaches your brain to associate effort with danger.',
    primaryGoal: 'Stop pretending. Exit hijack. Restore safety and capacity.',
    study: 'Do not attempt new learning. At most: very small, low-demand tasks (organize one page, 1–3 easy recall prompts) only if it reduces intensity.',
    regulation: 'Immediate state change: leave the triggering context, reduce demands, move your body (walk), hydrate, eat, cool or warm as needed. Contact a safe person if helpful.',
    ifYouPushAnyway: 'You get "cosplay productivity": rereading, nothing sticks, more panic and checking. You usually end up in Black later (crash/shutdown).',
    mislabels: [
      '"I\'m just lazy." — Red is not laziness, it\'s hijack.',
      '"I\'ll push through." — That usually deepens it.',
      '"This is just Yellow." — Key difference: Red = near-zero encoding + escape drive.',
    ],
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    headerBg: 'bg-red-600',
    headerText: 'text-white',
    optionBorder: 'border-red-300',
    optionBg: 'bg-red-50',
    optionSelected: 'ring-2 ring-red-500 bg-red-100 border-red-400',
    dot: 'bg-red-500',
    icon: XCircle,
  },
  black: {
    label: 'Black Zone',
    emoji: '⚫',
    tagline: 'System Overload · Shutdown',
    description: 'The body\'s shutdown protocol. This is not regression or failure — it\'s containment. Your nervous system is saying: we are not spending more resources today.',
    primaryGoal: 'Survival and recovery. No performance goals.',
    study: 'No studying. Even small effort can worsen shutdown or overwhelm. Your job is basic care and nervous-system recovery.',
    regulation: 'Basics: water, food, shower, sleep, low light, low demands. Gentle movement only if it helps. One tiny task maximum (1–3 min) if it does not worsen symptoms.',
    ifYouPushAnyway: 'Black deepens: more fog, more unreality, more collapse. Recovery is what brings capacity back, not pressure.',
    mislabels: [
      '"I\'m calm, so I\'m okay." — Shutdown can look calm and feel awful.',
      '"I\'m just tired." — Black is tired + loss of basic functioning bandwidth.',
      '"I should power through to feel better." — That often deepens the crash.',
    ],
    bg: 'bg-gray-900',
    border: 'border-gray-700',
    text: 'text-gray-100',
    headerBg: 'bg-gray-950',
    headerText: 'text-gray-100',
    optionBorder: 'border-gray-600',
    optionBg: 'bg-gray-800',
    optionSelected: 'ring-2 ring-gray-400 bg-gray-700 border-gray-500',
    dot: 'bg-gray-400',
    icon: MinusCircle,
  },
}

const ZONE_ORDER: Zone[] = ['black', 'red', 'yellow', 'green']

const QUESTIONS: Array<{
  id: string
  domain: string
  question: string
  options: Record<Zone, string>
}> = [
  {
    id: 'body',
    domain: 'Body',
    question: 'How does your body feel right now?',
    options: {
      green: 'Breathing feels easy and unforced. Jaw and shoulders are mostly relaxed. Energy feels steady — not wired-tired, not heavy. Sensory input (noise, light) is manageable.',
      yellow: 'Breath getting slightly held or sighy. Some jaw/neck/shoulder tension creeping in. Restless, wired-tired, or foggy-with-jitter. Upper belly or chest feels a bit tight.',
      red: 'Chest or throat is tight or under "electric" pressure. Breath shallow or held. Strong urge to move, leave, or change seats. Body feels like danger is present.',
      black: 'Heavy, numb, or disconnected — OR overwhelmed with no stability. Basic care (water, food, getting up) feels hard. Body feels unreal or "not here." Gravity feels increased.',
    },
  },
  {
    id: 'brain',
    domain: 'Brain',
    question: 'What\'s the quality of your thoughts right now?',
    options: {
      green: 'Thoughts are flexible — more than one interpretation exists. Mistakes feel like information, not danger. Inner voice is neutral or coaching. I can park a thought and return to task.',
      yellow: 'Thoughts feel pressured or urgent instead of flexible. Inner critic is turning moral ("lazy," "wasting time"). Small mistakes sting more. Mild rumination that isn\'t a total takeover.',
      red: 'Thoughts going absolute (never / ruined / can\'t). Inner voice attacking or contemptuous. Sticky replay loops — mentally arguing or rehearsing conversations in my head.',
      black: 'Foggy, blank, or globally bleak. Hard to form or access thoughts. Future-thinking collapses — next steps feel unreachable. Decisions feel impossible or huge.',
    },
  },
  {
    id: 'attention',
    domain: 'Attention',
    question: 'How is your focus and attention right now?',
    options: {
      green: 'Starting tasks feels doable (no long bargaining). Can stay on one task 10–30 minutes. Switching tasks is deliberate, not twitchy. Breaks restore me — not numb me.',
      yellow: 'Starting feels heavy — I stall. Focus breaks more easily and distractions stick. I reread/recheck because I don\'t trust my retention. Breaks are drifting toward scrolling.',
      red: 'Phone/distraction feels like oxygen (magnetic). Compulsive switching (tabs, apps, places, methods). I move a lot but feel no relief. Can\'t stay with one paragraph.',
      black: 'Initiation is near impossible. Can\'t hold focus even on entertainment I like. Reading or listening doesn\'t register. Opening an app and forgetting why immediately.',
    },
  },
  {
    id: 'behavior',
    domain: 'Behavior',
    question: 'What patterns are showing up in how you\'re acting?',
    options: {
      green: 'Completing chunks of work (not just prep). Breaks restore me — water, stretch. Minimal checking or perfection rituals. Completing what I start.',
      yellow: 'Prep mode increasing (organizing, rewriting, perfecting instead of doing). Stop-start pacing. Breaks drifting toward avoidance/scrolling more than regulation.',
      red: 'Control rituals exploding (checking, reorganizing to feel safe). Working but output quality collapses. Social shifts: snappy, withdrawn, feeling unsafe around people.',
      black: 'Withdrawing or avoiding contact because everything is too much. Stuck in bed or moving feels unusually hard. Stuck in long numbing loops (scrolling/shows) without recovery.',
    },
  },
  {
    id: 'capacity',
    domain: 'Study / Work Capacity',
    question: 'What\'s your actual capacity to study or do meaningful work right now?',
    options: {
      green: 'New material can stick. Can summarize after reading. Active recall works (not just recognition). Errors correct me without collapsing me. Effort feels like work, not threat.',
      yellow: 'Encoding drops (reading but it\'s not staying). New material feels heavy; review feels easier. Working memory feels crowded ("too many tabs"). Need repetition to retain.',
      red: 'Rereading — nothing sticks. Working memory collapses (lose steps instantly). Studying feels like cosplay productivity. Even simple material feels confusing or threatening.',
      black: 'No learning capacity — brain unavailable. Studying makes me worse (more numb or overwhelmed). Nothing sticks, even simple info. Tiny tasks feel pointless or impossible.',
    },
  },
]

function determineZone(answers: Record<string, Zone>): Zone {
  const counts: Record<Zone, number> = { green: 0, yellow: 0, red: 0, black: 0 }
  Object.values(answers).forEach(z => { counts[z]++ })
  const maxVotes = Math.max(...Object.values(counts))
  for (const zone of ZONE_ORDER) {
    if (counts[zone] === maxVotes) return zone
  }
  return 'green'
}

const ZONE_BADGE_CLASSES: Record<Zone, string> = {
  green:  'bg-green-100 text-green-800 border border-green-200',
  yellow: 'bg-amber-100 text-amber-800 border border-amber-200',
  red:    'bg-red-100 text-red-800 border border-red-200',
  black:  'bg-gray-800 text-gray-200 border border-gray-700',
}

const ZONE_OPTION_BORDER: Record<Zone, string> = {
  green:  'border-l-green-400',
  yellow: 'border-l-amber-400',
  red:    'border-l-red-400',
  black:  'border-l-gray-500',
}

export default function ADHDZoneChecker({ lang }: { lang: 'en' | 'ar' }) {
  const isAr = lang === 'ar'
  const [step, setStep] = useState<'intro' | number | 'result'>('intro')
  const [answers, setAnswers] = useState<Record<string, Zone>>({})
  const [selected, setSelected] = useState<Zone | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [history, setHistory] = useState<CheckinHistoryItem[]>([])
  const savedForRef = useRef<string | null>(null)

  const currentQ = typeof step === 'number' ? QUESTIONS[step] : null
  const resultZone = step === 'result' ? determineZone(answers) : null
  const zoneMeta = resultZone ? ZONE_META[resultZone] : null

  // Load recent check-in history on mount.
  useEffect(() => {
    let cancelled = false
    fetch('/api/adhd-zones/checkin')
      .then((r) => (r.ok ? r.json() : { checkins: [] }))
      .then((d) => { if (!cancelled) setHistory(d.checkins || []) })
      .catch(() => { /* history is non-critical */ })
    return () => { cancelled = true }
  }, [])

  // Persist the result exactly once when the user reaches the result screen.
  useEffect(() => {
    if (step !== 'result' || !resultZone) return
    // Guard against double-save for the same answer set.
    const fingerprint = JSON.stringify(answers)
    if (savedForRef.current === fingerprint) return
    savedForRef.current = fingerprint

    setSaveState('saving')
    fetch('/api/adhd-zones/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone: resultZone, answers }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('save failed')
        return r.json()
      })
      .then((d) => {
        setSaveState('saved')
        if (d.checkin) {
          setHistory((prev) => [d.checkin as CheckinHistoryItem, ...prev].slice(0, 14))
        }
      })
      .catch(() => setSaveState('error'))
  }, [step, resultZone, answers])

  function handleStart() {
    setAnswers({})
    setSelected(null)
    setSaveState('idle')
    setStep(0)
  }

  function handleNext() {
    if (selected === null || !currentQ) return
    const newAnswers = { ...answers, [currentQ.id]: selected }
    setAnswers(newAnswers)
    setSelected(null)
    if (typeof step === 'number' && step < QUESTIONS.length - 1) {
      setStep(step + 1)
    } else {
      setStep('result')
    }
  }

  function handleBack() {
    if (typeof step === 'number' && step > 0) {
      const prevQ = QUESTIONS[step - 1]
      setSelected(answers[prevQ.id] ?? null)
      setStep(step - 1)
    } else {
      setStep('intro')
    }
  }

  function handleRetake() {
    setAnswers({})
    setSelected(null)
    setSaveState('idle')
    setStep('intro')
  }

  // ── Intro ────────────────────────────────────────────────────────────────
  if (step === 'intro') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            🧠 ADHD Regulation Tool
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Zone Check-In</h1>
          <p className="text-gray-500 leading-relaxed">
            Based on Sara Al Shatarat&apos;s Zone Model for Focus &amp; Regulation. Answer 5 quick questions about how you feel <strong>right now</strong> — your body, brain, attention, behavior, and work capacity. You&apos;ll get your current zone and exactly what to do in it.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {(ZONE_ORDER.slice().reverse() as Zone[]).map(zone => {
            const z = ZONE_META[zone]
            const Icon = z.icon
            return (
              <div key={zone} className={`rounded-xl border p-4 ${zone === 'black' ? 'bg-gray-900 border-gray-700' : `${z.bg} ${z.border}`}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${zone === 'black' ? 'text-gray-300' : zone === 'green' ? 'text-green-600' : zone === 'yellow' ? 'text-amber-500' : 'text-red-500'}`} />
                  <span className={`text-sm font-semibold ${zone === 'black' ? 'text-gray-100' : z.text}`}>{z.label}</span>
                </div>
                <p className={`text-xs leading-relaxed ${zone === 'black' ? 'text-gray-400' : 'text-gray-500'}`}>{z.tagline}</p>
              </div>
            )
          })}
        </div>

        <div className="card p-5 mb-6 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800 leading-relaxed">
            <strong>Note:</strong> This tool is for self-awareness and daily regulation, not clinical diagnosis. If you&apos;re experiencing distress or crisis, please reach out to a mental health professional.
          </p>
        </div>

        <button
          onClick={handleStart}
          className="btn-primary w-full py-3 text-base gap-2"
        >
          {isAr ? 'تحقق من منطقتي الآن' : 'Check my zone now'}
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Recent check-in history */}
        {history.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {isAr ? 'عمليات التحقق الأخيرة' : 'Your recent check-ins'}
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              {history.slice(0, 14).map((h) => (
                <div
                  key={h.id}
                  className="flex flex-col items-center gap-1"
                  title={`${ZONE_META[h.zone].label} · ${new Date(h.created_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}`}
                >
                  <span className={`w-7 h-7 rounded-md flex items-center justify-center text-sm ${ZONE_BADGE_CLASSES[h.zone]}`}>
                    {ZONE_META[h.zone].emoji}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {isAr
                ? 'يتم حفظ كل عملية تحقق تلقائياً لتتبع نمط تنظيمك.'
                : 'Each check-in is saved automatically so you can track your regulation pattern.'}
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── Question ─────────────────────────────────────────────────────────────
  if (typeof step === 'number' && currentQ) {
    const progress = ((step + 1) / QUESTIONS.length) * 100

    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="text-xs text-gray-400 font-medium">
              {step + 1} / {QUESTIONS.length}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Domain label */}
        <div className="mb-4">
          <span className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full uppercase tracking-wide">
            {currentQ.domain}
          </span>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-6">{currentQ.question}</h2>

        <div className="space-y-3 mb-8">
          {(ZONE_ORDER.slice().reverse() as Zone[]).map(zone => {
            const isSelected = selected === zone
            return (
              <button
                key={zone}
                onClick={() => setSelected(zone)}
                className={`w-full text-left rounded-xl border-2 border-l-4 p-4 transition-all duration-150 ${
                  isSelected
                    ? ZONE_META[zone].optionSelected
                    : `border-gray-200 ${ZONE_OPTION_BORDER[zone]} bg-white hover:border-gray-300 hover:bg-gray-50`
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                    isSelected ? `${ZONE_META[zone].dot} border-transparent` : 'border-gray-300'
                  }`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${ZONE_BADGE_CLASSES[zone]}`}>
                        {ZONE_META[zone].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{currentQ.options[zone]}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={handleNext}
          disabled={selected === null}
          className="btn-primary w-full py-3 text-base gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {step < QUESTIONS.length - 1 ? 'Next' : 'See my zone'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // ── Result ───────────────────────────────────────────────────────────────
  if (step === 'result' && resultZone && zoneMeta) {
    const Icon = zoneMeta.icon
    const domainResults = QUESTIONS.map(q => ({
      domain: q.domain,
      zone: answers[q.id] as Zone,
    }))

    return (
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Zone banner */}
        <div className={`rounded-2xl overflow-hidden mb-6 border ${resultZone === 'black' ? 'border-gray-700' : zoneMeta.border}`}>
          <div className={`${zoneMeta.headerBg} px-6 py-6`}>
            <div className="flex items-center gap-3 mb-1">
              <Icon className={`w-7 h-7 ${zoneMeta.headerText}`} />
              <h1 className={`text-2xl font-bold ${zoneMeta.headerText}`}>{zoneMeta.label}</h1>
            </div>
            <p className={`text-sm font-medium opacity-80 ${zoneMeta.headerText}`}>{zoneMeta.tagline}</p>
          </div>
          <div className={`px-6 py-4 ${resultZone === 'black' ? 'bg-gray-900' : zoneMeta.bg}`}>
            <p className={`text-sm leading-relaxed ${resultZone === 'black' ? 'text-gray-300' : 'text-gray-700'}`}>
              {zoneMeta.description}
            </p>
          </div>
        </div>

        {/* Saved-to-history indicator */}
        <div className="mb-6 -mt-2 flex items-center justify-center">
          {saveState === 'saving' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {isAr ? 'جارٍ الحفظ في سجلك...' : 'Saving to your history…'}
            </span>
          )}
          {saveState === 'saved' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
              <Check className="w-3.5 h-3.5" />
              {isAr ? 'تم الحفظ في سجلك' : 'Saved to your history'}
            </span>
          )}
          {saveState === 'error' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
              {isAr ? 'تعذّر حفظ هذا التحقق' : 'Could not save this check-in'}
            </span>
          )}
        </div>

        {/* Domain breakdown */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your domain breakdown</h2>
          <div className="grid grid-cols-5 gap-2">
            {domainResults.map(({ domain, zone }) => (
              <div key={domain} className="text-center">
                <div className={`rounded-lg py-2 px-1 text-xs font-medium mb-1 ${ZONE_BADGE_CLASSES[zone]}`}>
                  {ZONE_META[zone].emoji}
                </div>
                <p className="text-xs text-gray-500 leading-tight">{domain}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action plan */}
        <div className={`rounded-xl border p-5 mb-4 ${resultZone === 'black' ? 'bg-gray-900 border-gray-700' : `${zoneMeta.bg} ${zoneMeta.border}`}`}>
          <h2 className={`text-sm font-bold uppercase tracking-wide mb-4 ${resultZone === 'black' ? 'text-gray-400' : 'text-gray-500'}`}>
            What you do here
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Primary goal', value: zoneMeta.primaryGoal },
              { label: 'Study / Work', value: zoneMeta.study },
              { label: 'Regulation', value: zoneMeta.regulation },
              { label: 'If you push anyway', value: zoneMeta.ifYouPushAnyway },
            ].map(({ label, value }) => (
              <div key={label} className="flex gap-3">
                <span className={`text-xs font-semibold flex-shrink-0 w-28 pt-0.5 ${resultZone === 'black' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {label}
                </span>
                <p className={`text-sm leading-relaxed ${resultZone === 'black' ? 'text-gray-300' : 'text-gray-700'}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mislabel traps */}
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Common mislabels to avoid</h2>
          <ul className="space-y-2">
            {zoneMeta.mislabels.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-gray-300 flex-shrink-0 mt-0.5">•</span>
                {m}
              </li>
            ))}
          </ul>
        </div>

        {/* Safety note for Red/Black */}
        {(resultZone === 'red' || resultZone === 'black') && (
          <div className="card p-4 mb-6 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-800 leading-relaxed">
              <strong>Reminder:</strong> If you feel unsafe or are in crisis, please reach out to a mental health professional or a trusted person immediately.
            </p>
          </div>
        )}

        <button
          onClick={handleRetake}
          className="btn-secondary w-full py-3 text-base gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Check again
        </button>
      </div>
    )
  }

  return null
}
