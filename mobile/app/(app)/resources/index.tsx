import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useLocale, useIsRTL } from '@/lib/hooks'
import { t } from '@/lib/i18n'

export type ResourceCategory = 'anxiety' | 'depression' | 'stress' | 'sleep' | 'adhd' | 'relationships'

export interface Resource {
  id: string
  slug: string
  category: ResourceCategory
  titleEn: string
  titleAr: string
  summaryEn: string
  summaryAr: string
  readingTimeMin: number
  icon: string
}

export const RESOURCES: Resource[] = [
  {
    id: '1',
    slug: 'understanding-your-anxiety',
    category: 'anxiety',
    titleEn: 'Understanding Your Anxiety',
    titleAr: 'فهم قلقك',
    summaryEn: 'Anxiety is a natural response to stress, but when it becomes persistent, it can affect your daily life. Learn to recognize the signs and take action.',
    summaryAr: 'القلق هو استجابة طبيعية للتوتر، ولكن عندما يصبح مستمراً يمكن أن يؤثر على حياتك اليومية. تعلم كيفية التعرف على العلامات واتخاذ الإجراءات اللازمة.',
    readingTimeMin: 4,
    icon: '🧠',
  },
  {
    id: '2',
    slug: 'anxiety-management-techniques',
    category: 'anxiety',
    titleEn: '7 Proven Anxiety Management Techniques',
    titleAr: '٧ تقنيات مجربة لإدارة القلق',
    summaryEn: 'From deep breathing to cognitive reframing, these evidence-based strategies can help you reduce anxiety and regain control of your thoughts.',
    summaryAr: 'من التنفس العميق إلى إعادة الصياغة المعرفية، يمكن لهذه الاستراتيجيات المبنية على الأدلة أن تساعدك على تقليل القلق واستعادة السيطرة على أفكارك.',
    readingTimeMin: 6,
    icon: '✨',
  },
  {
    id: '3',
    slug: 'signs-of-depression',
    category: 'depression',
    titleEn: 'Signs of Depression and What to Do',
    titleAr: 'علامات الاكتئاب وما يجب فعله',
    summaryEn: 'Depression affects millions worldwide. Understanding its signs is the first step toward recovery. This guide helps you identify symptoms and find support.',
    summaryAr: 'يؤثر الاكتئاب على ملايين الأشخاص حول العالم. فهم علاماته هو الخطوة الأولى نحو التعافي. يساعدك هذا الدليل على تحديد الأعراض وإيجاد الدعم.',
    readingTimeMin: 5,
    icon: '💙',
  },
  {
    id: '4',
    slug: 'overcoming-depression-daily-habits',
    category: 'depression',
    titleEn: 'Daily Habits That Help You Overcome Depression',
    titleAr: 'عادات يومية تساعدك على التغلب على الاكتئاب',
    summaryEn: 'Small, consistent actions can have a profound impact on depression. Discover practical daily habits that support your mental and emotional wellbeing.',
    summaryAr: 'يمكن للأفعال الصغيرة المتسقة أن يكون لها تأثير عميق على الاكتئاب. اكتشف العادات اليومية العملية التي تدعم صحتك النفسية والعاطفية.',
    readingTimeMin: 5,
    icon: '🌱',
  },
  {
    id: '5',
    slug: 'stress-relief-techniques',
    category: 'stress',
    titleEn: '5 Evidence-Based Stress Relief Techniques',
    titleAr: '٥ تقنيات للتخفيف من التوتر مدعومة بالأدلة',
    summaryEn: 'Chronic stress harms your body and mind. These five scientifically proven techniques will help you manage stress effectively in your everyday life.',
    summaryAr: 'يضر التوتر المزمن بجسمك وعقلك. ستساعدك هذه التقنيات الخمس المثبتة علمياً على إدارة التوتر بفعالية في حياتك اليومية.',
    readingTimeMin: 5,
    icon: '🌊',
  },
  {
    id: '6',
    slug: 'workplace-stress-management',
    category: 'stress',
    titleEn: 'Managing Stress at Work',
    titleAr: 'إدارة التوتر في العمل',
    summaryEn: 'Workplace stress is one of the most common sources of mental strain. Learn practical strategies to set boundaries, prioritize, and protect your wellbeing at work.',
    summaryAr: 'يعد التوتر في بيئة العمل أحد أكثر مصادر الإجهاد النفسي شيوعاً. تعلم استراتيجيات عملية لتحديد الحدود وإعطاء الأولويات وحماية صحتك في العمل.',
    readingTimeMin: 4,
    icon: '💼',
  },
  {
    id: '7',
    slug: 'better-sleep-habits',
    category: 'sleep',
    titleEn: 'Building Better Sleep Habits',
    titleAr: 'بناء عادات نوم أفضل',
    summaryEn: 'Quality sleep is essential for mental health. Discover how to create a sleep-friendly environment and establish a routine that helps you rest deeply.',
    summaryAr: 'النوم الجيد ضروري للصحة النفسية. اكتشف كيفية إنشاء بيئة مواتية للنوم وإرساء روتين يساعدك على الراحة العميقة.',
    readingTimeMin: 4,
    icon: '🌙',
  },
  {
    id: '8',
    slug: 'insomnia-causes-solutions',
    category: 'sleep',
    titleEn: 'Insomnia: Causes, Effects, and Solutions',
    titleAr: 'الأرق: الأسباب والتأثيرات والحلول',
    summaryEn: 'Insomnia affects one in three adults at some point. Understand what causes sleep problems and what evidence-based treatments are available to help.',
    summaryAr: 'يؤثر الأرق على واحد من كل ثلاثة بالغين في مرحلة ما. افهم ما الذي يسبب مشاكل النوم وما هي العلاجات المبنية على الأدلة المتاحة للمساعدة.',
    readingTimeMin: 6,
    icon: '🛏️',
  },
  {
    id: '9',
    slug: 'living-well-with-adhd',
    category: 'adhd',
    titleEn: 'Living Well with ADHD',
    titleAr: 'العيش بشكل جيد مع اضطراب نقص الانتباه',
    summaryEn: 'ADHD is not a limitation — it is a different way of experiencing the world. Discover strategies that help you harness your strengths and manage challenges.',
    summaryAr: 'اضطراب نقص الانتباه ليس قيداً، بل هو طريقة مختلفة لاختبار العالم. اكتشف الاستراتيجيات التي تساعدك على استغلال نقاط قوتك وإدارة التحديات.',
    readingTimeMin: 5,
    icon: '⚡',
  },
  {
    id: '10',
    slug: 'adhd-focus-productivity',
    category: 'adhd',
    titleEn: 'ADHD Focus and Productivity Strategies',
    titleAr: 'استراتيجيات التركيز والإنتاجية لاضطراب نقص الانتباه',
    summaryEn: 'Managing focus with ADHD requires tailored approaches. These practical strategies help you stay on task, reduce overwhelm, and boost productivity.',
    summaryAr: 'تتطلب إدارة التركيز مع اضطراب نقص الانتباه مناهج مخصصة. تساعدك هذه الاستراتيجيات العملية على الالتزام بالمهام وتقليل الإرهاق وتعزيز الإنتاجية.',
    readingTimeMin: 5,
    icon: '🎯',
  },
  {
    id: '11',
    slug: 'healthy-communication-patterns',
    category: 'relationships',
    titleEn: 'Healthy Communication Patterns',
    titleAr: 'أنماط التواصل الصحي',
    summaryEn: 'The quality of your relationships directly impacts your mental health. Learn the core patterns of healthy communication that build trust and connection.',
    summaryAr: 'جودة علاقاتك تؤثر مباشرة على صحتك النفسية. تعلم الأنماط الأساسية للتواصل الصحي التي تبني الثقة والتواصل.',
    readingTimeMin: 5,
    icon: '🤝',
  },
  {
    id: '12',
    slug: 'setting-boundaries-in-relationships',
    category: 'relationships',
    titleEn: 'Setting Healthy Boundaries',
    titleAr: 'تحديد الحدود الصحية في العلاقات',
    summaryEn: 'Boundaries are essential for healthy relationships and personal wellbeing. Discover how to set and maintain limits that protect your emotional health.',
    summaryAr: 'الحدود ضرورية للعلاقات الصحية والرفاهية الشخصية. اكتشف كيفية تحديد الحدود والحفاظ عليها لحماية صحتك العاطفية.',
    readingTimeMin: 4,
    icon: '🛡️',
  },
]

const CATEGORIES: Array<{ key: string; labelKey: 'all' | 'anxiety' | 'depression' | 'stress' | 'sleep' | 'adhd' | 'relationships' }> = [
  { key: 'all', labelKey: 'all' },
  { key: 'anxiety', labelKey: 'anxiety' },
  { key: 'depression', labelKey: 'depression' },
  { key: 'stress', labelKey: 'stress' },
  { key: 'sleep', labelKey: 'sleep' },
  { key: 'adhd', labelKey: 'adhd' },
  { key: 'relationships', labelKey: 'relationships' },
]

const CATEGORY_COLORS: Record<string, string> = {
  anxiety: '#F97316',
  depression: '#6366F1',
  stress: '#EF4444',
  sleep: '#8B5CF6',
  adhd: '#F59E0B',
  relationships: '#10B981',
}

export default function ResourcesScreen() {
  const router = useRouter()
  const { lang } = useLocale()
  const isRTL = useIsRTL(lang)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const filtered = activeCategory === 'all'
    ? RESOURCES
    : RESOURCES.filter(r => r.category === activeCategory)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.pageTitle, isRTL && styles.rtlText]}>
          {t('resourcesTitle', lang)}
        </Text>

        {/* Category tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabsRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setActiveCategory(cat.key)}
                style={[
                  styles.tab,
                  activeCategory === cat.key && styles.tabActive,
                  activeCategory === cat.key && cat.key !== 'all' && {
                    backgroundColor: CATEGORY_COLORS[cat.key] + '20',
                    borderColor: CATEGORY_COLORS[cat.key],
                  },
                ]}
              >
                <Text style={[
                  styles.tabText,
                  activeCategory === cat.key && styles.tabTextActive,
                  activeCategory === cat.key && cat.key !== 'all' && {
                    color: CATEGORY_COLORS[cat.key],
                  },
                ]}>
                  {t(cat.labelKey, lang)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Article cards */}
        <View style={styles.articleList}>
          {filtered.map(resource => {
            const title = lang === 'ar' ? resource.titleAr : resource.titleEn
            const summary = lang === 'ar' ? resource.summaryAr : resource.summaryEn
            const catColor = CATEGORY_COLORS[resource.category] ?? '#6B7280'

            return (
              <TouchableOpacity
                key={resource.id}
                onPress={() => router.push(`/(app)/resources/${resource.slug}` as any)}
                style={styles.articleCard}
                activeOpacity={0.8}
              >
                <View style={[styles.cardTop, isRTL && styles.rtlRow]}>
                  <Text style={styles.articleIcon}>{resource.icon}</Text>
                  <View style={[styles.cardMeta, isRTL && { alignItems: 'flex-end' }]}>
                    <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
                      <Text style={[styles.categoryBadgeText, { color: catColor }]}>
                        {t(resource.category as any, lang)}
                      </Text>
                    </View>
                    <Text style={[styles.readingTime, isRTL && styles.rtlText]}>
                      {t('readingTime', lang, { min: resource.readingTimeMin })}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.articleTitle, isRTL && styles.rtlText]} numberOfLines={2}>
                  {title}
                </Text>
                <Text style={[styles.articleSummary, isRTL && styles.rtlText]} numberOfLines={3}>
                  {summary}
                </Text>
                <View style={[styles.readMoreRow, isRTL && styles.rtlRow]}>
                  <Text style={styles.readMoreText}>{t('readMore', lang)}</Text>
                  <Ionicons
                    name={isRTL ? 'arrow-back' : 'arrow-forward'}
                    size={14}
                    color="#1D6296"
                  />
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  rtlRow: { flexDirection: 'row-reverse' },
  tabsScroll: { marginBottom: 20 },
  tabsRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: '#EBF4FA', borderColor: '#1D6296' },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#1D6296', fontWeight: '700' },
  articleList: { gap: 12 },
  articleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  articleIcon: { fontSize: 28 },
  cardMeta: { flex: 1, gap: 4 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  categoryBadgeText: { fontSize: 11, fontWeight: '600' },
  readingTime: { fontSize: 11, color: '#9CA3AF' },
  articleTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6, lineHeight: 22 },
  articleSummary: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 12 },
  readMoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readMoreText: { fontSize: 13, color: '#1D6296', fontWeight: '600' },
})
