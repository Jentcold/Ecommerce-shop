import Layout from '../components/Layout'

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-['Cormorant_Garamond'] text-4xl font-light text-[#1a1715] mb-2">Privacy Policy</h1>
        <p className="text-xs text-[#aaa] font-['DM_Sans'] mb-10">Last updated: June 2025</p>

        {[
          {
            title: "1. Information We Collect",
            body: "We collect information you provide directly to us, including your name, email address, phone number, and shipping address when you create an account or place an order. We also collect information about your orders and browsing activity on our site."
          },
          {
            title: "2. How We Use Your Information",
            body: "We use the information we collect to process your orders, send you order confirmations and shipping updates, communicate with you about your account, and improve our services. We do not sell your personal information to third parties."
          },
          {
            title: "3. Information Sharing",
            body: "We do not share your personal information with third parties except as necessary to fulfill your orders (e.g., delivery services) or as required by law. We may use third-party services for payment processing and email delivery, which have their own privacy policies."
          },
          {
            title: "4. Data Security",
            body: "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Your password is stored in encrypted form and is never accessible to us."
          },
          {
            title: "5. Google Sign-In",
            body: "If you choose to sign in with Google, we receive your email address, name, and profile picture from Google. We do not receive your Google password. Your use of Google Sign-In is also governed by Google's Privacy Policy."
          },
          {
            title: "6. Cookies",
            body: "We use cookies and similar technologies to maintain your session and remember your preferences. You can disable cookies in your browser settings, but this may affect your ability to use certain features of our site."
          },
          {
            title: "7. Your Rights",
            body: "You have the right to access, correct, or delete your personal information. You can update your account information at any time by logging in to your account. To request deletion of your account, please contact us."
          },
          {
            title: "8. Children's Privacy",
            body: "Our service is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13."
          },
          {
            title: "9. Changes to This Policy",
            body: "We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated date."
          },
          {
            title: "10. Contact Us",
            body: "If you have any questions about this privacy policy, please contact us through the contact information provided on our website."
          },
        ].map(({ title, body }) => (
          <div key={title} className="mb-8">
            <h2 className="font-['Cormorant_Garamond'] text-xl font-light text-[#1a1715] mb-3">{title}</h2>
            <p className="text-sm text-[#6b6460] leading-relaxed font-['DM_Sans']">{body}</p>
          </div>
        ))}
      </div>
    </Layout>
  )
}