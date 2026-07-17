import type { FormEvent } from 'react'

import { Button } from '@/components/Button/Button'
import '@/features/chat/question-composer.css'

interface QuestionComposerProps {
  disabled?: boolean
  isLoading?: boolean
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}

export function QuestionComposer({
  disabled = false,
  isLoading = false,
  onChange,
  onSubmit,
  value,
}: QuestionComposerProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form
      className={`question-composer ${disabled ? 'question-composer--disabled' : ''}`}
      onSubmit={handleSubmit}
    >
      <label className="question-composer__label" htmlFor="codebase-question">
        输入关于当前代码库的问题
      </label>
      <input
        id="codebase-question"
        name="question"
        type="text"
        value={value}
        placeholder={disabled ? '索引就绪后可开始提问…' : '输入关于当前代码库的问题…'}
        disabled={disabled || isLoading}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button
        className="question-composer__submit"
        type="submit"
        disabled={disabled || !value.trim()}
        isLoading={isLoading}
      >
        {isLoading ? '正在回答' : '发送'}
      </Button>
    </form>
  )
}
