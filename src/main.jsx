import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary Yakaladı:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#0f172a', color: '#fff', fontFamily: 'sans-serif', minHeight: '100vh' }}>
          <h1 style={{ color: '#ef4444' }}>⚠️ Sayfa Yüklenirken Bir Hata Oluştu</h1>
          <p style={{ color: '#94a3b8' }}>Aşağıdaki hatadan dolayı ekran sıfırlandı. Lütfen kontrol edin:</p>
          <pre style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', color: '#f87171', overflowX: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '16px' }}
          >
            🔄 Sayfayı Yenile
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
