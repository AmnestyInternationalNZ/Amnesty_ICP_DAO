import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { InternetIdentityProvider } from './hooks/useInternetIdentity';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { i18n } from './i18n';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
            <InternetIdentityProvider>
                <App />
            </InternetIdentityProvider>
        </I18nextProvider>
    </QueryClientProvider>
);
