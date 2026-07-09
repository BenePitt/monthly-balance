import { describe, it, expect } from 'vitest';
import { createAccount, renameAccount, canDeleteAccount, DEFAULT_ACCOUNT_ID } from '../account';

describe('createAccount', () => {
  it('erzeugt ein Konto mit generierter id und getrimmtem Namen', () => {
    const account = createAccount('  Sparkonto  ');
    expect(account.id).toBeTruthy();
    expect(account.name).toBe('Sparkonto');
    expect(account.createdAt).toBeTruthy();
    expect(account.updatedAt).toBe(account.createdAt);
  });
});

describe('renameAccount', () => {
  it('liefert eine Kopie mit neuem Namen und aktualisiertem updatedAt', () => {
    const account = createAccount('Girokonto');
    const renamed = renameAccount(account, 'Gehaltskonto');
    expect(renamed.id).toBe(account.id);
    expect(renamed.name).toBe('Gehaltskonto');
    expect(renamed.createdAt).toBe(account.createdAt);
  });
});

describe('canDeleteAccount', () => {
  it('verhindert das Löschen des Standardkontos', () => {
    expect(canDeleteAccount(DEFAULT_ACCOUNT_ID, [])).toBe(false);
  });

  it('verhindert das Löschen eines Kontos mit zugeordneten Transaktionen', () => {
    const account = createAccount('Sparkonto');
    const transactions = [{ id: '1', accountId: account.id }];
    expect(canDeleteAccount(account.id, transactions)).toBe(false);
  });

  it('erlaubt das Löschen eines Kontos ohne zugeordnete Transaktionen', () => {
    const account = createAccount('Sparkonto');
    const transactions = [{ id: '1', accountId: DEFAULT_ACCOUNT_ID }];
    expect(canDeleteAccount(account.id, transactions)).toBe(true);
  });
});
