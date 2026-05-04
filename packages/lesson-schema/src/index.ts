export {
  urlOrPath,
  imageSrcFlexible,
  cleanedStringArray,
  quizBlockSchema,
  lessonBlockSchema,
  lessonStepSchema,
  lessonEmoji,
  lessonCreateSchema,
  lessonUpdateSchema,
  lessonEditorFormSchema,
  type LessonBlock,
  type LessonStep,
  type LessonCreateInput,
  type LessonEditorFormValues,
} from './schema.js'

export { isLikelyImageBadgeUrl } from './media-badge.js'

export {
  quizLearnerBlockSchema,
  lessonBlockLearnerSchema,
  lessonStepLearnerSchema,
  type LessonBlockLearner,
  type LessonStepLearner,
} from './schema-learner.js'

export { migrateLegacyQuizShapes } from './migrate.js'
export { stripQuizAnswersFromSteps } from './strip.js'
export {
  normalizeLessonBlockForEditor,
  normalizeLessonContentSteps,
} from './normalize-editor.js'
