import api from './axiosInstance';

export const paymentEventsApi = {
  getActive: () => api.get('/payment-events'),
  getById: (id: string) => api.get(`/payment-events/${id}`),
  create: (data: any) => api.post('/payment-events', data),
};
