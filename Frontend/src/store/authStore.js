import { create } from 'zustand';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('td_token') || null,
  user:  JSON.parse(localStorage.getItem('td_user') || 'null'),

  login: (token, user) => {
    localStorage.setItem('td_token', token);
    localStorage.setItem('td_user', JSON.stringify(user));
    set({ token, user });
  },

  updateUser: (user) => {
    localStorage.setItem('td_user', JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('td_token');
    localStorage.removeItem('td_user');
    set({ token: null, user: null });
  },
}));

export default useAuthStore;
