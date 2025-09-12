import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const AnalyticsDashboard = () => {
  const { data: metrics } = useQuery(['metrics'], () => api.get('/api/metrics').then(res => res.data));

  return (
    <div>
      <h1>Analytics Dashboard</h1>
      {metrics && (
        <LineChart width={600} height={300} data={metrics.performance}>
          <XAxis dataKey="time" />
          <YAxis />
          <CartesianGrid stroke="#eee" />
          <Line type="monotone" dataKey="successRate" stroke="#8884d8" />
          <Tooltip />
          <Legend />
        </LineChart>
      )}
    </div>
  );
};

export default AnalyticsDashboard;




