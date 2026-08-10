import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader, LogIn, GraduationCap, User, Lock } from 'lucide-react';
import { login } from '../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true); setError('');
    try {
      const res = await login(email, password);
      localStorage.setItem('xai_token', res.data.token);
      localStorage.setItem('xai_role', res.data.role);
      localStorage.setItem('xai_name', res.data.name);
      navigate(res.data.role === 'admin' ? '/admin' : '/apply', { replace: true });
    } catch (e) {
      setError(e.response?.data?.detail || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <GraduationCap className="mx-auto mb-3 text-blue-700" size={48} />
          <h1 className="text-2xl font-bold text-gray-800">AI Admission System</h1>
          <p className="text-sm text-gray-500 mt-1">University Admissions &amp; JAMB-based Screening</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="student@email.com"
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="animate-spin" size={18} /> : <LogIn size={18} />}
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </div>

        <div className="text-center text-sm text-gray-500 mt-6">
          New student?{' '}
          <Link to="/register" className="text-blue-700 font-medium hover:underline">Create an account</Link>
        </div>
      </div>
    </div>
  );
}