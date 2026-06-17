'use client'

import { useInception } from './InceptionContext'
import { Origin } from './steps/Origin'
import { Chooser } from './steps/Chooser'
import { Interview } from './steps/Interview'
import { Export } from './steps/Export'
import { SECTIONS } from '@/lib/inception/schema'

// The main column. Cosmo's interview lives in the left sidebar (InceptionShell);
// this renders the current step — for the interview, the blueprint + section nav.
export function InceptionInset() {
  const { step, setStep, path, build, setPath, setBuild, answers, onField, dayZero, activeSection, setActiveSection, startInterview, reset } = useInception()

  if (step === 'origin') return <Origin onBegin={() => setStep('chooser')} />

  if (step === 'chooser')
    return <Chooser path={path} build={build} onPath={setPath} onBuild={setBuild} onContinue={startInterview} onBack={() => setStep('origin')} />

  if (step === 'interview' && path && build)
    return (
      <Interview
        path={path}
        answers={answers}
        activeSection={activeSection || SECTIONS[path][0].id}
        setActiveSection={setActiveSection}
        onField={onField}
        onFinish={() => setStep('export')}
        onBack={() => setStep('chooser')}
        onReset={reset}
      />
    )

  if (step === 'export' && path && build)
    return <Export path={path} build={build} answers={answers} dayZeroEntry={dayZero} onBack={() => setStep('interview')} />

  return <Chooser path={path} build={build} onPath={setPath} onBuild={setBuild} onContinue={startInterview} onBack={() => setStep('origin')} />
}
