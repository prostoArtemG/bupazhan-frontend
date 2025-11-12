import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';
import styles from './App.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, annotationPlugin);

interface PairData {
  price: number;
  dist_to_ema: number;
  fvg_count: number;
  win_rate: number;
  imb: { bullish: number; bearish: number };
}

function App() {
  const [pairsData, setPairsData] = useState<Record<string, PairData>>({});
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ohlcv, setOhlcv] = useState<any[]>([]);
  const [ema, setEma] = useState<number>(0);
  const [fvgZones, setFvgZones] = useState<any[]>([]);

  useEffect(() => {
    const fetchPairs = async () => {
      try {
        const res = await axios.get('https://bupazhan-backend.onrender.com/pairs');
        console.log('Данные из /pairs:', res.data);
        setPairsData(res.data);
      } catch (error) {
        console.error('Ошибка загрузки пар:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPairs();
  }, []);

  const openChart = async (pair: string) => {
    setSelectedPair(pair);
    try {
      const scanRes = await axios.get(`https://bupazhan-backend.onrender.com/scan?pair=${pair}`);
      console.log('Данные чарта:', scanRes.data);
      setOhlcv(scanRes.data.ohlcv || []);
      setEma(scanRes.data.ema || 0);
      setFvgZones(scanRes.data.fvg_zones || []);
    } catch (error) {
      console.error('Ошибка чарта:', error);
    }
  };

  const closeChart = () => {
    setSelectedPair(null);
  };

  const priceChartData = {
    labels: ohlcv.map((_, i) => i.toString()),
    datasets: [
      {
        label: 'Close',
        data: ohlcv.map(d => d.close),
        borderColor: 'green',
        fill: false,
      },
      {
        label: 'EMA20',
        data: Array(ohlcv.length).fill(ema),
        borderColor: 'blue',
        borderDash: [5, 5],
        fill: false,
      },
    ],
  };

  const annotations = fvgZones.map((z, i) => ({
    type: 'box' as const,
    yMin: Number(z[1]),
    yMax: Number(z[0]),
    backgroundColor: 'rgba(255, 99, 132, 0.25)',
    borderColor: 'red',
    borderWidth: 2,
    label: {
      content: 'FVG',
      enabled: true,
      position: 'center' as const,
    },
  }));

  const priceChartOptions = {
    responsive: true,
    scales: { y: { beginAtZero: false } },
    plugins: {
      annotation: {
        annotations,
      },
    },
  };

  if (loading) return <div className={styles.loading}>Загрузка...</div>;

  return (
    <div className={styles.dashboard} style={{ backgroundColor: '#111827' }}>
      <header className={styles.header}>
        <h1>Bù pà màn, jiù pà zhàn</h1>
        <p>Не бойся медленно, бойся стоять на месте</p>
      </header>

      <section className={styles.section}>
        <h2>Таблица валютных пар</h2>
        {Object.keys(pairsData).length === 0 ? (
          <p>Данные загружаются или бэк не запущен (проверь Render URL)</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Пара</th>
                <th>Цена</th>
                <th>% до EMA</th>
                <th>FVG зон</th>
                <th>IMB</th>
                <th>Win Rate %</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(pairsData).map(([pair, data]) => (
                <tr key={pair}>
                  <td onClick={() => openChart(pair)} style={{ cursor: 'pointer', color: '#10b981' }}>
                    {pair}
                  </td>
                  <td>{Number(data.price).toFixed(2)}</td>
                  <td>{Number(data.dist_to_ema).toFixed(2)}%</td>
                  <td>{data.fvg_count}</td>
                  <td>
                    <span style={{ color: 'green' }}>{data.imb?.bullish || 0}</span> / <span style={{ color: 'red' }}>{data.imb?.bearish || 0}</span>
                  </td>
                  <td>{Number(data.win_rate).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selectedPair && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Чарт {selectedPair}</h2>
            <Line data={priceChartData} options={priceChartOptions} />
            <button className={styles.button} onClick={closeChart}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
