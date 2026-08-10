import { useCallback, useEffect, useRef, useState } from 'react';
import { mapComdirectTransactions } from '../domain/comdirectImport';
import type { ComdirectTransaction } from '../domain/comdirectImport';
import { AppLogger } from '../utils/AppLogger';
import type { RawImportTransaction } from '../domain/jsonToImportDraft';

export interface ComdirectConfig {
  clientId: string;
  clientSecret: string;
}

export type BankFetchStatus =
  'idle' | 'login' | 'awaiting_confirmation' | 'confirming' | 'authorizing' | 'done' | 'error';

interface ComdirectStartLoginParams {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  startDate: string;
  endDate: string;
  iban: string;
}

interface ComdirectResult {
  success: boolean;
  transactions?: unknown[];
  balanceEUR?: number | null;
  challengeType?: string | null;
  error?: string;
  step?: string;
  httpStatus?: number;
  expired?: boolean;
}

interface ComdirectElectronAPI {
  isElectron: boolean;
  comdirectLoadConfig: () => Promise<ComdirectConfig>;
  comdirectSaveConfig: (config: ComdirectConfig) => Promise<{ success: boolean }>;
  comdirectStartLogin: (params: ComdirectStartLoginParams) => Promise<ComdirectResult>;
  comdirectConfirmTan: () => Promise<ComdirectResult>;
  comdirectCancelFetch: () => Promise<{ success: boolean }>;
  onComdirectStatus: (callback: (status: BankFetchStatus) => void) => () => void;
  onComdirectDebug: (
    callback: (debugEvent: string, detail: Record<string, unknown>) => void
  ) => () => void;
}

function getElectronAPI(): ComdirectElectronAPI | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { electronAPI?: ComdirectElectronAPI }).electronAPI || null;
}

const STATUS_LABELS: Partial<Record<BankFetchStatus, string>> = {
  login: 'Anmeldung läuft…',
  awaiting_confirmation: 'Bitte in der Comdirect-App bestätigen…',
  confirming: 'Bestätigung wird geprüft…',
  authorizing: 'Konten und Umsätze werden abgerufen…',
  done: 'Fertig.',
};

export function useBankFetch(
  iban: string,
  onImported: (transactions: RawImportTransaction[], balanceEUR: number | null) => void
) {
  const electronAPI = getElectronAPI();
  const isElectron = !!electronAPI?.isElectron;

  const [config, setConfig] = useState<ComdirectConfig>({ clientId: '', clientSecret: '' });
  const [saveConfig, setSaveConfig] = useState(true);
  const [status, setStatus] = useState<BankFetchStatus>('idle');
  const [error, setError] = useState('');
  const [challengeType, setChallengeType] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const debugUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!electronAPI) return;
    electronAPI.comdirectLoadConfig().then((loaded) => {
      if (loaded) setConfig(loaded);
    });
  }, [electronAPI]);

  const unsubscribeAll = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    debugUnsubscribeRef.current?.();
    debugUnsubscribeRef.current = null;
  }, []);

  useEffect(() => unsubscribeAll, [unsubscribeAll]);

  const startLogin = useCallback(
    async (params: { username: string; password: string; startDate: string; endDate: string }) => {
      if (!electronAPI || !iban) return;
      setError('');
      setChallengeType(null);
      setStatus('login');
      AppLogger.log('COMDIRECT-ABRUF GESTARTET', {});

      unsubscribeRef.current = electronAPI.onComdirectStatus((nextStatus) => setStatus(nextStatus));
      if (AppLogger.isDebugMode()) {
        debugUnsubscribeRef.current = electronAPI.onComdirectDebug((debugEvent, detail) => {
          AppLogger.log('COMDIRECT-DEBUG', { schritt: debugEvent, ...detail });
        });
      }

      if (saveConfig) {
        await electronAPI.comdirectSaveConfig(config);
      }

      const result = await electronAPI.comdirectStartLogin({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        username: params.username,
        password: params.password,
        startDate: params.startDate,
        endDate: params.endDate,
        iban,
      });

      if (!result.success) {
        unsubscribeAll();
        setStatus('error');
        setError(result.error || 'Der Abruf ist fehlgeschlagen.');
        AppLogger.log('COMDIRECT-ABRUF FEHLGESCHLAGEN', {
          error: result.error,
          schritt: result.step,
          httpStatus: result.httpStatus,
        });
        return;
      }

      setChallengeType(result.challengeType ?? null);
      setStatus('awaiting_confirmation');
      AppLogger.log('COMDIRECT-TAN AUSSTEHEND', { typ: result.challengeType });
    },
    [config, saveConfig, electronAPI, iban, unsubscribeAll]
  );

  const confirmTan = useCallback(async () => {
    if (!electronAPI) return;
    setError('');
    setStatus('confirming');
    AppLogger.log('COMDIRECT-TAN BESTAETIGUNG ANGEFORDERT', {});

    const result = await electronAPI.comdirectConfirmTan();

    if (!result.success) {
      AppLogger.log('COMDIRECT-ABRUF FEHLGESCHLAGEN', {
        error: result.error,
        schritt: result.step,
        httpStatus: result.httpStatus,
        expired: result.expired,
      });
      if (result.expired) {
        unsubscribeAll();
        setStatus('error');
        setError(
          `${result.error || 'Die TAN-Anfrage ist abgelaufen.'} Bitte den Vorgang neu starten.`
        );
      } else {
        // Not yet confirmed — let the user try again without losing the challenge.
        setStatus('awaiting_confirmation');
        setError(result.error || 'Die TAN wurde noch nicht bestätigt.');
      }
      return;
    }

    unsubscribeAll();
    setStatus('done');
    AppLogger.log('COMDIRECT-ABRUF FERTIG', { count: result.transactions?.length || 0 });
    onImported(
      mapComdirectTransactions((result.transactions || []) as ComdirectTransaction[], iban),
      result.balanceEUR ?? null
    );
  }, [electronAPI, unsubscribeAll, onImported, iban]);

  const cancel = useCallback(() => {
    unsubscribeAll();
    electronAPI?.comdirectCancelFetch();
  }, [electronAPI, unsubscribeAll]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError('');
    setChallengeType(null);
  }, []);

  const isBusy = status === 'login' || status === 'confirming' || status === 'authorizing';

  return {
    isElectron,
    config,
    setConfig,
    saveConfig,
    setSaveConfig,
    status,
    statusLabel: STATUS_LABELS[status] || '',
    isBusy,
    error,
    challengeType,
    startLogin,
    confirmTan,
    cancel,
    reset,
  };
}
