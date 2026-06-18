import client from './client'

export const placeOrder      = (data) => client.post('/orders/', data)
export const initiatePayment = (data) => client.post('/orders/initiate-payment', data)
export const getMyOrders     = ()     => client.get('/orders/')
export const getMyOrder      = (id)   => client.get(`/orders/${id}`)
export const cancelOrder     = (id)   => client.patch(`/orders/${id}/cancel`)