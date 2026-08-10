import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader, UserPlus, GraduationCap, User, Lock, Mail } from 'lucide-react';
import { register } from '../services/api';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    try {
      await register({ name, email, password });
      navigate('/login');
    } catch (e) {
      setError(e.response?.data?.detail || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <GraduationCap className="mx-auto mb-3 text-blue-700" size={48} />
          <h1 className="text-2xl font-bold text-gray-800">Create Student Account</h1>
          <p className="text-sm text-gray-500 mt-1">Register to apply for admission</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Aisha Mohammed"
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Min 6 characters"
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="animate-spin" size={18} /> : <UserPlus size={18} />}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </div>

        <div className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-700 font-medium hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
}