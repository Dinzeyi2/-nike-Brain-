import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

const exampleMessages = [
  {
    heading: 'What are the foundational principles behind Nike marketing strategies?',
    message: 'What are the foundational principles behind Nike marketing strategies?'
  },
  {
    heading: 'How does Nike utilize athlete endorsements to enhance its brand appeal?',
    message: 'How does Nike utilize athlete endorsements to enhance its brand appeal?'
  },
  {
    heading: 'Can you explain the psychological impact of Nike slogan Just Do It on consumer motivation?',
    message: 'Can you explain the psychological impact of Nike slogan Just Do It on consumer motivation?'
  },
  {
    heading: 'What innovative advertising techniques has Nike introduced in its recent campaigns?',
    message: 'What innovative advertising techniques has Nike introduced in its recent campaigns?'
  }
]
export function EmptyScreen({
  submitMessage,
  className
}: {
  submitMessage: (message: string) => void
  className?: string
}) {
  return (
    <div className={`mx-auto w-full transition-all ${className}`}>
      <div className="bg-background p-2">
        <div className="mt-4 flex flex-col items-start space-y-2 mb-4">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              name={message.message}
              onClick={async () => {
                submitMessage(message.message)
              }}
            >
              <ArrowRight size={16} className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
