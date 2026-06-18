import Sidebar from './Sidebar'
import { useLang } from '../context/LangContext'

export default function Layout({ children }) {
  const { isAr } = useLang()

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar />
      <main
        className="flex-1 p-8"
        style={{ marginLeft: isAr ? 0 : '14rem', marginRight: isAr ? '14rem' : 0 }}
      >
        {children}
      </main>
    </div>
  )
}