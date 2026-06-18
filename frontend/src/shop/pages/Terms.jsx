import Layout from '../components/Layout'

export default function TermsOfService() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-['Cormorant_Garamond'] text-4xl font-light text-[#1a1715] mb-2">Terms of Service</h1>
        <p className="text-xs text-[#aaa] font-['DM_Sans'] mb-10">Last updated: June 2025</p>

        {[
          {
            title: "1. Acceptance of Terms",
            body: "By accessing and using the Hadeel Aljazeeraa website and services, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services."
          },
          {
            title: "2. Use of the Service",
            body: "You may use our service only for lawful purposes and in accordance with these terms. You agree not to use the service in any way that could damage, disable, or impair the site, or interfere with any other party's use of the service."
          },
          {
            title: "3. Account Registration",
            body: "To place an order, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account."
          },
          {
            title: "4. Orders and Payment",
            body: "By placing an order, you agree to purchase the selected items at the listed price. All orders are subject to availability. We reserve the right to cancel or refuse any order. Payment is collected upon delivery (Cash on Delivery)."
          },
          {
            title: "5. Pricing",
            body: "All prices are listed in Kuwaiti Dinar (KWD). Prices are subject to change without notice. The price charged for an order will be the price in effect at the time the order is placed."
          },
          {
            title: "6. Shipping and Delivery",
            body: "We deliver within Kuwait only. Delivery times are estimates and not guaranteed. We are not responsible for delays caused by factors outside our control. Shipping fees, if applicable, will be displayed at checkout."
          },
          {
            title: "7. Returns and Refunds",
            body: "If you receive a damaged or incorrect item, please contact us within 48 hours of delivery. We will arrange for a replacement or refund at our discretion. Items must be unworn, unwashed, and in their original condition to be eligible for return."
          },
          {
            title: "8. Product Information",
            body: "We make every effort to display products accurately. However, we do not guarantee that product descriptions, images, or other content are accurate, complete, or error-free. Colors may appear differently on different screens."
          },
          {
            title: "9. Intellectual Property",
            body: "All content on this website, including text, images, logos, and graphics, is the property of Hadeel Aljazeeraa and is protected by applicable intellectual property laws. You may not reproduce or distribute any content without our prior written permission."
          },
          {
            title: "10. Limitation of Liability",
            body: "To the fullest extent permitted by law, Hadeel Aljazeeraa shall not be liable for any indirect, incidental, or consequential damages arising from your use of our service or from any orders placed through the site."
          },
          {
            title: "11. Governing Law",
            body: "These terms shall be governed by and construed in accordance with the laws of the State of Kuwait."
          },
          {
            title: "12. Changes to Terms",
            body: "We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the service after changes are posted constitutes your acceptance of the modified terms."
          },
          {
            title: "13. Contact",
            body: "If you have any questions about these Terms of Service, please contact us through the information provided on our website."
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