import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEFAULT_ACCOUNT_ID } from '../domain/account';
import { formatIban } from '../utils/formatting';

export default function Konten() {
  const { accounts, addAccount, renameAccount, updateAccountIban, deleteAccount } = useApp();
  const [newAccountName, setNewAccountName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingIbanId, setEditingIbanId] = useState(null);
  const [editingIbanValue, setEditingIbanValue] = useState('');
  const [error, setError] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    await addAccount(newAccountName);
    setNewAccountName('');
    setError('');
  }

  function startEditing(account) {
    setEditingId(account.id);
    setEditingName(account.name);
    setError('');
  }

  async function handleRename(e) {
    e.preventDefault();
    if (!editingName.trim()) return;
    await renameAccount(editingId, editingName);
    setEditingId(null);
    setEditingName('');
  }

  function startEditingIban(account) {
    setEditingIbanId(account.id);
    setEditingIbanValue(account.iban || '');
    setError('');
  }

  async function handleSaveIban(e) {
    e.preventDefault();
    await updateAccountIban(editingIbanId, editingIbanValue);
    setEditingIbanId(null);
    setEditingIbanValue('');
  }

  async function handleDelete(id) {
    try {
      await deleteAccount(id);
      setError('');
    } catch {
      setError(
        'Konto kann nicht gelöscht werden. Es ist entweder das Standardkonto oder es sind noch Transaktionen zugeordnet.'
      );
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Konten</h1>
      </div>

      <section className="section">
        <div className="card">
          <h2 className="section-title">Neues Konto anlegen</h2>
          <form
            onSubmit={handleAdd}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}
          >
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label required">
                Kontoname
                <input
                  type="text"
                  className="form-input"
                  placeholder="z.B. Sparkonto"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                />
              </label>
            </div>
            <button type="submit" className="btn btn-primary">
              Konto anlegen
            </button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h2 className="section-title">Vorhandene Konten</h2>
          {error && (
            <p className="form-error" style={{ marginBottom: '0.75rem' }}>
              {error}
            </p>
          )}
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {accounts.map((account) => (
              <li
                key={account.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {editingId === account.id ? (
                    <form
                      onSubmit={handleRename}
                      style={{ display: 'flex', gap: '0.5rem', flex: 1 }}
                    >
                      <input
                        type="text"
                        className="form-input"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="btn btn-sm btn-primary">
                        Speichern
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => setEditingId(null)}
                      >
                        Abbrechen
                      </button>
                    </form>
                  ) : (
                    <>
                      <span style={{ flex: 1 }}>
                        {account.name}
                        {account.id === DEFAULT_ACCOUNT_ID && (
                          <span
                            className="text-muted"
                            style={{ fontSize: '0.78rem', marginLeft: '0.5rem' }}
                          >
                            (Standardkonto)
                          </span>
                        )}
                      </span>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => startEditing(account)}
                      >
                        Umbenennen
                      </button>
                      {account.id !== DEFAULT_ACCOUNT_ID && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleDelete(account.id)}
                        >
                          Löschen
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {editingIbanId === account.id ? (
                    <form
                      onSubmit={handleSaveIban}
                      style={{ display: 'flex', gap: '0.5rem', flex: 1, alignItems: 'center' }}
                    >
                      <label className="form-label" style={{ flex: 1, marginBottom: 0 }}>
                        IBAN
                        <input
                          type="text"
                          className="form-input"
                          placeholder="z. B. DE89 3704 0044 0532 0130 00"
                          value={editingIbanValue}
                          onChange={(e) => setEditingIbanValue(e.target.value)}
                          autoFocus
                        />
                      </label>
                      <button type="submit" className="btn btn-sm btn-primary">
                        Speichern
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => setEditingIbanId(null)}
                      >
                        Abbrechen
                      </button>
                    </form>
                  ) : (
                    <>
                      <span
                        className="text-muted"
                        style={{ flex: 1, fontSize: '0.85rem', fontFamily: 'monospace' }}
                      >
                        {account.iban
                          ? formatIban(account.iban)
                          : 'IBAN nicht hinterlegt (erforderlich für Comdirect-Abruf)'}
                      </span>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => startEditingIban(account)}
                      >
                        {account.iban ? 'IBAN bearbeiten' : 'IBAN hinzufügen'}
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
