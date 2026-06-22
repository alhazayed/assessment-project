import { useState, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useLocale, useIsRTL } from '@/lib/hooks'
import { t } from '@/lib/i18n'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const slides = [
  { emoji: '🧠', titleKey: 'slide1Title' as const, bodyKey: 'slide1Body' as const },
  { emoji: '📊', titleKey: 'slide2Title' as const, bodyKey: 'slide2Body' as const },
  { emoji: '🔒', titleKey: 'slide3Title' as const, bodyKey: 'slide3Body' as const },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const { lang } = useLocale()
  const isRTL = useIsRTL(lang)
  const scrollRef = useRef<ScrollView>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  async function finish() {
    await AsyncStorage.setItem('@vwelfare_onboarded', 'true')
    router.replace('/(auth)/login')
  }

  function handleNext() {
    if (currentIndex < slides.length - 1) {
      const next = currentIndex + 1
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true })
      setCurrentIndex(next)
    } else {
      finish()
    }
  }

  function handleSkip() {
    finish()
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button */}
      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>{t('skip', lang)}</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {slides.map((slide, index) => (
          <View key={index} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <Text style={styles.emoji}>{slide.emoji}</Text>
            <Text style={[styles.slideTitle, isRTL && styles.rtlText]}>
              {t(slide.titleKey, lang)}
            </Text>
            <Text style={[styles.slideBody, isRTL && styles.rtlText]}>
              {t(slide.bodyKey, lang)}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Button */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>
            {currentIndex === slides.length - 1 ? t('getStarted', lang) : t('next', lang)}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'center',
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emoji: {
    fontSize: 88,
    marginBottom: 32,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  slideBody: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  rtlText: {
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#1D6296',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#D1D5DB',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  nextBtn: {
    backgroundColor: '#1D6296',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
})
