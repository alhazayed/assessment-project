import { localizedPublicMetadata } from '@/lib/public-metadata'

export async function generateMetadata() {
  return localizedPublicMetadata({
    en: {
      title: 'Assessment Packages',
      description:
        'V Welfare mental health assessment packages for personal wellness and clinician-supported care. Browse plans in Arabic and English.',
    },
    ar: {
      title: 'باقات التقييم',
      description: 'باقات تقييم الصحة النفسية من V Welfare للعافية الشخصية والرعاية بإشراف مختص، بالعربية والإنجليزية.',
    },
    path: '/packages',
  })
}

export default function PackagesMarketingLayout({ children }: { children: React.ReactNode }) {
  return children
}
