import type { FormEvent } from 'react'

import { Button } from '@/components/Button/Button'
import '@/features/chat/question-composer.css'

interface QuestionComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}

export function QuestionComposer({ onChange, onSubmit, value }: QuestionComposerProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="question-composer" onSubmit={handleSubmit}>
      <label className="question-composer__label" htmlFor="codebase-question">
        输入关于当前代码库的问题
      </label>
      <input
        id="codebase-question"
        name="question"
        type="text"
        value={value}
        placeholder="输入关于当前代码库的问题…"
        onChange={(event) => onChange(event.target.value)}
      />
      <Button className="question-composer__submit" type="submit" disabled={!value.trim()}>
        发送
      </Button>
    </form>
  )
}
