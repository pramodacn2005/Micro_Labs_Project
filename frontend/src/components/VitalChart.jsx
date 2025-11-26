import React from "react";
import LineChart from "./Charts/LineChart";
import AreaChart from "./Charts/AreaChart";
import BarChart from "./Charts/BarChart";
import SpikeChart from "./Charts/SpikeChart";
import TimelineChart from "./Charts/TimelineChart";

export default function VitalChart({ 
  type,
  data = [],
  currentValue = null,
  title = '',
  subtitle = '',
  unit = '',
  color = '#0b74ff',
  width = 400,
  height = 200,
  className = '',
  timestamps = [],
  status = 'normal',
  ...props
}) {
  // Get chart configuration based on type
  const getChartConfig = () => {
    const configs = {
      heartRate: {
        component: LineChart,
        color: '#ef4444',
        title: 'Heart Rate',
        subtitle: 'Beats per minute over time',
        unit: 'BPM'
      },
      spo2: {
        component: AreaChart,
        color: '#2563eb',
        title: 'Blood Oxygen',
        subtitle: 'SpO₂ saturation over time',
        unit: '%'
      },
      bodyTemp: {
        component: BarChart,
        color: '#ea580c',
        title: 'Body Temperature',
        subtitle: 'Temperature readings in Celsius',
        unit: '°C'
      },
      ambientTemp: {
        component: LineChart,
        color: '#0891b2',
        title: 'Ambient Temperature',
        subtitle: 'Environmental temperature over time',
        unit: '°C'
      },
      accMagnitude: {
        component: SpikeChart,
        color: '#7c3aed',
        title: 'Acceleration Magnitude',
        subtitle: 'Movement detection and spikes',
        unit: 'g',
        threshold: 1.5
      },
      fallDetected: {
        component: TimelineChart,
        color: '#f59e0b',
        title: 'Fall Detection',
        subtitle: 'Fall events over time',
        unit: '',
        trueLabel: 'Fall Detected',
        falseLabel: 'Normal'
      },
      alerted: {
        component: TimelineChart,
        color: '#ef4444',
        title: 'Alert Status',
        subtitle: 'Alert events over time',
        unit: '',
        trueLabel: 'Alert Active',
        falseLabel: 'Normal'
      },
      bloodSugar: {
        component: LineChart,
        color: '#dc2626',
        title: 'Blood Sugar',
        subtitle: 'Glucose levels over time',
        unit: 'mg/dL'
      },
      bloodPressure: {
        component: LineChart,
        color: '#7c2d12',
        title: 'Blood Pressure',
        subtitle: 'Systolic/Diastolic pressure over time',
        unit: 'mmHg'
      }
    };
    
    return configs[type] || configs.heartRate;
  };

  const config = getChartConfig();
  const ChartComponent = config.component;

  return (
    <ChartComponent
      data={data}
      currentValue={currentValue}
      title={title || config.title}
      subtitle={subtitle || config.subtitle}
      unit={unit || config.unit}
      color={color || config.color}
      width={width}
      height={height}
      className={className}
      vitalType={type}
      timestamps={timestamps}
      status={status}
      {...props}
      {...config}
    />
  );
}
