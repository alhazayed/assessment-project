import { getLanguage } from '@/lib/get-language'
import ADHDZoneChecker from '@/components/adhd-zone-checker'

export const metadata = {
  title: 'ADHD Zone Check-In',
  description: 'Identify your current ADHD regulation zone and get actionable, science-backed guidance.',
}

export default function ADHDZonesPage() {
  const lang = getLanguage()
  return (
    <div className="py-6 px-4">
      <ADHDZoneChecker lang={lang} />
    </div>
  )
}
