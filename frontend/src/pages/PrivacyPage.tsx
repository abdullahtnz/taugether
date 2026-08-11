import { Helmet } from 'react-helmet-async'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-gray-600">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — taugether</title>
        <meta name="description" content="How taugether collects, uses and protects the personal data of its users." />
        <link rel="canonical" href="https://taugether.org/privacy" />
      </Helmet>

      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-primary-600">Last updated: 11 August 2026</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          taugether ("we", "our", "the platform") is a student community platform for Türkiye–Azerbaijan
          University. This Privacy Policy explains what information we collect, how we use it, and the
          choices you have. By creating an account, you agree to the practices described here.
        </p>

        <Section title="1. Information we collect">
          <ul className="list-disc pl-5">
            <li>
              <span className="font-semibold text-gray-700">Account information:</span> your chosen
              username, e-mail address, a secure password hash (never stored in plain text), your year
              role, club roles and selected profile picture.
            </li>
            <li>
              <span className="font-semibold text-gray-700">Content you post:</span> posts, comments,
              images and files you upload, along with your likes, saves, and reports.
            </li>
            <li>
              <span className="font-semibold text-gray-700">Usage data:</span> basic technical
              information such as your IP address, browser type and pages visited, used for security
              and rate limiting.
            </li>
          </ul>
        </Section>

        <Section title="2. How we use your information">
          <ul className="list-disc pl-5">
            <li>To create and manage your account and to authenticate you securely.</li>
            <li>To let you post, comment, like, save, join clubs and use all community features.</li>
            <li>To show you notifications about activity on your posts and comments.</li>
            <li>To moderate the platform, investigate reports and prevent abuse.</li>
            <li>To protect the security and integrity of the platform.</li>
          </ul>
        </Section>

        <Section title="3. What we do NOT do">
          <ul className="list-disc pl-5">
            <li>We never sell or rent your personal data to anyone.</li>
            <li>We do not show advertising based on your content or profile.</li>
            <li>Your e-mail address is never shown on your public profile.</li>
          </ul>
        </Section>

        <Section title="4. Storage and security">
          <p>
            Your password is stored only as a bcrypt hash, which is computationally expensive to
            crack. Access is protected with short-lived JWT tokens and rotating refresh tokens.
            Database access uses parameterized queries and a pooled, authenticated connection.
            Uploaded files are validated for type and size before being stored on our servers.
          </p>
        </Section>

        <Section title="5. Cookies and local storage">
          <p>
            We use your browser's local storage to keep you signed in (your access and refresh
            tokens). We do not use third-party tracking cookies or advertising cookies.
          </p>
        </Section>

        <Section title="6. Sharing of information">
          <p>
            Your username, year role, club roles, profile picture and posts are visible to other
            users of the platform, as this is a community site. Your e-mail address is kept private
            and is only used by us for account-related purposes. We only share your data with third
            parties when required by law or to protect the safety of the community.
          </p>
        </Section>

        <Section title="7. Your rights">
          <ul className="list-disc pl-5">
            <li>Update your username, profile picture, year role, clubs and password at any time.</li>
            <li>Delete your posts and comments at any time.</li>
            <li>
              Request account deletion by contacting an administrator. When an account is deleted,
              its content and personal data are removed.
            </li>
            <li>Contact an administrator to request a copy of the data we hold about you.</li>
          </ul>
        </Section>

        <Section title="8. Children and eligibility">
          <p>
            taugether is intended for students of Türkiye–Azerbaijan University. By signing up you
            confirm that you are a student, prospective student or alumni of the university and that
            you are legally able to form a binding agreement.
          </p>
        </Section>

        <Section title="9. Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. Significant changes will be announced
            through the platform's news section. Continued use of taugether after changes means you
            accept the updated policy.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            If you have questions about this Privacy Policy, please contact the taugether
            administration through the platform.
          </p>
        </Section>
      </div>
    </>
  )
}
