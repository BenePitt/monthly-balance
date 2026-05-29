import { useEffect } from 'react';
import { legalData } from '../legal/legalData';

const privacyPolicyLinks = {
  github: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
  fastly: 'https://www.fastly.com/privacy',
  baylda: 'https://www.lda.bayern.de/',
};

function ContactDetails() {
  return (
    <>
      <p>{legalData.name}</p>
      <p>{legalData.street}</p>
      <p>{legalData.zip} {legalData.city}</p>
      {legalData.phone && <p>Telefon: {legalData.phone}</p>}
      {legalData.email && (
        <p>
          E-Mail:{' '}
          <a href={`mailto:${legalData.email}`} className="legal-link">
            {legalData.email}
          </a>
        </p>
      )}
      {legalData.website && (
        <p>
          Website:{' '}
          <a href={legalData.website} target="_blank" rel="noopener noreferrer" className="legal-link">
            {legalData.website}
          </a>
        </p>
      )}
    </>
  );
}

function ImpressumContent() {
  return (
    <div className="legal-content">
      <section>
        <h3>Angaben gemäß § 5 DDG (vormals § 5 TMG)</h3>
        <ContactDetails />
      </section>

      <section>
        <h3>Kontakt</h3>
        {legalData.phone && <p>Telefon: {legalData.phone}</p>}
        {legalData.email && (
          <p>
            E-Mail:{' '}
            <a href={`mailto:${legalData.email}`} className="legal-link">
              {legalData.email}
            </a>
          </p>
        )}
        {legalData.website && (
          <p>
            Website:{' '}
            <a href={legalData.website} target="_blank" rel="noopener noreferrer" className="legal-link">
              {legalData.website}
            </a>
          </p>
        )}
      </section>

      <section>
        <h3>Haftungsausschluss</h3>
        <p>
          Diese Webseite ist ein privates Freizeitprojekt ohne kommerziellen Hintergrund.
          Es besteht kein Anspruch auf Vollständigkeit oder Aktualität.
        </p>
      </section>

      <section>
        <h3>Urheberrecht</h3>
        <p>
          Die eigenen Inhalte dieser Webseite unterliegen dem deutschen Urheberrecht.
          Eine Vervielfältigung, Bearbeitung oder Verbreitung außerhalb der Grenzen
          des Urheberrechts bedarf der vorherigen Zustimmung des jeweiligen Rechteinhabers.
          Es besteht keine Verbindung zu Markeninhabern von Namen, Logos oder Daten,
          die im Rahmen dieses privaten Projekts beispielhaft genannt oder verarbeitet werden.
        </p>
      </section>
    </div>
  );
}

function DatenschutzContent() {
  const externalServices = legalData.externalServices || [];

  return (
    <div className="legal-content">
      <section>
        <h3>1. Verantwortlicher</h3>
        <ContactDetails />
      </section>

      <section>
        <h3>2. Erhebung und Verarbeitung</h3>
        <p>
          Diese Webseite erhebt und speichert durch den Betreiber keine personenbezogenen
          Daten. Es werden keine Cookies gesetzt, kein Tracking durchgeführt und keine
          Nutzerdaten an Dritte weitergegeben. Eingegebene oder importierte Finanzdaten
          werden in der statischen Webversion nur lokal im Arbeitsspeicher des Browsers
          verarbeitet.
        </p>
      </section>

      {externalServices.length > 0 && (
        <section>
          <h3>3. Externe Dienste</h3>
          {externalServices.map((service) => (
            <p key={`${service.name}-${service.url}`}>
              <strong>{service.name}</strong>
              {service.url && (
                <>
                  {' '}(
                  <a href={service.url} target="_blank" rel="noopener noreferrer" className="legal-link">
                    {service.url}
                  </a>
                  )
                </>
              )}
              : {service.purpose}. Es gelten die Datenschutzbestimmungen des jeweiligen Anbieters.
            </p>
          ))}
        </section>
      )}

      <section>
        <h3>4. Hosting</h3>
        <p>
          Diese Webseite kann über GitHub Pages bereitgestellt werden. Anbieter ist GitHub,
          Inc., ein Unternehmen von Microsoft. Beim Abruf der Seite können technisch
          erforderliche Daten wie die IP-Adresse, Datum und Uhrzeit der Anfrage, Browser-
          und Betriebssysteminformationen sowie die angeforderte Ressource verarbeitet werden.
          GitHub Pages nutzt zur Auslieferung unter anderem ein Content Delivery Network von
          Fastly. Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO,
          da ein berechtigtes Interesse an der sicheren und effizienten Bereitstellung der
          Webseite besteht.
        </p>
        <p>
          Weitere Informationen finden Sie in der{' '}
          <a href={privacyPolicyLinks.github} target="_blank" rel="noopener noreferrer" className="legal-link">
            GitHub Privacy Policy
          </a>
          {' '}und der{' '}
          <a href={privacyPolicyLinks.fastly} target="_blank" rel="noopener noreferrer" className="legal-link">
            Fastly Privacy Policy
          </a>
          .
        </p>
      </section>

      <section>
        <h3>5. Ihre Rechte</h3>
        <p>
          Sie haben nach Maßgabe der DSGVO insbesondere Rechte auf Auskunft,
          Berichtigung, Löschung, Einschränkung der Verarbeitung und Widerspruch.
          Da diese Webseite durch den Betreiber keine personenbezogenen Daten erhebt,
          ist eine entsprechende Anfrage voraussichtlich gegenstandslos.
        </p>
        <p>
          Für Beschwerden können Sie sich an die zuständige Datenschutzaufsichtsbehörde
          wenden, in Bayern insbesondere an das{' '}
          <a href={privacyPolicyLinks.baylda} target="_blank" rel="noopener noreferrer" className="legal-link">
            Bayerische Landesamt für Datenschutzaufsicht
          </a>
          .
        </p>
      </section>
    </div>
  );
}

export function LegalModal({ view, onClose }) {
  const title = view === 'impressum' ? 'Impressum' : 'Datenschutzerklärung';

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="legal-overlay" onClick={onClose} role="presentation">
      <div
        className="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="legal-modal-header">
          <h2 id="legal-modal-title">{title}</h2>
          <button type="button" className="legal-close-button" onClick={onClose} aria-label="Modal schließen">
            ×
          </button>
        </header>
        <div className="legal-modal-body">
          {view === 'impressum' ? <ImpressumContent /> : <DatenschutzContent />}
        </div>
      </div>
    </div>
  );
}
