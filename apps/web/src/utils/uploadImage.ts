import api from '../api/axiosInstance';

export async function uploadImage(file: File, folder = 'general'): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await api.post(`/upload?folder=${folder}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.url;
}
