import api from './axiosInstance';

export const galleryApi = {
  getAlbums: () => api.get('/gallery/albums'),
  getAlbum: (id: string) => api.get(`/gallery/albums/${id}`),
  createAlbum: (data: any) => api.post('/gallery/albums', data),
  addImage: (albumId: string, data: any) => api.post(`/gallery/albums/${albumId}/images`, data),
  getPending: () => api.get('/gallery/pending'),
  approveAlbum: (id: string) => api.patch(`/gallery/albums/${id}/approve`),
  rejectAlbum: (id: string) => api.patch(`/gallery/albums/${id}/reject`),
  approveImage: (id: string) => api.patch(`/gallery/images/${id}/approve`),
  rejectImage: (id: string) => api.patch(`/gallery/images/${id}/reject`),
};
