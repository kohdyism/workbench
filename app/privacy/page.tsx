export const metadata = { title: "Privacy · Workbench" };

export default function Privacy() {
  const owner = process.env.NEXT_PUBLIC_OPERATOR_NAME || "the operator of this Workbench instance";
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "the contact address listed by the operator";
  return (
    <main className="page">
      <div className="prose">
        <a className="back" href="/">← Workbench</a>
        <h1>Privacy</h1>
        <p>Workbench is run by {owner}. This page explains what it does with your email. Contact: {contact}.</p>
        <h2>What Workbench accesses</h2>
        <p>When you connect a Google or Microsoft account, Workbench reads messages from your inbox from the last two weeks, and can archive, label, star or flag, draft, send and forward messages. It only sends or forwards when you press Send or Delegate, or when an agent you created and set to act automatically does so for low-importance mail.</p>
        <h2>What is stored</h2>
        <ul>
          <li>Your account email address and encrypted access tokens.</li>
          <li>Copies of inbox messages Workbench has synced (sender, subject, text, date), with the scores and summaries it generates.</li>
          <li>Your settings, agents and a history of actions so you can undo them.</li>
        </ul>
        <h2>AI processing</h2>
        <p>Message text is sent to Anthropic&apos;s Claude API to score, summarise and draft replies. Anthropic processes it under its commercial terms and does not use API data to train models by default.</p>
        <h2>Google user data</h2>
        <p>Workbench&apos;s use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. Gmail data is used only to provide Workbench&apos;s features to you, is not sold, is not used for advertising, and is not read by people except with your consent, for security, or where the law requires it.</p>
        <h2>Deleting your data</h2>
        <p>Disconnect a mailbox at any time from the account menu, which deletes everything synced from it. “Delete my data” removes your account and all stored mail, settings and history immediately. You can also revoke access from your Google or Microsoft account settings.</p>
      </div>
    </main>
  );
}
