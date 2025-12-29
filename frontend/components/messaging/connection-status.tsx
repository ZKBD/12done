'use client';

import { Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { forceReconnect } from '@/lib/socket';
import type { ConnectionStatus } from '@/hooks/use-messaging-socket';

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  pendingMessages?: number;
  className?: string;
  showLabel?: boolean;
}

export function ConnectionStatusIndicator({
  status,
  pendingMessages = 0,
  className,
  showLabel = true,
}: ConnectionStatusIndicatorProps) {
  const handleReconnect = () => {
    forceReconnect();
  };

  if (status === 'connected') {
    // Don't show anything when connected (normal state)
    return null;
  }

  return (
    <div
      data-testid="connection-status"
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
        status === 'offline' && 'bg-destructive/10 text-destructive',
        status === 'disconnected' && 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        status === 'connecting' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        className
      )}
    >
      {status === 'offline' && (
        <>
          <WifiOff className="h-4 w-4" />
          {showLabel && <span>You're offline</span>}
        </>
      )}

      {status === 'disconnected' && (
        <>
          <Wifi className="h-4 w-4" />
          {showLabel && <span>Disconnected</span>}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReconnect}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reconnect
          </Button>
        </>
      )}

      {status === 'connecting' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {showLabel && <span>Connecting...</span>}
        </>
      )}

      {pendingMessages > 0 && (
        <span className="text-xs opacity-75">
          ({pendingMessages} message{pendingMessages !== 1 ? 's' : ''} pending)
        </span>
      )}
    </div>
  );
}

// Banner version for top of page
interface ConnectionBannerProps {
  status: ConnectionStatus;
  pendingMessages?: number;
}

export function ConnectionBanner({
  status,
  pendingMessages = 0,
}: ConnectionBannerProps) {
  if (status === 'connected') {
    return null;
  }

  const handleReconnect = () => {
    forceReconnect();
  };

  return (
    <div
      data-testid="connection-banner"
      className={cn(
        'w-full py-2 px-4 text-center text-sm font-medium',
        status === 'offline' && 'bg-destructive text-destructive-foreground',
        status === 'disconnected' && 'bg-yellow-500 text-yellow-950',
        status === 'connecting' && 'bg-blue-500 text-white'
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {status === 'offline' && (
          <>
            <WifiOff className="h-4 w-4" />
            <span>You're offline. Messages will be sent when you reconnect.</span>
          </>
        )}

        {status === 'disconnected' && (
          <>
            <Wifi className="h-4 w-4" />
            <span>Connection lost.</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReconnect}
              className="h-6 px-2 text-xs ml-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reconnect
            </Button>
          </>
        )}

        {status === 'connecting' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Reconnecting...</span>
          </>
        )}

        {pendingMessages > 0 && status !== 'connecting' && (
          <span className="ml-2 opacity-75">
            ({pendingMessages} pending)
          </span>
        )}
      </div>
    </div>
  );
}
