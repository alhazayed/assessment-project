/**
 * Superadmin deletion API types
 */

// DELETE USER ENDPOINT
// DELETE /api/admin/delete-user

export interface DeleteUserRequest {
  userId: string
  reason?: string
  hardDelete?: boolean
}

export interface DeleteUserResponse {
  ok: true
  deleted: {
    profileId: string
    deletionMethod: 'hard' | 'soft'
    recordsDeleted: Record<string, number>
    timestamp: string
  }
}

export interface DeleteUserPreviewResponse {
  user: {
    id: string
    full_name_en: string
    full_name_ar: string
    email: string
    role: string
    created_at: string
  }
  willDelete: {
    assessment_submissions: number
    assessment_answers: number
    assessment_results: number
    messages: number
    notifications: number
    clinical_notes: number
    draft_assessments: number
  }
  totalRecords: number
}

// DELETE RESULTS ENDPOINT
// DELETE /api/admin/delete-results

export interface DeleteResultsRequest {
  submissionId?: string
  patientId?: string
  definitionId?: string
  reason?: string
}

export interface DeleteResultsResponse {
  ok: true
  deleted: {
    submissionCount: number
    answerCount: number
    resultCount: number
    timestamp: string
  }
}

export interface DeleteResultsPreviewResponse {
  submissions: number
  willDelete: {
    submissions: number
    answers: number
    results: number
    total: number
  }
  details: Array<{
    id: string
    patient_id: string
    definition_id: string
    submitted_at: string
  }>
}

// ERROR RESPONSES

export interface ErrorResponse {
  error: string
}

// Audit log metadata
export interface DeletionAuditMetadata {
  deleted_records?: Record<string, number>
  method?: 'hard' | 'soft'
  timestamp?: string
  filter_type?: string
  filter_value?: string
  submissions_deleted?: number
  answers_deleted?: number
  results_deleted?: number
}
