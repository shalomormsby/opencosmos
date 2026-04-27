import { Suspense } from 'react'
import { CosmoChat } from './CosmoChat'

export const metadata = {
  title: 'Dialog — OpenCosmos',
}

export default function DialogPage() {
  return (
    <Suspense>
      <CosmoChat />
    </Suspense>
  )
}
