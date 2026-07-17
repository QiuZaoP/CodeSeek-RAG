import { BotIcon, UserIcon } from '@/components/Icon/Icon'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import { QuestionComposer } from '@/features/chat/QuestionComposer'
import { SourceCitation } from '@/features/chat/SourceCitation'
import '@/features/chat/chat-workspace.css'

interface ChatWorkspaceProps {
  answer?: string
  question?: string
  questionInput: string
  showCitation: boolean
  isEnabled: boolean
  onQuestionInputChange: (value: string) => void
  onQuestionSubmit: () => void
}

export function ChatWorkspace({
  answer,
  isEnabled,
  onQuestionInputChange,
  onQuestionSubmit,
  question,
  questionInput,
  showCitation,
}: ChatWorkspaceProps) {
  return (
    <main className="chat-workspace">
      <div className="chat-workspace__content">
        <h1>询问你的代码库</h1>

        {question && answer ? <section className="conversation" aria-label="代码库问答">
          <article className="message message--user">
            <div className="message__avatar message__avatar--user" aria-hidden="true">
              <UserIcon />
            </div>
            <p>{question}</p>
          </article>

          <article className="message message--assistant">
            <div className="message__avatar message__avatar--assistant" aria-hidden="true">
              <BotIcon />
            </div>
            <div className="message__body">
              <p>{answer}</p>
              {showCitation ? <SourceCitation /> : null}
            </div>
          </article>
        </section> : (
          <EmptyState title={isEnabled ? '开始提问' : '等待开始问答'}>
            {isEnabled ? '输入一个关于当前代码库的问题。' : '加载项目并建立索引后，即可开始代码问答。'}
          </EmptyState>
        )}
      </div>

      <div className="chat-workspace__composer">
        <QuestionComposer
          disabled={!isEnabled}
          value={questionInput}
          onChange={onQuestionInputChange}
          onSubmit={onQuestionSubmit}
        />
      </div>
    </main>
  )
}
