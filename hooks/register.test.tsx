import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'prompt-master',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 } },
} as const

test('Prompt Master rewrites the draft and Undo puts it back', async ($, on) => {
  let box = 'make me a mod tht rewrites my promt'
  let sentSystem = ''
  on('prompt.read', () => ({ value: { text: box, cursor: box.length } }))
  on('model.complete', (_, e) => {
    sentSystem = String(e.system)
    return { value: { isAnswered: true, text: 'Make me a mod that rewrites my prompt.', usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }
  })
  on('prompt.fill', (_, e) => {
    box = e.text
    return { isFilled: true, box: { text: box, cursor: box.length } }
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' } as never)
  await ui.press({ key: 'pm' })
  expect(box).toBe('Make me a mod that rewrites my prompt.')
  expect(sentSystem).toContain('Keep the person')
  expect((await ui.find({ type: 'Text', text: /Rewritten/ }))?.text).toContain('Check it')

  await ui.press({ key: 'undo' })
  expect(box).toBe('make me a mod tht rewrites my promt')
  await ui.unmount()
})

test('an empty box is not sent to the model', async ($, on) => {
  let called = false
  on('prompt.read', () => ({ value: { text: '  ', cursor: 0 } }))
  on('model.complete', () => { called = true; return { value: { isAnswered: false, reason: 'empty-reply', usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } } })
  on('ui.toast', () => ({ value: undefined }))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  await ui.press({ key: 'pm' })
  expect(called).toBe(false)
  await ui.unmount()
})
