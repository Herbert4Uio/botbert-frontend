import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

export const crmService = {
  // Dashboard
  getDashboardStats: async () => {
    const res = await axios.get(`${API_URL}/crm/dashboard`, getAuthHeaders());
    return res.data;
  },

  // Tags
  getTags: async () => {
    const res = await axios.get(`${API_URL}/crm/tags`, getAuthHeaders());
    return res.data;
  },
  createTag: async (data: any) => {
    const res = await axios.post(`${API_URL}/crm/tags`, data, getAuthHeaders());
    return res.data;
  },
  deleteTag: async (id: string) => {
    const res = await axios.delete(`${API_URL}/crm/tags/${id}`, getAuthHeaders());
    return res.data;
  },

  // Customers & Customer Tags
  getCustomers: async () => {
    const res = await axios.get(`${API_URL}/crm/customers`, getAuthHeaders());
    return res.data;
  },
  updateCustomer: async (customerId: string, data: any) => {
    const res = await axios.put(`${API_URL}/crm/customers/${customerId}`, data, getAuthHeaders());
    return res.data;
  },
  updateCustomerTags: async (customerId: string, tagIds: string[]) => {
    const res = await axios.patch(`${API_URL}/crm/customers/${customerId}/tags`, { tagIds }, getAuthHeaders());
    return res.data;
  },

  // Pipelines
  getPipelines: async () => {
    const res = await axios.get(`${API_URL}/crm/pipelines`, getAuthHeaders());
    return res.data;
  },
  createPipeline: async (data: any) => {
    const res = await axios.post(`${API_URL}/crm/pipelines`, data, getAuthHeaders());
    return res.data;
  },
  updatePipeline: async (id: string, data: any) => {
    const res = await axios.put(`${API_URL}/crm/pipelines/${id}`, data, getAuthHeaders());
    return res.data;
  },
  deletePipeline: async (id: string) => {
    const res = await axios.delete(`${API_URL}/crm/pipelines/${id}`, getAuthHeaders());
    return res.data;
  },

  // Deals
  getDeals: async (pipelineId: string) => {
    const res = await axios.get(`${API_URL}/crm/pipelines/${pipelineId}/deals`, getAuthHeaders());
    return res.data;
  },
  createDeal: async (data: any) => {
    const res = await axios.post(`${API_URL}/crm/deals`, data, getAuthHeaders());
    return res.data;
  },
  updateDealStage: async (dealId: string, stageId: string) => {
    const res = await axios.patch(`${API_URL}/crm/deals/${dealId}/stage`, { stageId }, getAuthHeaders());
    return res.data;
  },
  updateDeal: async (dealId: string, data: any) => {
    const res = await axios.put(`${API_URL}/crm/deals/${dealId}`, data, getAuthHeaders());
    return res.data;
  },
  deleteDeal: async (dealId: string) => {
    const res = await axios.delete(`${API_URL}/crm/deals/${dealId}`, getAuthHeaders());
    return res.data;
  }
};
