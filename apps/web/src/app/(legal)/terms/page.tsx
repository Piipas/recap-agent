import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LegalSection } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using Recap Agent.",
};

const CONTACT = "ismailpipas@gmail.com";

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of Service" effective="October 15, 2026">
      <LegalSection title="1. Agreement">
        <p>
          These terms govern your use of the Recap Agent web platform (the &ldquo;Service&rdquo;), operated by an
          individual developer based in Morocco (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By signing in, you agree to them and
          to the <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service.
        </p>
        <p>
          The open-source recap-agent command-line tool is licensed separately under the MIT License and is not covered by
          these terms.
        </p>
      </LegalSection>

      <LegalSection title="2. The Service">
        <p>
          The Service reads your commits from the GitHub repositories you choose, writes a daily recap with an AI model
          through your own Groq account, and, after you confirm it, sends the recap from your own Gmail or Outlook mailbox
          to the recipients you choose. Schedules can prepare recaps automatically and, only if you turn it on, send them
          without asking first. The Service is currently provided free of charge.
        </p>
      </LegalSection>

      <LegalSection title="3. Your account">
        <ul>
          <li>You sign in with GitHub, Google or Microsoft and must keep that account secure.</li>
          <li>You must be at least 16 years old and able to agree to these terms.</li>
          <li>You are responsible for the activity under your account.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Your responsibilities">
        <ul>
          <li>
            <strong>Repositories:</strong> only connect repositories you are allowed to share with an AI provider, and
            follow your employer&apos;s policies about source code and commit messages.
          </li>
          <li>
            <strong>Groq:</strong> you provide your own Groq API key. Your use of Groq, including any costs and limits, is
            governed by your agreement with Groq.
          </li>
          <li>
            <strong>Recaps you send:</strong> recaps are sent from your mailbox, in your name. You choose the recipients and
            are responsible for the content you send and for having a legitimate reason to email them.
          </li>
          <li>
            <strong>Review before sending:</strong> recaps are written by an AI model and can be incomplete or wrong.
            Review each recap before you confirm it. If you turn on automatic sending for a schedule, recaps are sent
            without that review, at your own responsibility.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Acceptable use">
        <p>You must not:</p>
        <ul>
          <li>use the Service to send spam, or messages that are unlawful, deceptive or harassing;</li>
          <li>
            access data or repositories you are not authorized to access, or try to access other users&apos; accounts or
            data;
          </li>
          <li>disrupt, overload or attempt to bypass the security of the Service or its providers;</li>
          <li>use the Service in a way that breaks the terms of GitHub, Google, Microsoft or Groq.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Third-party services">
        <p>
          The Service depends on GitHub, Google, Microsoft and Groq, which you use under your own accounts and their terms.
          We are not responsible for their availability or for changes to their APIs, limits or policies. You can revoke
          the Service&apos;s access at any time, in the Service or in those providers&apos; settings.
        </p>
      </LegalSection>

      <LegalSection title="7. Your content">
        <p>
          You keep all rights to your commits, recaps and other content. You give us only the permission needed to process
          them to provide the Service, as described in the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection title="8. Availability and changes">
        <p>
          We aim to keep the Service running, but do not guarantee it will be available, uninterrupted or error-free. A
          scheduled recap can be late or missed, for example during an outage. We may change, suspend or end features, and
          will give reasonable notice of significant changes when we can.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimer">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind,
          including the accuracy of AI-generated recaps and fitness for a particular purpose, to the extent the law allows.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitation of liability">
        <p>
          To the extent the law allows, we are not liable for indirect or consequential damages, or for loss of data,
          revenue or business, arising from your use of the Service, including the content of recaps you send. Nothing in
          these terms limits liability that cannot be limited under applicable law.
        </p>
      </LegalSection>

      <LegalSection title="11. Ending your use">
        <p>
          You can stop using the Service at any time and delete your account from the account menu, or ask us to by
          emailing <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We may suspend or close an account that breaks these terms, with
          notice unless the breach is serious or the law prevents it.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to these terms">
        <p>
          We may update these terms. We will change the effective date above and, for significant changes, tell you by
          email or in the app before they apply. Continuing to use the Service after that means you accept the new terms.
        </p>
      </LegalSection>

      <LegalSection title="13. Governing law">
        <p>
          These terms are governed by the laws of the Kingdom of Morocco. Disputes are subject to the competent courts of
          Morocco, without prejudice to any mandatory protection you have under the law of the country where you live.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>
          Questions about these terms: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
