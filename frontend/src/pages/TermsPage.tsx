import { Helmet } from 'react-helmet-async'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-gray-600">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms of Service — taugether</title>
        <meta name="description" content="The rules and responsibilities every taugether user agrees to when creating an account." />
        <link rel="canonical" href="https://taugether.org/terms" />
      </Helmet>

      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-primary-600">Last updated: 11 August 2026</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          By creating an account on taugether you agree to these Terms of Service. Please read them
          carefully. You are responsible for your own actions and for everything you publish on the
          platform.
        </p>

        <Section title="1. Acceptance of terms">
          <p>
            Creating an account, accessing or using taugether means you accept these terms. If you do
            not agree, you must not create an account or use the platform. These terms form a binding
            agreement between you and the taugether administration.
          </p>
        </Section>

        <Section title="2. Your account">
          <ul className="list-disc pl-5">
            <li>You must provide accurate information when signing up.</li>
            <li>You are responsible for keeping your password secret and for all activity on your account.</li>
            <li>You may only create one account. Creating multiple accounts to evade moderation is prohibited.</li>
            <li>You must not share your account with other people.</li>
          </ul>
        </Section>

        <Section title="3. Acceptable use">
          <p>When using taugether you agree NOT to:</p>
          <ul className="list-disc pl-5">
            <li>Post illegal content or content that violates the law of Türkiye or Azerbaijan.</li>
            <li>Harass, bully, threaten or defame other students, staff or the university.</li>
            <li>Share personal information about others without their consent (doxxing).</li>
            <li>Post hate speech, discrimination, or content targeting a person or group.</li>
            <li>Share sexually explicit or pornographic content.</li>
            <li>Post viruses, malware, phishing links or any content designed to harm users or systems.</li>
            <li>Impersonate other people, staff, or the administration.</li>
            <li>Spam the platform, post the same content repeatedly, or misuse tags.</li>
            <li>Attempt to access other accounts, the servers, or the database without authorization.</li>
          </ul>
        </Section>

        <Section title="4. Content responsibility">
          <p>
            You are solely responsible for the posts, comments, images and files you upload. You
            confirm that you own the rights to the content you share or have permission to share it,
            and that it does not violate any third-party rights. You remain the owner of your content,
            but you grant taugether a license to host, store and display it to other users.
          </p>
        </Section>

        <Section title="5. Study material and academic integrity">
          <p>
            taugether is a study community. Always follow your university's academic integrity rules.
            Sharing stolen exam questions or materials obtained illegally is prohibited and may be
            removed. taugether is not responsible for the accuracy of user-shared study content.
          </p>
        </Section>

        <Section title="6. Moderation and admin actions">
          <ul className="list-disc pl-5">
            <li>Users can report posts. Reports are reviewed only by administrators.</li>
            <li>
              Administrators may remove posts, comments or content that violate these terms, with or
              without notice.
            </li>
            <li>
              Administrators may suspend or permanently ban accounts that repeatedly or seriously
              violate these terms.
            </li>
            <li>
              Decisions regarding violations, including whether content is removed, are made at the
              sole discretion of the taugether administration.
            </li>
          </ul>
        </Section>

        <Section title="7. Copyright">
          <p>
            Do not upload copyrighted material (textbooks, lecture slides, images, music, software)
            unless you own it or have permission. If you believe your copyrighted work has been posted
            on taugether, contact an administrator with the details and it will be reviewed and
            removed if appropriate.
          </p>
        </Section>

        <Section title="8. News and official announcements">
          <p>
            Only administrators may publish in the News section. User posts in other sections are the
            opinion of their authors and do not represent the university or the taugether
            administration.
          </p>
        </Section>

        <Section title="9. Disclaimer of warranties">
          <p>
            taugether is provided "as is" without warranties of any kind. We do not guarantee that the
            platform will always be available or error-free, and we are not liable for the accuracy of
            content shared by users.
          </p>
        </Section>

        <Section title="10. Limitation of liability">
          <p>
            To the maximum extent permitted by law, taugether and its administrators shall not be
            liable for any indirect, incidental or consequential damages arising from your use of the
            platform or from content posted by other users.
          </p>
        </Section>

        <Section title="11. Termination">
          <p>
            You may delete your account and stop using taugether at any time. We may suspend or
            terminate your account for violating these terms. Sections 4, 6, 7, 9 and 10 survive
            termination.
          </p>
        </Section>

        <Section title="12. Changes to these terms">
          <p>
            We may update these Terms of Service at any time. Changes will be announced through the
            news section. Continuing to use taugether after changes means you accept the updated
            terms.
          </p>
        </Section>
      </div>
    </>
  )
}
