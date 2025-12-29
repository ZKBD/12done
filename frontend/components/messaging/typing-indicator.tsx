'use client';

interface TypingUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface TypingIndicatorProps {
  users: TypingUser[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].firstName} is typing...`;
    }
    if (users.length === 2) {
      return `${users[0].firstName} and ${users[1].firstName} are typing...`;
    }
    return 'Several people are typing...';
  };

  return (
    <div data-testid="typing-indicator" className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" />
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
}
