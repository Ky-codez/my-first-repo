/**
 * Terms of Service + Privacy Policy.
 * Reachable at /terms and /privacy (and linked from the age gate + login).
 * Plain, readable starter policies — have a lawyer review before a big launch.
 */

const CONTACT = 'support@sipiary.app';   // ← change to your real contact inbox
const UPDATED = 'June 16, 2026';

function Terms() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: {UPDATED}</p>

      <h2>1. Who can use Sipiary</h2>
      <p>
        Sipiary is a wine journal and social app. You may only use it if you are
        of <strong>legal drinking age in your country or region</strong> and can
        form a binding agreement with us. By using Sipiary you confirm that you
        meet this requirement.
      </p>

      <h2>2. Your account</h2>
      <p>
        You are responsible for your account and for keeping your password
        secure. Don't share your login, and let us know if you suspect
        unauthorized access. You're responsible for activity that happens under
        your account.
      </p>

      <h2>3. Your content</h2>
      <p>
        You keep ownership of the wines, notes, photos and other content you
        post. By posting, you grant Sipiary a non-exclusive license to store and
        display that content so the app can function (for example, showing your
        reviews in feeds and on shareable cards). You are responsible for what
        you post and confirm you have the right to share it.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>post unlawful, hateful, harassing, or infringing content;</li>
        <li>impersonate others or misrepresent your affiliation;</li>
        <li>spam, scrape, or abuse the service or other users;</li>
        <li>attempt to break, overload, or reverse-engineer the platform.</li>
      </ul>

      <h2>5. Drink responsibly</h2>
      <p>
        Sipiary celebrates wine as a hobby. Nothing here encourages excessive or
        underage drinking. Please enjoy responsibly and follow the laws where you
        live.
      </p>

      <h2>6. Service "as is"</h2>
      <p>
        Sipiary is provided "as is," without warranties of any kind. We don't
        guarantee the service will always be available, error-free, or that
        content is accurate. To the fullest extent permitted by law, we are not
        liable for indirect or consequential damages arising from your use of
        the service.
      </p>

      <h2>7. Ending use</h2>
      <p>
        You can stop using Sipiary and delete your content at any time. We may
        suspend or remove accounts that violate these terms.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these terms as the app evolves. We'll update the date
        above when we do; continued use means you accept the changes.
      </p>

      <h2>9. Contact</h2>
      <p>Questions? Reach us at <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: {UPDATED}</p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Account info</strong> — your username and email address.</li>
        <li><strong>Content you create</strong> — wines, ratings, tasting notes, photos, and who you follow.</li>
        <li><strong>Basic usage data</strong> — needed to operate the app (e.g. login sessions).</li>
      </ul>

      <h2>2. How we use it</h2>
      <p>
        We use your data to run the service: to show your journal and feeds, to
        personalize recommendations from your own taste, and to keep the
        platform secure. That's it.
      </p>

      <h2>3. What we don't do</h2>
      <p>
        We do <strong>not</strong> sell your personal data. We don't share it
        with advertisers.
      </p>

      <h2>4. Cookies &amp; local storage</h2>
      <p>
        We use your browser's local storage to keep you logged in and to
        remember preferences (like theme and language). We don't use third-party
        advertising trackers.
      </p>

      <h2>5. Service providers</h2>
      <p>
        We rely on a hosting provider to run the app. If you use optional
        AI-powered features (such as label scanning), the relevant image or text
        may be processed by an AI provider solely to return that result.
      </p>

      <h2>6. Your choices</h2>
      <p>
        You can edit or delete your wines at any time, and you can request
        deletion of your account and associated data by contacting us.
      </p>

      <h2>7. Security</h2>
      <p>
        We take reasonable measures to protect your data (passwords are hashed,
        traffic is served over HTTPS). No online service is 100% secure, but we
        work to keep your information safe.
      </p>

      <h2>8. Age</h2>
      <p>
        Sipiary is intended only for people of legal drinking age. It is not
        directed at anyone below that age.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy; we'll revise the date above when we do.
      </p>

      <h2>10. Contact</h2>
      <p>Privacy questions? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </>
  );
}

export default function LegalPage({ page, onBack }) {
  return (
    <div className="legal-page">
      <div className="legal-box">
        <button className="legal-back" onClick={onBack}>← Back to Sipiary</button>
        <div className="legal-content">
          {page === 'privacy' ? <Privacy /> : <Terms />}
        </div>
        <p className="legal-footer-note">Sipiary · please enjoy wine responsibly</p>
      </div>
    </div>
  );
}
