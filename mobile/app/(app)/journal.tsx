import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAppLocale } from '@/lib/LocaleContext'
import { useIsRTL } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import type { JournalEntry } from '@/lib/types'

export default function JournalScreen() {
  const { lang } = useAppLocale()
  const isRTL = useIsRTL(lang)

  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadEntries() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })
    setEntries((data as JournalEntry[]) || [])
    setLoading(false)
  }

  useEffect(() => { loadEntries() }, [])

  function openNew() {
    setEditingEntry(null)
    setTitle('')
    setContent('')
    setShowModal(true)
  }

  function openEdit(entry: JournalEntry) {
    setEditingEntry(entry)
    setTitle(entry.title)
    setContent(entry.content)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingEntry(null)
    setTitle('')
    setContent('')
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    if (editingEntry) {
      await supabase
        .from('journal_entries')
        .update({ title: title.trim(), content: content.trim() })
        .eq('id', editingEntry.id)
    } else {
      await supabase.from('journal_entries').insert({
        patient_id: user.id,
        title: title.trim(),
        content: content.trim(),
        is_shared: false,
      })
    }

    setSaving(false)
    closeModal()
    loadEntries()
  }

  async function handleDelete(entry: JournalEntry) {
    Alert.alert(
      t('deleteEntry', lang),
      t('deleteEntryConfirm', lang),
      [
        { text: t('cancel', lang), style: 'cancel' },
        {
          text: t('delete', lang),
          style: 'destructive',
          onPress: async () => {
            await supabase.from('journal_entries').delete().eq('id', entry.id)
            loadEntries()
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <Text style={[styles.pageTitle, isRTL && styles.rtlText]}>
          {t('journalTitle', lang)}
        </Text>
        <TouchableOpacity onPress={openNew} style={styles.newBtn}>
          <Text style={styles.newBtnText}>{t('newEntry', lang)}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#1D6296" size="large" />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="journal-outline" size={56} color="#D1D5DB" />
          <Text style={[styles.emptyText, isRTL && styles.rtlText]}>
            {t('noJournalEntries', lang)}
          </Text>
          <TouchableOpacity onPress={openNew} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>{t('writeFirstEntry', lang)}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {entries.map(entry => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={[styles.entryHeader, isRTL && styles.rtlRow]}>
                <Text
                  style={[styles.entryTitle, isRTL && styles.rtlText]}
                  numberOfLines={1}
                >
                  {entry.title}
                </Text>
                <View style={[styles.entryActions, isRTL && styles.rtlRow]}>
                  <TouchableOpacity
                    onPress={() => openEdit(entry)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="pencil-outline" size={16} color="#1D6296" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(entry)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text
                style={[styles.entryContent, isRTL && styles.rtlText]}
                numberOfLines={3}
              >
                {entry.content}
              </Text>
              <Text style={[styles.entryDate, isRTL && styles.rtlText]}>
                {new Date(entry.created_at).toLocaleDateString(
                  lang === 'ar' ? 'ar-SA' : 'en-US',
                  { year: 'numeric', month: 'long', day: 'numeric' },
                )}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* New / Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal header */}
          <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
            <TouchableOpacity onPress={closeModal} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>{t('cancel', lang)}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
              {editingEntry
                ? t('editEntry', lang)
                : t('newEntry', lang).replace('+ ', '')}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !title.trim() || !content.trim()}
              style={styles.modalSaveBtn}
            >
              {saving ? (
                <ActivityIndicator color="#1D6296" size="small" />
              ) : (
                <Text
                  style={[
                    styles.modalSaveText,
                    (!title.trim() || !content.trim()) && styles.modalSaveTextDisabled,
                  ]}
                >
                  {t('save', lang)}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Title input */}
          <TextInput
            style={[styles.titleInput, isRTL && styles.rtlText]}
            placeholder={t('journalPlaceholderTitle', lang)}
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            maxLength={120}
            returnKeyType="next"
          />

          {/* Divider */}
          <View style={styles.inputDivider} />

          {/* Content input */}
          <TextInput
            style={[styles.contentInput, isRTL && styles.rtlText]}
            placeholder={t('journalPlaceholderContent', lang)}
            placeholderTextColor="#9CA3AF"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  newBtn: {
    backgroundColor: '#1D6296',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  scroll: { padding: 16, paddingBottom: 32, gap: 12 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  emptyBtn: {
    backgroundColor: '#1D6296',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  entryTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  entryActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  entryContent: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 10 },
  entryDate: { fontSize: 11, color: '#9CA3AF' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalCancelBtn: { padding: 4, minWidth: 60 },
  modalCancelText: { fontSize: 15, color: '#6B7280' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalSaveBtn: { padding: 4, minWidth: 60, alignItems: 'flex-end' },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: '#1D6296' },
  modalSaveTextDisabled: { color: '#9CA3AF' },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0,
  },
  inputDivider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  contentInput: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
})
