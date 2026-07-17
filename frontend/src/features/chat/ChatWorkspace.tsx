import { Button } from '@/components/Button/Button'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import { ErrorNotice } from '@/components/ErrorNotice/ErrorNotice'
import { BotIcon, UserIcon } from '@/components/Icon/Icon'
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator'
import { StatusMessage } from '@/components/StatusMessage/StatusMessage'
import { DEMO_QUESTIONS } from '@/features/chat/demoQuestions'
import { QuestionComposer } from '@/features/chat/QuestionComposer'
import { SourceCitationList } from '@/features/chat/SourceCitationList'
import type { ChatWorkflowState } from '@/features/chat/useChatWorkflow'
import '@/features/chat/chat-workspace.css'

interface ChatWorkspaceProps {
  isEnabled: boolean
  questionInput: string
  state: ChatWorkflowState
  onQuestionInputChange: (value: string) => void
  onQuestionSubmit: () => void
  onRetry: () => void
}

export function ChatWorkspace({
  isEnabled,
  onQuestionInputChange,
  onQuestionSubmit,
  onRetry,
  questionInput,
  state,
}: ChatWorkspaceProps) {
  const hasConversation = state.status !== 'idle' && state.question
  const isLoading = state.status === 'loading'

  return (
    <main className="chat-workspace">
      <div className="chat-workspace__content">
        <h1>询问你的代码库</h1>

        {hasConversation ? (
          <section className="conversation" aria-label="代码库问答" aria-busy={isLoading}>
            <article className="message message--user">
              <div className="message__avatar message__avatar--user" aria-hidden="true">
                <UserIcon />
              </div>
              <p>{state.question}</p>
            </article>

            <article className="message message--assistant">
              <div className="message__avatar message__avatar--assistant" aria-hidden="true">
                <BotIcon />
              </div>
              <div className="message__body">
                {state.status === 'loading' ? (
                  <div className="answer-loading">
                    <LoadingIndicator label="正在回答…" />
                    <span>正在检索代码并组织回答…</span>
                  </div>
                ) : null}
                {state.status === 'error' ? (
                  <ErrorNotice
                    title="问答失败"
                    action={state.error?.retryable ? (
                      <Button type="button" variant="secondary" onClick={onRetry}>
                        重试问题
                      </Button>
                    ) : undefined}
                  >
                    {state.error?.message ?? '问答服务发生未知错误。'}
                  </ErrorNotice>
                ) : null}
                {state.status === 'success' && state.response ? (
                  <>
                    <p className="message__answer">{state.response.answer}</p>
                    {state.response.sources.length > 0 ? (
                      <SourceCitationList sources={state.response.sources} />
                    ) : (
                      <div className="no-sources-notice">
                        <StatusMessage>当前回答没有可用引用，请谨慎核对。</StatusMessage>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </article>
          </section>
        ) : (
          <EmptyState
            title={isEnabled ? '开始提问' : '等待开始问答'}
            action={isEnabled ? (
              <div className="demo-questions" aria-label="演示问题">
                {DEMO_QUESTIONS.map((question) => (
                  <button type="button" key={question} onClick={() => onQuestionInputChange(question)}>
                    {question}
                  </button>
                ))}
              </div>
            ) : undefined}
          >
            {isEnabled ? '选择一个演示问题或输入自己的问题。' : '加载项目并建立索引后，即可开始代码问答。'}
          </EmptyState>
        )}
      </div>

      <div className="chat-workspace__composer">
        <QuestionComposer
          disabled={!isEnabled}
          isLoading={isLoading}
          value={questionInput}
          onChange={onQuestionInputChange}
          onSubmit={onQuestionSubmit}
        />
      </div>
    </main>
  )
}
