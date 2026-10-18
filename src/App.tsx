import { AskPanel } from './components/AskPanel.tsx'
import { AuthDialog } from './components/AuthDialog.tsx'
import { Footer } from './components/Footer.tsx'
import { ConstellationBackground } from './components/ConstellationBackground.tsx'
import { Header } from './components/Header.tsx'
import { UploadPanel } from './components/UploadPanel.tsx'
import { useDocuments } from './documents/documents.ts'
import { useLanguage } from './i18n/language.ts'

function App() {
  const { t } = useLanguage()
  const { selected } = useDocuments()

  return (
    <>
      <ConstellationBackground />
      <Header />
      <main className="home">
        <UploadPanel />
        {/* Picking a document in "My documents" replaces the introduction with its questions; the key starts
            a fresh panel for each document. */}
        {selected ? (
          <AskPanel key={selected.id} doc={selected} />
        ) : (
          <div className="home__intro">
            <h1>{t.home.title}</h1>
            <p>{t.home.subtitle}</p>
          </div>
        )}
      </main>
      <Footer />
      <AuthDialog />
    </>
  )
}

export default App
