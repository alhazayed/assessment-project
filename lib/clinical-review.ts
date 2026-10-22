/** Reviewer fields snapshotted on assessment_submissions by confirm_submission_review(). */
export interface SubmissionReview {
  reviewer_name: string | null
  reviewer_title: string | null
  reviewed_at: string | null
}

/**
 * "Clinically reviewed by <name>, <title>" / "تمت مراجعة النتيجة بواسطة <name>، <title>",
 * or null while the result has not been reviewed.
 */
export function reviewedByLine(lang: string, review: SubmissionReview | null | undefined): string | null {
  if (!review?.reviewer_name || !review.reviewed_at) return null
  const isAr = lang === 'ar'
  const who = review.reviewer_title
    ? `${review.reviewer_name}${isAr ? '، ' : ', '}${review.reviewer_title}`
    : review.reviewer_name
  return isAr ? `تمت مراجعة النتيجة بواسطة ${who}` : `Clinically reviewed by ${who}`
}
