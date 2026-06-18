import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#ede5e0] mt-20">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <span className="font-['Cormorant_Garamond'] text-xl font-light tracking-widest text-[#1a1715] block mb-3">
              Hadeel Aljazeeraa
            </span>
            <p className="text-xs text-[#aaa] leading-relaxed font-['DM_Sans']">
              Quality socks, leggings, and garments crafted for everyday comfort.
              Delivered across Kuwait.
            </p>
          </div>

          {/* Shop links */}
          <div>
            <h3 className="text-xs tracking-widest uppercase text-[#1a1715] font-['DM_Sans'] mb-3">Shop</h3>
            <div className="space-y-2">
              {[
                { to: '/',               label: 'All Products' },
                { to: '/cart',           label: 'Cart' },
                { to: '/account',        label: 'My Account' },
              ].map(({ to, label }) => (
                <Link key={to} to={to}
                  className="block text-xs text-[#6b6460] hover:text-[#1a1715] transition-colors font-['DM_Sans']">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal + contact */}
          <div>
            <h3 className="text-xs tracking-widest uppercase text-[#1a1715] font-['DM_Sans'] mb-3">Info</h3>
            <div className="space-y-2">
              <Link to="/privacy-policy"
                className="block text-xs text-[#6b6460] hover:text-[#1a1715] transition-colors font-['DM_Sans']">
                Privacy Policy
              </Link>
              <Link to="/terms-of-service"
                className="block text-xs text-[#6b6460] hover:text-[#1a1715] transition-colors font-['DM_Sans']">
                Terms of Service
              </Link>
              <a
                href="https://www.linkedin.com/in/mostafahanibaghdady/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-[#6b6460] hover:text-[#1a1715] transition-colors font-['DM_Sans']">
                Site by Mostafa Baghdady — LinkedIn
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#ede5e0] pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-xs text-[#aaa] font-['DM_Sans']">
            © {new Date().getFullYear()} Hadeel Aljazeera. All rights reserved.
          </span>
          <span className="text-xs text-[#aaa] font-['DM_Sans']">Kuwait 🇰🇼</span>
        </div>
      </div>
    </footer>
  )
}