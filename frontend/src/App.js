import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import SendSMS from './pages/SendSMS';
import History from './pages/History';

export default function App({ mode, toggleMode }) {
  return (
    <MainLayout mode={mode} toggleMode={toggleMode}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/send" element={<SendSMS />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </MainLayout>
  );
}
