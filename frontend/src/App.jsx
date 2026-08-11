import { useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import './index.css'

function App() {
  const [data, setData] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      // Nelle GitHub Pages il file live-status.json si trova nella stessa root
      const response = await fetch('live-status.json?t=' + new Date().getTime())
      if (!response.ok) throw new Error('Errore di rete o file non ancora generato')
      const result = await response.json()
      // Se il formato cambia leggermente, ci assicuriamo di leggere i dati
      setData(result.data || result)
      setLastUpdate(new Date(result.timestamp).toLocaleTimeString() || new Date().toLocaleTimeString())
      setError(null)
    } catch (err) {
      setError('Dati non ancora disponibili o in aggiornamento.')
    }
  }

  useEffect(() => {
    fetchData()
    // Controllo ogni 30 secondi per aggiornare la UI se GitHub Pages ha refreshato la cache
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>Reversal Strategy</h1>
        <p>Monitoraggio in tempo reale dei cross valutari</p>
        
        <a href="https://t.me/rev_strategy_bot" target="_blank" rel="noreferrer" className="telegram-btn">
          <Send size={18} />
          Iscriviti al bot Telegram
        </a>
      </header>

      <section className="strategy-info">
        <h2>Condizioni della Strategia</h2>
        <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
          La strategia cerca opportunità di acquisto in inversione (Long) basandosi sulle seguenti condizioni:
        </p>
        <ul>
          <li><strong>RSI 15 min:</strong> Inferiore o uguale a 30 (Ipervenduto nel breve termine)</li>
          <li><strong>RSI 1 ora:</strong> Inferiore o uguale a 35 (Debolezza nel medio termine)</li>
          <li><strong>Distanza SMA 100:</strong> Il prezzo deve essere distante dalla SMA 100 giornaliera per almeno 1.5 volte la SMA 10 dell'ATR 14 giornaliero.</li>
        </ul>
      </section>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <div className="grid-container">
        {data.length === 0 && !error ? (
          <p style={{ textAlign: 'center', width: '100%', color: '#94a3b8' }}>Caricamento dati in corso...</p>
        ) : (
          data.map((item, idx) => (
            <div key={idx} className={`cross-card ${item.is_buy ? 'buy-signal' : 'no-signal'}`}>
              <div className="card-header">
                <span className="symbol-name">{item.symbol}</span>
                <span className={`status-badge ${item.is_buy ? 'status-buy' : 'status-wait'}`}>
                  {item.is_buy ? 'BUY SIGNAL' : 'WAITING'}
                </span>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <span className="indicator-label">Prezzo Attuale: </span>
                <span className="current-price">{item.price}</span>
              </div>

              <div className="indicator-row">
                <span className="indicator-label">RSI 15'</span>
                <span className={`indicator-value ${item.condition_1_met ? 'value-pass' : 'value-fail'}`}>
                  {item.rsi_15m} {item.condition_1_met && '✓'}
                </span>
              </div>

              <div className="indicator-row">
                <span className="indicator-label">RSI 1H</span>
                <span className={`indicator-value ${item.condition_2_met ? 'value-pass' : 'value-fail'}`}>
                  {item.rsi_1h} {item.condition_2_met && '✓'}
                </span>
              </div>

              <div className="indicator-row">
                <span className="indicator-label">Distanza SMA100</span>
                <span className={`indicator-value ${item.condition_3_met ? 'value-pass' : 'value-fail'}`}>
                  {item.distance > 0 ? '+' : ''}{item.distance} {item.condition_3_met && '✓'}
                </span>
              </div>
              
              <div className="indicator-row" style={{ borderBottom: 'none', paddingTop: '0.5rem' }}>
                <span className="indicator-label" style={{ fontSize: '0.8rem' }}>Soglia richiesta:</span>
                <span className="indicator-value" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {item.threshold}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {lastUpdate && (
        <div className="last-update">
          Ultimo aggiornamento: {lastUpdate} (Controllo ogni 5m)
        </div>
      )}
    </div>
  )
}

export default App
