import axios, { isAxiosError } from 'axios'

const getBaseURL = () => {
  let baseURL = import.meta.env.VITE_API_BASE_URL
  if (!baseURL) {
    baseURL = `${location.protocol}//api.${location.hostname}`
  }
  return baseURL
}

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true
})
api.interceptors.response.use(
  r => r.data
)

declare module 'axios' {
  export interface AxiosInstance {
    get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
    delete(url: string, config?: AxiosRequestConfig): Promise<void>;
    post<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T>;
    patch<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T>;
  }
}


export {
  api,
  isAxiosError
}
