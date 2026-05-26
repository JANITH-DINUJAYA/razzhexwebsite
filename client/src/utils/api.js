/**
 * Razz Hex Frontend API client helper.
 * Proxies to backend.
 */

// Helper to make request and handle response
async function request(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    return data;
  } catch (error) {
    console.error(`API Request failed on ${url}:`, error);
    throw error;
  }
}

export const api = {
  // Public Products
  getProducts: async () => {
    return request('/api/products');
  },

  // License Verification
  validateLicense: async (licenseKey, deviceFingerprint, deviceName) => {
    return request('/api/licenses/validate', {
      method: 'POST',
      body: JSON.stringify({ licenseKey, deviceFingerprint, deviceName }),
    });
  },

  // Signed download generation
  generateDownloadUrl: async (sessionToken) => {
    return request('/api/downloads/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });
  },

  // Get free download url
  getFreeDownloadUrl: async (productId) => {
    return request(`/api/downloads/free/${productId}`);
  },

  // Admin stats
  getAdminStats: async (token) => {
    return request('/api/admin/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Admin Products CRUD
  adminGetProducts: async (token) => {
    return request('/api/products', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  adminCreateProduct: async (token, productData) => {
    return request('/api/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });
  },

  adminUpdateProduct: async (token, id, productData) => {
    return request(`/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });
  },

  adminDeleteProduct: async (token, id) => {
    return request(`/api/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Admin Licenses CRUD
  adminGetLicenses: async (token) => {
    return request('/api/licenses', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  adminGenerateLicenses: async (token, data) => {
    return request('/api/licenses/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  adminRevokeLicense: async (token, id) => {
    return request(`/api/licenses/${id}/revoke`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  adminDeleteLicense: async (token, id) => {
    return request(`/api/licenses/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // File management
  adminGetFiles: async (token) => {
    return request('/api/admin/files', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  adminDeleteFile: async (token, filePath) => {
    return request(`/api/admin/files/${encodeURIComponent(filePath)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};
export default api;
