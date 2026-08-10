const crypto = require('crypto');

const OAUTH_TOKEN_URL = 'https://api.comdirect.de/oauth/token';
const API_BASE_URL = 'https://api.comdirect.de/api';
const ERROR_DETAIL_MAX_LENGTH = 300;

function randomRequestId() {
  return String(Date.now()).slice(-9);
}

function requestInfoHeader(sessionId) {
  return JSON.stringify({
    clientRequestId: {
      sessionId,
      requestId: randomRequestId(),
    },
  });
}

async function parseJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

// Extracts a short, human-readable reason from a comdirect error body (e.g.
// {"messages":[{"key":"...","message":"..."}]} or {"error_description":"..."}).
// Contains only comdirect's own status text, never request payloads/credentials.
function extractErrorDetail(data) {
  if (!data) return null;
  const fromMessages = Array.isArray(data.messages)
    ? data.messages
        .map((m) => m.message || m.text || m.key)
        .filter(Boolean)
        .join('; ')
    : null;
  const detail = data.error_description || fromMessages || data.message || null;
  if (!detail) return null;
  return String(detail).slice(0, ERROR_DETAIL_MAX_LENGTH);
}

function isExpiredDetail(detail) {
  if (!detail) return false;
  return /expired|abgelaufen/i.test(detail);
}

class ComdirectApiError extends Error {
  constructor(message, { step, httpStatus, expired } = {}) {
    super(message);
    this.step = step;
    this.httpStatus = httpStatus;
    this.expired = !!expired;
  }
}

async function fetchPreAuthToken({ clientId, clientSecret, username, password, onDebug }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    username,
    password,
    grant_type: 'password',
  });
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await parseJsonResponse(response);
  const detail = extractErrorDetail(data);
  onDebug?.('login', { httpStatus: response.status, ok: response.ok, detail });
  if (!response.ok) {
    throw new ComdirectApiError(detail || 'Anmeldung fehlgeschlagen (Zugangsnummer/PIN prüfen).', {
      step: 'login',
      httpStatus: response.status,
    });
  }
  return data;
}

async function createSession({ accessToken, sessionId, onDebug }) {
  const response = await fetch(`${API_BASE_URL}/session/clients/user/v1/sessions`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-http-request-info': requestInfoHeader(sessionId),
      Accept: 'application/json',
    },
  });
  const sessions = await parseJsonResponse(response);
  const ok = response.ok && Array.isArray(sessions) && sessions.length > 0;
  const detail = ok ? null : extractErrorDetail(sessions);
  onDebug?.('session', {
    httpStatus: response.status,
    ok,
    sessionCount: Array.isArray(sessions) ? sessions.length : 0,
    detail,
  });
  if (!ok) {
    throw new ComdirectApiError(detail || 'Sitzung konnte nicht angelegt werden.', {
      step: 'session',
      httpStatus: response.status,
    });
  }
  return sessions[0];
}

async function validateSession({ accessToken, sessionId, session, onDebug }) {
  const response = await fetch(
    `${API_BASE_URL}/session/clients/user/v1/sessions/${session.identifier}/validate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-http-request-info': requestInfoHeader(sessionId),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        identifier: session.identifier,
        sessionTanActive: true,
        activated2FA: true,
      }),
    }
  );
  if (!response.ok) {
    const detail = extractErrorDetail(await parseJsonResponse(response));
    onDebug?.('tan_requested', { httpStatus: response.status, ok: false, detail });
    throw new ComdirectApiError(detail || 'TAN-Anforderung fehlgeschlagen.', {
      step: 'tan_requested',
      httpStatus: response.status,
    });
  }
  const authInfoHeader = response.headers.get('x-once-authentication-info');
  const validatedSession = await parseJsonResponse(response);
  let challenge = null;
  try {
    challenge = authInfoHeader ? JSON.parse(authInfoHeader) : null;
  } catch {
    challenge = null;
  }
  onDebug?.('tan_requested', {
    httpStatus: response.status,
    ok: !!challenge?.id,
    challengeType: challenge?.typ || null,
  });
  if (!challenge?.id) {
    throw new ComdirectApiError('Keine TAN-Challenge von comdirect erhalten.', {
      step: 'tan_requested',
      httpStatus: response.status,
    });
  }
  return { challenge, validatedSession: validatedSession || session };
}

// Performs the full login + TAN-challenge request. Comdirect invalidates a
// PushTAN challenge the moment a confirmation attempt is made before the user
// has actually approved it in the app, so this step must NOT be followed by
// automatic polling — the caller waits for explicit user confirmation and
// then calls confirmTan() exactly once per attempt.
async function loginAndRequestTan({ clientId, clientSecret, username, password, onDebug }) {
  const preAuth = await fetchPreAuthToken({ clientId, clientSecret, username, password, onDebug });
  const sessionId = crypto.randomUUID();
  const session = await createSession({ accessToken: preAuth.access_token, sessionId, onDebug });
  const { challenge } = await validateSession({
    accessToken: preAuth.access_token,
    sessionId,
    session,
    onDebug,
  });
  return {
    accessToken: preAuth.access_token,
    sessionId,
    session,
    challengeId: challenge.id,
    challengeType: challenge.typ || null,
  };
}

// Makes exactly one confirmation attempt against the already-requested TAN
// challenge. Throws a ComdirectApiError with `expired: true` if comdirect
// reports the challenge as expired/invalidated (the whole flow must then be
// restarted with a fresh challenge), or `expired: false` if it was simply not
// confirmed yet (the caller may let the user retry).
async function confirmTan({ accessToken, sessionId, session, challengeId, onDebug }) {
  const response = await fetch(
    `${API_BASE_URL}/session/clients/user/v1/sessions/${session.identifier}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-http-request-info': requestInfoHeader(sessionId),
        'x-once-authentication-info': JSON.stringify({ id: challengeId }),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        identifier: session.identifier,
        sessionTanActive: true,
        activated2FA: true,
      }),
    }
  );
  if (response.ok) {
    onDebug?.('tan_pending', { httpStatus: response.status, ok: true });
    return parseJsonResponse(response);
  }
  const detail = extractErrorDetail(await parseJsonResponse(response));
  const expired = isExpiredDetail(detail);
  onDebug?.('tan_pending', { httpStatus: response.status, ok: false, detail, expired });
  throw new ComdirectApiError(detail || 'Die TAN wurde noch nicht in der App bestätigt.', {
    step: 'tan_pending',
    httpStatus: response.status,
    expired,
  });
}

async function fetchSecondaryToken({ clientId, clientSecret, cdSecondaryToken, onDebug }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'cd_secondary',
    token: cdSecondaryToken,
  });
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await parseJsonResponse(response);
  const detail = extractErrorDetail(data);
  onDebug?.('authorizing', { httpStatus: response.status, ok: response.ok, detail });
  if (!response.ok) {
    throw new ComdirectApiError(detail || 'Freigabe der Sitzung fehlgeschlagen.', {
      step: 'authorizing',
      httpStatus: response.status,
    });
  }
  return data;
}

async function fetchAccountBalances({ accessToken, sessionId, onDebug }) {
  const response = await fetch(`${API_BASE_URL}/banking/clients/user/v2/accounts/balances`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-http-request-info': requestInfoHeader(sessionId),
      Accept: 'application/json',
    },
  });
  const data = await parseJsonResponse(response);
  const values = data?.values || [];
  const detail = response.ok ? null : extractErrorDetail(data);
  onDebug?.('accounts', {
    httpStatus: response.status,
    ok: response.ok,
    accountCount: values.length,
    detail,
  });
  if (!response.ok) {
    throw new ComdirectApiError(detail || 'Konten konnten nicht abgerufen werden.', {
      step: 'accounts',
      httpStatus: response.status,
    });
  }
  return values;
}

async function fetchAccountTransactions({
  accessToken,
  sessionId,
  accountId,
  startDate,
  endDate,
  onDebug,
}) {
  const results = [];
  let paging = { index: 0 };
  let page = 0;
  for (;;) {
    page += 1;
    const params = new URLSearchParams({
      'min-bookingDate': startDate,
      'max-bookingDate': endDate,
      transactionState: 'BOOKED',
      transactionDirection: 'CREDIT_AND_DEBIT',
      'paging-first': String(paging.index),
    });
    const response = await fetch(
      `${API_BASE_URL}/banking/v1/accounts/${accountId}/transactions?${params}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-http-request-info': requestInfoHeader(sessionId),
          Accept: 'application/json',
        },
      }
    );
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      const detail = extractErrorDetail(data);
      onDebug?.('transactions', { httpStatus: response.status, ok: false, page, detail });
      throw new ComdirectApiError(detail || 'Umsätze konnten nicht abgerufen werden.', {
        step: 'transactions',
        httpStatus: response.status,
      });
    }
    const values = data?.values || [];
    results.push(...values);
    const matches = data?.paging?.matches ?? results.length;
    onDebug?.('transactions', {
      httpStatus: response.status,
      ok: true,
      page,
      pageCount: values.length,
      totalMatches: matches,
    });
    if (results.length >= matches || values.length === 0) break;
    paging = { index: results.length };
  }
  return results;
}

function normalizeIban(iban) {
  return String(iban || '')
    .replace(/\s+/g, '')
    .toUpperCase();
}

// Runs after a confirmed TAN: exchanges the pre-auth token for a full-scope
// access token, finds the local account's comdirect counterpart by IBAN, and
// fetches its transactions for the requested date range.
async function fetchAccountsAndTransactions({
  clientId,
  clientSecret,
  preAuthAccessToken,
  sessionId,
  iban,
  startDate,
  endDate,
  onDebug,
}) {
  const secondaryToken = await fetchSecondaryToken({
    clientId,
    clientSecret,
    cdSecondaryToken: preAuthAccessToken,
    onDebug,
  });

  const balances = await fetchAccountBalances({
    accessToken: secondaryToken.access_token,
    sessionId,
    onDebug,
  });

  const targetIban = normalizeIban(iban);
  const matchedBalance = balances.find(
    (balance) => normalizeIban(balance?.account?.iban) === targetIban
  );
  onDebug?.('account_match', { matched: !!matchedBalance?.account?.accountId });
  if (!matchedBalance?.account?.accountId) {
    throw new ComdirectApiError('Kein comdirect-Konto mit dieser IBAN gefunden.', {
      step: 'account_match',
    });
  }

  const allTransactions = await fetchAccountTransactions({
    accessToken: secondaryToken.access_token,
    sessionId,
    accountId: matchedBalance.account.accountId,
    startDate,
    endDate,
    onDebug,
  });

  const balanceEUR = Number(matchedBalance.balanceEUR?.value);

  return {
    transactions: allTransactions,
    balanceEUR: Number.isFinite(balanceEUR) ? balanceEUR : null,
  };
}

module.exports = {
  loginAndRequestTan,
  confirmTan,
  fetchAccountsAndTransactions,
  ComdirectApiError,
};
