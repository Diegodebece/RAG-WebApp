import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { DocumentsProvider } from './documents/DocumentsProvider.tsx'
import { HealthProvider } from './health/HealthProvider.tsx'
import { LanguageProvider } from './i18n/LanguageProvider.tsx'
import { ThemeProvider } from './theme/ThemeProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <HealthProvider>
          <AuthProvider>
            <DocumentsProvider>
              <App />
            </DocumentsProvider>
          </AuthProvider>
        </HealthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
)
