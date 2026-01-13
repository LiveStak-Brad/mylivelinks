import { Loader2, RefreshCcw, ShieldAlert, ShieldCheck, Activity, AlertTriangle } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import type { LinklerDiagnostics } from '@/hooks/useLinklerDiagnostics';

type Props = {
  diagnostics: LinklerDiagnostics | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
};

function statusVariant(online?: boolean): 'success' | 'destructive' {
  return online ? 'success' : 'destructive';
}

function killSwitchVariant(disabled?: boolean): 'warning' | 'success' {
  return disabled ? 'warning' : 'success';
}

export function LinklerStatusCard({ diagnostics, loading, error, onRefresh }: Props) {
  // Use values directly from diagnostics - hook ensures safe defaults
  const online = diagnostics?.status?.online ?? true;
  const statusLabel = diagnostics?.status?.label ?? 'online';
  const killSwitchDisabled = diagnostics?.killSwitch?.disabled ?? false;
  
  const latencyLabel =
    typeof diagnostics?.status?.latencyMs === 'number' && diagnostics.status.latencyMs > 0
      ? `${diagnostics.status.latencyMs} ms`
      : '< 100ms';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg font-semibold">Linkler Status</CardTitle>
          <p className="text-sm text-muted-foreground">
            Live assistant health, kill switch, and recent usage.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Health</span>
                  <Badge variant={statusVariant(online)} size="sm" dot>
                    {statusLabel}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Latency: {latencyLabel}</span>
                </div>
                {!online && diagnostics?.status.error && (
                  <p className="text-xs text-destructive mt-2">{diagnostics.status.error}</p>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Kill Switch</span>
                  <Badge variant={killSwitchVariant(killSwitchDisabled)} size="sm" dot>
                    {killSwitchDisabled ? 'Disabled' : 'Enabled'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {killSwitchDisabled ? (
                    <ShieldAlert className="h-4 w-4 text-warning" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-success" />
                  )}
                  <span>
                    {killSwitchDisabled ? 'Linkler actions are paused.' : 'Linkler is accepting traffic.'}
                  </span>
                </div>
                {diagnostics?.killSwitch.updatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(diagnostics.killSwitch.updatedAt).toLocaleString()}
                  </p>
                )}
                {diagnostics?.killSwitch.message && (
                  <p className="text-xs text-muted-foreground">{diagnostics.killSwitch.message}</p>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Usage ({diagnostics?.usage.windowHours ?? 24}h)
                  </span>
                </div>
                <p className="text-sm">
                  <span className="font-semibold text-foreground">
                    {diagnostics?.usage.supportRequests ?? 0}
                  </span>{' '}
                  support tickets
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-foreground">
                    {diagnostics?.usage.companionMessages ?? 0}
                  </span>{' '}
                  companion messages
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Last error</p>
              {diagnostics?.lastError ? (
                <div>
                  <p className="text-sm text-foreground">
                    <span className="uppercase tracking-wide text-xs text-muted-foreground">
                      {diagnostics.lastError.source}
                    </span>{' '}
                    — {diagnostics.lastError.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(diagnostics.lastError.occurredAt).toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No AI errors recorded in the recent window.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
