import axios from 'axios';

const axiosClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken'); 
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    if (response.status === 204) return null;
    return response.data?.data || response.data;
  },
  (error) => {
    const errorData = error.response?.data;
    
    if (errorData) {
      switch (errorData.code) {
        case 'INVALID_INPUT':
          alert(`입력 오류: ${errorData.message}`); 
          break;
        case 'RESOURCE_NOT_FOUND':
          alert('요청하신 데이터를 찾을 수 없습니다.');
          break;
        case 'INTERNAL_SERVER_ERROR':
          alert('서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
          break;
        default:
          console.error('API Error:', errorData.message);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;