import client from './client'

export const getOrders    = (status) => client.get('/admin/orders/', { params: status ? { status } : {} })
export const getOrder     = (id)     => client.get(`/admin/orders/${id}`)
export const updateStatus = (id, status) => client.patch(`/admin/orders/${id}/status`, { status })