import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface IgsLineChartProps {
  data: {
    name: string;
    current: number;
    future: number;
  }[];
  currentPatientName?: string;
}

export const IgsLineChart = ({ data, currentPatientName }: IgsLineChartProps) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: "'Roboto Mono', monospace",
            size: 10
          }
        }
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            const label = context[0].label;
            return label === currentPatientName ? label : '';
          },
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`;
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 10,
        ticks: {
          font: {
            family: "'Roboto Mono', monospace",
            size: 10
          }
        }
      },
      x: {
        display: false,
        ticks: {
          callback: function(value: any, index: number) {
            return chartData.labels[value] === currentPatientName ? chartData.labels[value] : '';
          }
        }
      }
    }
  };

  const chartData = {
    labels: data.map(item => item.name),
    datasets: [
      {
        label: 'IGS Actual',
        data: data.map(item => item.current),
        borderColor: 'rgba(250, 189, 47, 1)',
        backgroundColor: 'rgba(250, 189, 47, 0.2)',
        pointRadius: (ctx: any) => {
          const label = ctx.chart.data.labels[ctx.dataIndex];
          return label === currentPatientName ? 6 : 2;
        },
        pointBackgroundColor: (ctx: any) => {
          const label = ctx.chart.data.labels[ctx.dataIndex];
          return label === currentPatientName ? 'rgba(250, 189, 47, 1)' : 'rgba(250, 189, 47, 0.2)';
        }
      },
      {
        label: 'IGS Futuro',
        data: data.map(item => item.future),
        borderColor: 'rgba(36, 56, 115, 1)',
        backgroundColor: 'rgba(36, 56, 115, 0.2)',
        pointRadius: (ctx: any) => {
          const label = ctx.chart.data.labels[ctx.dataIndex];
          return label === currentPatientName ? 6 : 2;
        },
        pointBackgroundColor: (ctx: any) => {
          const label = ctx.chart.data.labels[ctx.dataIndex];
          return label === currentPatientName ? 'rgba(36, 56, 115, 1)' : 'rgba(36, 56, 115, 0.2)';
        }
      }
    ]
  };

  return (
    <div style={{ width: '380px', marginTop: '80px', marginLeft: '10px' }}>
      <Line options={options} data={chartData} />
    </div>
  );
}; 