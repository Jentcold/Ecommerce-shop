import client from './client'

export const getProducts    = ()           => client.get('/admin/products/')
export const createProduct  = (data)       => client.post('/admin/products/', data)
export const updateProduct  = (id, data)   => client.put(`/admin/products/${id}`, data)
export const deleteProduct  = (id)         => client.delete(`/admin/products/${id}`)
export const toggleActive   = (id)         => client.patch(`/admin/products/${id}/toggle-active`)
export const toggleFeatured = (id)         => client.patch(`/admin/products/${id}/toggle-featured`)
export const addImages      = (id, urls)   => client.post(`/admin/products/${id}/images`, urls)
export const deleteImage    = (pid, iid)   => client.delete(`/admin/products/${pid}/images/${iid}`)
export const getSections    = ()           => client.get('/admin/products/sections')
export const getCategories  = (section)    => client.get('/admin/products/categories', { params: section ? { section } : {} })

export const uploadImages = async (files) => {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })

  const response = await client.post('/admin/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}