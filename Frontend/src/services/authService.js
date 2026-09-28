import axios from 'axios';

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('td_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser    = (data) => API.post('/auth/login',    data);
export const getMe        = ()     => API.get('/auth/me');
export const updateProfile = (data) => API.put('/auth/profile', data);
export const requestPasswordResetOtp = (email) => API.post('/auth/forgot-password', { email });
export const resetPasswordWithOtp = (data) => API.post('/auth/reset-password', data);
