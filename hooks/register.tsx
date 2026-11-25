import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Status } from '../types'

const status = atom({ plugin: 'prompt-master-button', key: 'status' } as const, 'idle' as Status)
const original = atom({ plugin: 'prompt-master-button', key: 'original' } as const, null as string | null)
const message = atom({ plugin: 'prompt-master-button', key: 'message' } as const, '')

const SYSTEM = `You are Prompt Master. You rewrite a person's rough draft of a message to an AI assistant so the assistant understands it on the first try.

Rules:
- Keep the person's meaning exactly. Never add new requests, features, numbers, names or opinions they did not write. Never drop anything they asked for.
- Fix spelling, typos, grammar and punctuation.
- Make the ask clear and specific: lead with what they want done, then any details, limits or preferences they gave.
- If the draft holds several asks, list them as short numbered points.
- Keep their voice and keep it about as short as the meaning allows. A one-line ask stays short.
- Keep names, numbers, code, file paths, links and quoted text exactly as written.
- Write it as the person speaking ("I want...", "Can you..."), not about them.
- Do not answer the draft or do the task. Do not add a preface, notes or quotes.

Reply with the rewritten prompt only.`

async function improve($: EngineInterface, draft: string): Promise<{ text?: string; error?: string }> {
  const r = await $.model.complete({
    model: 'sonnet',
    system: SYSTEM,
    prompt: `Rewrite this draft:\n\n<draft>\n${draft}\n</draft>`,
    maxTokens: 2048,
    effort: 'low',
    timeoutMs: 45000,
  })
  if (!r.isAnswered || !r.text.trim()) return { error: r.isAnswered ? 'empty reply' : r.reason }
  return { text: r.text.trim().replace(/^<draft>\s*|\s*<\/draft>$/g, '') }
}

async function rewrite($: EngineInterface) {
  if ((await read($, status)) === 'working') return
  const box = await $.prompt.read()
  const draft = box.text.trim()
  if (!draft) {
    $.ui.toast('Type a prompt first, then press Prompt Master.')
    return
  }
  await update($, status, () => 'working' as Status)
  const r = await improve($, draft)
  if (r.error !== undefined || r.text === undefined) {
    await update($, status, () => 'error' as Status)
    await update($, message, () => r.error ?? 'no reply')
    return
  }
  const now = await $.prompt.read()
  if (now.text.trim() !== draft) {
    await update($, status, () => 'error' as Status)
    await update($, message, () => 'you edited the draft while it was rewriting, press again')
    return
  }
  const better = r.text
  const filled = await $.prompt.fill({ text: better, mode: 'replace' })
  if (!filled.isFilled) {
    await update($, status, () => 'error' as Status)
    await update($, message, () => 'the prompt box would not take the text')
    return
  }
  await update($, original, () => box.text)
  await update($, status, () => 'done' as Status)
}

async function undo($: EngineInterface) {
  const old = await read($, original)
  if (old === null) return
  await $.prompt.fill({ text: old, mode: 'replace' })
  await update($, original, () => null)
  await update($, status, () => 'idle' as Status)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'prompt-master-button',
      description: 'Rewrite a prompt into a clearer one: /prompt-master-button <your prompt>',
    })
    return next(e)
  })

  // Works on every surface, even where the button is not drawn:
  // /prompt-master-button <your messy prompt>
  on('command.run', { command: 'prompt-master-button' }, async ($, e) => {
    const draft = e.args.trim()
    if (!draft) {
      return { text: 'Type /prompt-master-button followed by your prompt, or press the Prompt Master button above the box.' }
    }
    const r = await improve($, draft)
    if (r.text === undefined) return { text: `Could not rewrite: ${r.error}` }
    const filled = await $.prompt.fill({ text: r.text, mode: 'replace' })
    if (filled.isFilled) {
      await update($, original, () => draft)
      await update($, status, () => 'done' as Status)
      return { text: 'Rewritten prompt is in your message box. Check it, edit if needed, then send.' }
    }
    return { text: `Rewritten prompt (copy it):\n\n${r.text}` }
  })

  // A new prompt sent: forget the undo copy.
  on('prompt.submit', async ($, e, next) => {
    await update($, original, () => null)
    await update($, status, () => 'idle' as Status)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const s = await read($, status)
    const old = await read($, original)
    const why = await read($, message)

    return (
      <Box>
        <Button
          key="pm"
          label={s === 'working' ? 'Rewriting…' : '✨ Prompt Master'}
          onPress={() => rewrite($)}
        />
        {old !== null && <Button key="undo" label="Undo" onPress={() => undo($)} />}
        <Text dimColor>
          {' '}
          {s === 'done'
            ? 'Rewritten. Check it, edit if needed, then send.'
            : s === 'error'
              ? `Could not rewrite: ${why}`
              : s === 'working'
                ? 'Rewriting your draft…'
                : ''}
        </Text>
      </Box>
    )
  })
}
