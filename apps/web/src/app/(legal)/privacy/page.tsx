import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LegalSection } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Recap Agent collects, why, who processes it, and your rights.",
};

const CONTACT = "ismailpipas@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Policy" effective="October 15, 2026">
      <LegalSection title="1. Who we are">
        <p>
          Recap Agent (&ldquo;we&rdquo;, &ldquo;us&rdquo;) turns your GitHub commits into daily recaps that you can review
          and send to your managers. It is operated by an individual developer based in Morocco, who is the controller of
          the personal data described here. Contact: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
        <p>
          This policy covers the Recap Agent web platform. The open-source recap-agent command-line
          tool runs on your own computer and sends us nothing.
        </p>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <ul>
          <li>
            <strong>Account:</strong> your name, email address and profile picture from the provider you sign in with
            (GitHub, Google or Microsoft), and the sign-in tokens that provider returns. Sign-in only requests identity
            access, never access to your repositories or mailbox.
          </li>
          <li>
            <strong>Sessions:</strong> a session record with its expiry, and the IP address and browser user agent it was
            created from.
          </li>
          <li>
            <strong>GitHub connection:</strong> when you connect GitHub as your commit source, an access token with the{" "}
            <code>repo</code>, <code>read:user</code> and <code>read:org</code> scopes, your GitHub login and account ID.
          </li>
          <li>
            <strong>Groq API key:</strong> the key you add so recaps are written with your own Groq account.
          </li>
          <li>
            <strong>Connected mailboxes:</strong> for each Gmail or Outlook mailbox you connect, its email address and the
            access and refresh tokens for the send-only permission (Gmail <code>gmail.send</code>, Microsoft Graph{" "}
            <code>Mail.Send</code>).
          </li>
          <li>
            <strong>Your content:</strong> the managers you add (names and email addresses), your schedules and their
            repository selection, generated recaps, the history of generation runs, and a log of every send (sender,
            recipients, time, outcome).
          </li>
        </ul>
        <p>
          We do not store your commits. When a recap is generated we read them from GitHub, use them to write the recap,
          and keep only the recap.
        </p>
      </LegalSection>

      <LegalSection title="3. How we use it">
        <ul>
          <li>To sign you in and keep you signed in.</li>
          <li>
            To generate recaps: we list the repositories you chose and read your commits for the day (repository names,
            commit messages and dates) from the GitHub API.
          </li>
          <li>
            To write the recap, we send those commit messages, shortened, to Groq with your own API key. Groq processes
            them under its own terms and privacy policy.
          </li>
          <li>
            To send a recap from your connected mailbox to the recipients you chose, through the Gmail API or Microsoft
            Graph, only after you confirm it or for a schedule where you explicitly turned on automatic sending.
          </li>
          <li>
            To email you about your own recaps (ready to review, sent automatically, or failed) through our email provider.
            We never send recaps to anyone through this provider, and we send no marketing email.
          </li>
        </ul>
        <p>
          The legal bases are the performance of our agreement with you (the Terms of Service) and, for connecting GitHub
          and mailboxes, your consent, which you can withdraw at any time by disconnecting them.
        </p>
      </LegalSection>

      <LegalSection title="4. Google and Microsoft user data">
        <p>
          Recap Agent&apos;s use and transfer of information received from Google APIs adheres to the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <ul>
          <li>
            We only request permission to <strong>send</strong> email. We cannot read, search, modify or delete the
            messages in your mailbox.
          </li>
          <li>
            We use that permission solely to send the recaps you confirmed, or opted into sending automatically, to the
            recipients you chose.
          </li>
          <li>
            We do not use Google or Microsoft user data for advertising, do not sell it, do not use it to train AI
            models, and do not transfer it to anyone except as needed to provide this feature, to comply with the law, or
            with your consent.
          </li>
          <li>No human reads your Google or Microsoft data, except with your permission or where the law requires it.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Service providers">
        <p>We rely on these providers to run Recap Agent. They process data on our behalf, or on yours where noted:</p>
        <ul>
          <li>
            <strong>Vercel</strong> (web hosting, United States).
          </li>
          <li>
            <strong>Neon</strong> (database, Frankfurt, Germany).
          </li>
          <li>
            <strong>Railway</strong> (background worker that generates and sends recaps, Netherlands).
          </li>
          <li>
            <strong>Resend</strong> (notification emails to you, United States).
          </li>
          <li>
            <strong>GitHub, Google, Microsoft</strong> (sign-in, commit source and mailboxes, under your accounts).
          </li>
          <li>
            <strong>Groq</strong> (writing recaps, with your own API key and under your agreement with Groq).
          </li>
        </ul>
        <p>
          Some of these providers process data outside Morocco and the European Union. We rely on their contractual and
          technical safeguards for those transfers.
        </p>
      </LegalSection>

      <LegalSection title="6. Security">
        <p>
          All traffic is encrypted in transit (HTTPS). GitHub, Groq and mailbox tokens and keys are encrypted at rest with
          AES-256-GCM, and sign-in tokens are encrypted at rest as well. Access is limited to what each feature needs.
          No system is perfectly secure; if a breach affects your data, we will notify you and the competent authority as
          the law requires.
        </p>
      </LegalSection>

      <LegalSection title="7. Retention">
        <ul>
          <li>Your data is kept while your account exists.</li>
          <li>
            Disconnecting GitHub or a mailbox deletes its tokens immediately; Google tokens are also revoked with Google.
          </li>
          <li>Deleting a recap from your history also deletes its send log. Managers and schedules can be deleted any time.</li>
          <li>
            You can delete your account at any time with <strong>Delete account</strong> in the account menu (your
            avatar). This immediately deletes all your data and revokes access to your GitHub repositories and Gmail mailboxes.
            You can also ask us by email at <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Cookies and local storage">
        <p>
          We use only what the service needs: session cookies to keep you signed in, a short-lived cookie that secures the
          GitHub and mailbox connection flows, and your browser&apos;s local storage for your light or dark theme. We do
          not use analytics, advertising or tracking cookies.
        </p>
      </LegalSection>

      <LegalSection title="9. Your rights">
        <p>
          Under Moroccan Law 09-08 on the protection of individuals with regard to the processing of personal data, and,
          if you are in the European Union, the GDPR, you can ask to access, correct or delete your data, object to or
          restrict its processing, and receive it in a portable format. Email{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>; we answer within 30 days.
        </p>
        <p>
          You can also complain to the Moroccan data protection authority (CNDP,{" "}
          <a href="https://www.cndp.ma" target="_blank" rel="noreferrer">
            cndp.ma
          </a>
          ) or, in the European Union, to your local data protection authority.
        </p>
      </LegalSection>

      <LegalSection title="10. Children">
        <p>Recap Agent is a work tool and is not intended for anyone under 16. We do not knowingly collect their data.</p>
      </LegalSection>

      <LegalSection title="11. Changes">
        <p>
          If we change this policy, we will update the effective date above, and for significant changes we will tell you
          by email or in the app before they apply. See also the <Link href="/terms">Terms of Service</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
