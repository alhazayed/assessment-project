import { publicPageMetadata } from '@/lib/public-metadata'

export const metadata = publicPageMetadata({
  title: 'Assessment Packages',
  description:
    'V Welfare mental health assessment packages for personal wellness and clinician-supported care. Browse plans in Arabic and English.',
  path: '/packages',
})

export default function PackagesMarketingLayout({ children }: { children: React.ReactNode }) {
  return children
}
