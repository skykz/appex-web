// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { normalizeLessonContentSteps, type LessonEditorFormValues } from '@appex/lesson-schema'
import { GuideFields } from './guide-fields'
import { LessonPreviewBlocks } from './lesson-preview-blocks'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const container = document.createElement('div')
document.body.append(container)
let root: ReturnType<typeof createRoot>
afterEach(() => { if (root) act(() => root.unmount()) })

describe('guide editor', () => {
  it('keeps images and text attached to their step when sections and steps move', () => {
    let form: UseFormReturn<LessonEditorFormValues>
    function Harness() {
      form = useForm<LessonEditorFormValues>({ defaultValues: {
        label: 'Lesson', title: 'Test', is_visible: false, order: 0,
        steps: normalizeLessonContentSteps([{ blocks: [{ type: 'guide', steps: [
          { title: 'First', blocks: [{ type: 'text', content: '**Before**' }, { type: 'image', src: '/one.png' }, { type: 'text', content: 'After' }] },
          { title: 'Second', content: 'Keep this text' },
        ] }] }]),
      } })
      return createElement(GuideFields, { form, base: 'steps.0.blocks.0' })
    }
    root = createRoot(container)
    act(() => root.render(createElement(Harness)))
    const click = (label: string) => act(() => {
      const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
      expect(button).not.toBeNull()
      button!.click()
    })
    click('Move section 2 up')
    click('Move guide step 1 down')
    const value = form!.getValues('steps.0.blocks.0')
    expect(value).toMatchObject({ steps: [
      { title: 'Second', blocks: [{ content: 'Keep this text' }] },
      { title: 'First', blocks: [{ type: 'image', src: '/one.png' }, { content: '**Before**' }, { content: 'After' }] },
    ] })
    expect(Array.from(container.querySelectorAll('textarea')).map((node) => node.value)).toContain('Keep this text')
    click('Move guide step 2 up')
    click('Remove section 2')
    expect(form!.getValues('steps.0.blocks.0')).toMatchObject({ steps: [
      { blocks: [{ type: 'image', src: '/one.png' }, { type: 'text', content: 'After' }] },
      { blocks: [{ type: 'text', content: 'Keep this text' }] },
    ] })
    const text = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="Guide step text"]')!
    text.setSelectionRange(0, 5)
    act(() => Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Bold')!.click())
    expect(form!.getValues('steps.0.blocks.0')).toMatchObject({ steps: [{ blocks: [
      { type: 'image', src: '/one.png' }, { type: 'text', content: '**After**' },
    ] }, { blocks: [{ type: 'text', content: 'Keep this text' }] }] })
  })

  it('previews formatted text before, between, and after multiple images', () => {
    root = createRoot(container)
    act(() => root.render(createElement(LessonPreviewBlocks, { blocks: [{ type: 'guide', steps: [
      { title: 'First', blocks: [
        { type: 'text', content: '**Before**' },
        { type: 'image', src: '/one.png', alt: 'First image' },
        { type: 'text', content: '""Between""' },
        { type: 'image', src: '/two.png', alt: 'Second image' },
        { type: 'text', content: 'After' },
      ] },
      { title: 'Second', content: 'Legacy' },
    ] }] })))
    expect(container.querySelector('strong')?.textContent).toBe('Before')
    expect(container.querySelector('em')?.textContent).toBe('Between')
    expect(Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'))).toEqual(['/one.png', '/two.png'])
    const content = container.querySelector('strong')!.parentElement!.parentElement!
    expect(Array.from(content.children).map((node) => node.tagName)).toEqual(['DIV', 'IMG', 'DIV', 'IMG', 'DIV'])
  })
})
